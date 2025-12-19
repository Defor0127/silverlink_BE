import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment } from './entities/comment.entity';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Post } from '@/post/entities/post.entity';
import { CommentLikeDto } from './dto/comment-like.dto';
import { CommentLike } from './entities/commentLike.entity';
import { EntityLookupService } from '@/common/services/entity-lookup.service';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(CommentLike)
    private readonly commentLikeRepository: Repository<CommentLike>,
    private readonly dataSource: DataSource,
    private readonly entityLookupService: EntityLookupService
  ) { }

  async createComment(userId: number, createCommentDto: CreateCommentDto) {
    const commentToCreate = this.commentRepository.create({
      ...createCommentDto,
      userId
    })
    // 답글일 경우
    if (createCommentDto.parentCommentId) {
      const parentComment = await this.commentRepository.findOne({
        where: { id: createCommentDto.parentCommentId }
      })
      if (!parentComment) {
        throw new NotFoundException("답글 대상 댓글이 존재하지 않습니다.")
      }
      // 내 작성글 맞는지
      const isMatch = await this.postRepository.findOne({
        where: { userId, id: createCommentDto.postId }
      })
      if (!isMatch) {
        throw new ForbiddenException("게시글 작성자만 답글을 달 수 있습니다.")
      }
      const saved = await this.commentRepository.save(commentToCreate)
      return {
        message: "답글 생성에 성공했습니다.",
        data: saved
      }
    }
    // 그냥 댓글일 경우
    const saved = await this.commentRepository.save(commentToCreate)
    return {
      message: "댓글 생성에 성공했습니다.",
      data: saved
    }
  }

  async updateComment(commentId: number, updateCommentDto: UpdateCommentDto, userId: number) {
    const commentToUpdate = await this.commentRepository.findOne({
      where: { id: commentId }
    })
    if (!commentToUpdate) {
      throw new NotFoundException("대상 댓글이 존재하지 않습니다.")
    }
    if (commentToUpdate.userId !== userId) {
      throw new ForbiddenException("댓글 작성자만 수정할 수 있습니다.")
    }
    Object.assign(commentToUpdate, updateCommentDto)
    const updatedComment = await this.commentRepository.save(commentToUpdate)
    return {
      message: "대상 댓글 수정에 성공했습니다.",
      data: updatedComment
    }
  }

  async deleteComment(commentId: number, userId: number) {
    const commentToDelete = await this.commentRepository.findOne({
      where: { id: commentId }
    })
    if (!commentToDelete) {
      throw new NotFoundException("대상 댓글이 존재하지 않습니다.")
    }
    if (commentToDelete.userId !== userId) {
      throw new ForbiddenException("댓글 작성자만 삭제할 수 있습니다.")
    }
    const deleteResult = await this.commentRepository.delete({
      id: commentId
    })
    if (!deleteResult || deleteResult.affected === 0) {
      throw new InternalServerErrorException("대상 댓글 삭제에 실패하였습니다.")
    }
    return {
      message: "대상 댓글 삭제에 성공하였습니다."
    }
  }


  async getReplies(commentId: number) {
    const repliesToGet = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['children']
    })
    if (!repliesToGet) {
      throw new NotFoundException("대상 댓글이 존재하지 않습니다.")
    }
    if (!repliesToGet.children || repliesToGet.children.length === 0) {
      return {
        message: "답글이 없습니다.",
        data: []
      }
    }
    return {
      message: "답글을 전부 조회하였습니다.",
      data: repliesToGet.children
    }
  }

  async toggleCommentLike(commentId: number, commentLikeDto: CommentLikeDto) {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const commentRepo = queryRunner.manager.getRepository(Comment)
      const commentLikeRepo = queryRunner.manager.getRepository(CommentLike)
      const targetComment = await commentRepo.findOne({
        where: { id: commentId }
      })
      if (!targetComment) {
        await queryRunner.rollbackTransaction();
        throw new NotFoundException("대상 댓글이 없습니다.")
      }
      const likeExist = await commentLikeRepo.findOne({
        where: { commentId: commentId, userId: commentLikeDto.userId }
      })
      if (likeExist) {
        await queryRunner.manager.decrement(
          CommentLike,
          { commentId },
          "likeCount",
          1
        )
        await queryRunner.manager.delete(
          CommentLike,
          { commentId, userId: commentLikeDto.userId }
        )
        await queryRunner.commitTransaction()
        return {
          message: "댓글 좋아요 해제에 성공했습니다."
        }
      }
      await queryRunner.manager.increment(
        CommentLike,
        { commentId },
        "likeCount",
        1
      )
      const newLike = queryRunner.manager.create(CommentLike, {
        commentId, userId: commentLikeDto.userId
      })
      await commentLikeRepo.save(newLike)
      await queryRunner.commitTransaction();
      return {
        message: "댓글 좋아요에 성공했습니다."
      }
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    } finally {
      await queryRunner.release()
    }
  }
}
