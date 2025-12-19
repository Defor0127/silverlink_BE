import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ description: '게시글 ID', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  postId: number;

  @ApiProperty({ description: '댓글 내용', example: '좋은 글입니다!' })
  @IsNotEmpty()
  @IsString()
  content: string

  @ApiProperty({ description: '부모 댓글 ID (답글인 경우)', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  parentCommentId?: number | null;
}