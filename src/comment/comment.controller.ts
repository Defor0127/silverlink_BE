import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentLikeDto } from './dto/comment-like.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { User } from '@/common/decorators/user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('댓글')
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '댓글 작성', description: '게시글에 댓글을 작성합니다.' })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({ status: 201, description: '댓글 작성 성공' })
  @ApiResponse({ status: 404, description: '게시글을 찾을 수 없음' })
  async createComment(
    @Body() createCommentDto: CreateCommentDto,
    @User('userId') userId: number
  ) {
    return this.commentService.createComment(userId, createCommentDto)
  }

  @Patch("/:commentId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '댓글 수정', description: '댓글을 수정합니다. (작성자만 가능)' })
  @ApiParam({ name: 'commentId', description: '댓글 ID' })
  @ApiBody({ type: UpdateCommentDto })
  @ApiResponse({ status: 200, description: '댓글 수정 성공' })
  @ApiResponse({ status: 403, description: '수정 권한 없음' })
  @ApiResponse({ status: 404, description: '댓글을 찾을 수 없음' })
  async updateComment(
    @Body() updateCommentDto: UpdateCommentDto,
    @Param('commentId') commentId: number,
    @User('userId') userId: number
  ) {
    return this.commentService.updateComment(commentId, updateCommentDto, userId)
  }

  @Delete("/:commentId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '댓글 삭제', description: '댓글을 삭제합니다. (작성자만 가능)' })
  @ApiParam({ name: 'commentId', description: '댓글 ID' })
  @ApiResponse({ status: 200, description: '댓글 삭제 성공' })
  @ApiResponse({ status: 403, description: '삭제 권한 없음' })
  @ApiResponse({ status: 404, description: '댓글을 찾을 수 없음' })
  async deleteComment(
    @Param('commentId') commentId: number,
    @User('userId') userId: number
  ) {
    return this.commentService.deleteComment(commentId, userId)
  }

  @Get('/:commentId/replies')
  @ApiOperation({ summary: '답글 목록 조회', description: '특정 댓글의 답글 목록을 조회합니다.' })
  @ApiParam({ name: 'commentId', description: '댓글 ID' })
  @ApiResponse({ status: 200, description: '답글 목록 조회 성공' })
  @ApiResponse({ status: 404, description: '댓글을 찾을 수 없음' })
  async getReplies(
    @Param('commentId') commentId: number
  ) {
    return this.commentService.getReplies(commentId)
  }

  @Post('/:commentId/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '댓글 좋아요', description: '댓글에 좋아요를 추가하거나 제거합니다.' })
  @ApiParam({ name: 'commentId', description: '댓글 ID' })
  @ApiBody({ type: CommentLikeDto })
  @ApiResponse({ status: 200, description: '좋아요 처리 성공' })
  @ApiResponse({ status: 404, description: '댓글을 찾을 수 없음' })
  async addLikeToComment(
    @Body() commentLikeDto: CommentLikeDto,
    @Param('commentId') commentId: number
  ) {
    return this.commentService.toggleCommentLike(commentId, commentLikeDto)
  }
}

