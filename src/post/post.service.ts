import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { Users } from '@/user/entities/user.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostLike } from './entities/post-like.entity';
import { PostSave } from './entities/post-saved.entity';
import { PostSaveDto } from './dto/post-save.dto';
import { DataSource } from 'typeorm';
import { PostLikeDto } from './dto/post-like.dto';

@Injectable()
export class PostService {

  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(PostSave)
    private readonly postSaveRepository: Repository<PostSave>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    private readonly dataSource: DataSource
  ) { }

  async getPost(postId: number) {
    try {
      const postToGet = await this.postRepository.findOne({
        where: { id: postId },
        relations: ['comments']
      })
      if (!postToGet || postToGet.status === 0) {
        throw new NotFoundException("대상 게시물이 없습니다.")
      }
      return {
        message: "대상 게시물을 조회했습니다.",
        data: postToGet
      }
    } catch (error) {
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    }
  }

  async getPosts() {
    try {
      const postsToGet = await this.postRepository.find({})
      if (postsToGet.length === 0) {
        return {
          message: "작성된 게시글이 없습니다.",
          data: []
        }
      }
      return {
        message: "작성된 게시글을 전부 조회했습니다.",
        data: postsToGet
      }
    } catch (error) {
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    }
  }

  async getPostsByRegion(region: string) {
    try {
      if (!region) {
        const posts = await this.postRepository.find({
          where: { status: 1 }
        })
        return {
          message: "모든 게시글을 조회하였습니다.",
          data: posts
        }
      }
      const postsToGet = await this.postRepository.createQueryBuilder('post')
        .leftJoin('post.comments', 'comments')
        .select([
          'post.id',
          'post.title',
          'post.content',
          'post.likeCount',
          'post.commentCount',
          'comments.id',
          'comments.content',
          'comments.parent'
        ])
        .where('post.status = 1')
        .andWhere('post.region = :region', { region })
        .getMany()
      if (postsToGet.length === 0) {
        return {
          message: "작성된 게시글이 없습니다.",
          data: []
        }
      }
      return {
        message: "작성된 게시글을 전부 조회했습니다.",
        data: {
          region: region,
          post: postsToGet
        }
      }
    } catch (error) {
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    }
  }

  async createPost(createPostDto: CreatePostDto) {
    try {
      const user = await this.usersRepository.findOne({
        where: { id: createPostDto.userId }
      })
      const postToCreate = this.postRepository.create({
        ...createPostDto,
        region: user.region
      })
      const saved = await this.postRepository.save(postToCreate)
      return {
        message: "게시글이 생성되었습니다.",
        data: saved
      }
    } catch (error) {
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    }
  }

  async getPostsByUser(userId: number) {
    try {
      const userPosts = await this.postRepository.createQueryBuilder('post')
        .where('post.userId = :userId', { userId })
        .getMany();
      if (userPosts.length === 0) {
        return {
          message: "대상 유저가 작성한 게시물이 없습니다.",
          data: []
        }
      }
      return {
        message: "대상 유저가 작성한 게시물을 전부 조회하였습니다.",
        data: userPosts
      }
    } catch (error) {
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    }
  }

  async getSavedPostsByUser(userId: number) {
    try {
      const savedPosts = await this.postSaveRepository.createQueryBuilder('postSave')
        .leftJoin('postSave.post', 'post')
        .where('postSave.userId = :userId', { userId })
        .getMany();
      if (savedPosts.length === 0) {
        return {
          message: "대상 유저가 저장한 게시물이 없습니다.",
          data: []
        }
      }
      return {
        message: "대상 유저가 저장한 게시물을 전부 조회하였습니다.",
        data: savedPosts
      }
    } catch (error) {
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    }
  }

  async getPostsByCategory(categoryId: number) {
    try {
      const postsToGet = await this.postRepository.find({
        where: { categoryId, isPublic: true, status: 1 }
      })
      if (postsToGet.length === 0) {
        return {
          message: "대상 카테고리의 게시물이 없습니다.",
          data: []
        }
      }
      return {
        message: "대상 카테고리의 게시물을 조회하였습니다.",
        data: postsToGet
      }
    } catch (error) {
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    }
  }

  async updatePost(postId: number, updatePostDto: UpdatePostDto, userId: number) {
    try {
      const postToUpdate = await this.postRepository.findOne({
        where: { id: postId, userId }
      })
      if (!postToUpdate) {
        throw new NotFoundException("대상 게시물이 존재하지 않습니다.")
      }
      Object.assign(postToUpdate, updatePostDto)
      const updatedPost = await this.postRepository.save(postToUpdate)
      return {
        message: "대상 게시물 수정에 성공했습니다.",
        data: updatedPost
      }
    } catch (error) {
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    }
  }

  async deletePost(postId: number, userId: number) {
    try {
      const postToDelete = await this.postRepository.findOne({
        where: { id: postId, userId }
      })
      if (!postToDelete || postToDelete.status !== 1) {
        throw new NotFoundException("대상 게시물이 없습니다.")
      }
      const updateResult = await this.postRepository.update(
        { id: postId }, { status: 0 }
      )
      if (!updateResult || updateResult.affected === 0) {
        throw new InternalServerErrorException("대상 게시물 삭제에 실패했습니다.")
      }
      return {
        message: "대상 게시물 삭제에 성공하였습니다."
      }
    } catch (error) {
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    }
  }

  async getPostComments(postId: number) {
    try {
      const postComments = await this.postRepository.findOne({
        where: { id: postId, status: 1 },
        relations: ['comments']
      })
      if (!postComments) {
        throw new NotFoundException("대상 게시물이 없습니다.")
      }
      if (postComments.comments.length === 0) {
        return {
          success: true,
          message: "대상 게시물에 작성된 댓글이 없습니다.",
          data: []
        }
      }
      return {
        success: true,
        message: "대상 게시물의 댓글 목록을 조회하였습니다.",
        data: postComments.comments
      }
    } catch (error) {
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    }
  }

  async togglePostLike(postId: number, userId: number) {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const postRepo = queryRunner.manager.getRepository(Post)
      const postLikeRepo = queryRunner.manager.getRepository(PostLike)
      const targetPost = await postRepo.findOne({
        where: { id: postId, status: 1 }
      })
      if (!targetPost) {
        await queryRunner.rollbackTransaction();
        return {
          success: false,
          message: "대상 게시물이 없습니다."
        }
      }
      const likeExist = await postLikeRepo.findOne({
        where: { postId, userId }
      })
      if (likeExist) {
        await queryRunner.manager.decrement(
          Post,
          { id: postId },
          "likeCount",
          1
        )
        await queryRunner.manager.delete(
          PostLike,
          { postId, userId }
        )
        await queryRunner.commitTransaction()
        return {
          message: "좋아요 해제에 성공했습니다."
        }
      }
      await queryRunner.manager.increment(
        Post,
        { id: postId },
        "likeCount",
        1
      )
      const newLike = queryRunner.manager.create(PostLike, {
        postId, userId
      })
      await postLikeRepo.save(newLike)
      await queryRunner.commitTransaction();
      return {
        message: "게시물 좋아요에 성공했습니다."
      }
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    } finally {
      await queryRunner.release()
    }
  }

  async sharePost(postId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const shardPost = await this.postRepository.findOne({
        where: { id: postId, status: 1 }
      })
      if (!shardPost) {
        return {
          success: false,
          message: "대상 게시물이 존재하지 않습니다."
        }
      }
    } catch (error) {
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    }
  }

  async togglePostSave(postId: number, userId: number) {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const postRepo = queryRunner.manager.getRepository(Post)
      const postSaveRepo = queryRunner.manager.getRepository(PostSave)
      const targetPost = await postRepo.findOne({
        where: { id: postId, status: 1 }
      })
      if (!targetPost) {
        await queryRunner.rollbackTransaction();
        throw new NotFoundException("대상 게시물이 없습니다.")
      }
      const saveExist = await postSaveRepo.findOne({
        where: { postId, userId }
      })
      if (saveExist) {
        await queryRunner.manager.delete(
          PostSave,
          { postId, userId }
        )
        await queryRunner.commitTransaction()
        return {
          message: "게시물 저장 해제에 성공했습니다."
        }
      }
      const newSave = await queryRunner.manager.create(PostSave, {
        postId, userId
      })
      await postSaveRepo.save(newSave)
      await queryRunner.commitTransaction();
      return {
        message: "게시물 저장에 성공했습니다."
      }
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    } finally {
      await queryRunner.release()
    }
  }

  async getPopularPostsByRegion(region: string) {
    try {
      if (region) {
        const popularPosts = await this.postRepository.createQueryBuilder('post')
          .leftJoin('post.comments', 'comments')
          .select([
            'post.id',
            'post.title',
            'post.content',
            'post.likeCount',
            'post.commentCount',
            'comments.id',
            'comments.content',
            'comments.parent'
          ])
          .where('post.status = 1')
          .andWhere('post.region = :region', { region })
          .orderBy('post.likeCount', 'DESC')
          .getMany()
        if (popularPosts.length === 0) {
          return {
            success: true,
            message: '작성된 게시글이 없습니다.',
            data: [],
          };
        }

        return {
          success: true,
          message: '작성된 게시글을 전부 조회했습니다.',
          data: {
            region: region,
            popularPosts
          },
        }
      }
      const popularPosts = await this.postRepository.createQueryBuilder('post')
        .leftJoin('post.comments', 'comments')
        .select([
          'post.id',
          'post.title',
          'post.content',
          'post.likeCount',
          'post.commentCount',
          'comments.id',
          'comments.content',
          'comments.parent'
        ])
        .orderBy('post.likeCount', 'DESC')
        .getMany()
      if (popularPosts.length === 0) {
        return {
          success: true,
          message: '작성된 게시글이 없습니다.',
          data: [],
        };
      }
      return {
        success: true,
        message: '작성된 게시글을 전부 조회했습니다.',
        data: {
          popularPosts
        },
      }
    } catch (error) {
      throw new InternalServerErrorException('서버 에러가 발생했습니다.');
    }
  }
}