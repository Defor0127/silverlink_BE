import { IsNotEmpty, IsNumber, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CommentLikeDto {
    @ApiProperty({ description: '댓글 ID', required: false })
    @IsOptional()
    @IsNumber()
    commentId: number;
}

