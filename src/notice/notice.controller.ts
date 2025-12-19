import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { NoticeService } from './notice.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/user/enum/role.enum';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('공지사항')
@Controller('notice')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '공지사항 작성', description: '새로운 공지사항을 작성합니다. (ADMIN만 접근 가능)' })
  @ApiBody({ type: CreateNoticeDto })
  @ApiResponse({ status: 201, description: '공지사항 작성 성공' })
  @ApiResponse({ status: 401, description: '권한 없음' })
  async createNotice(
    @Body() createNoticeDto: CreateNoticeDto
  ) {
    return this.noticeService.createNotice(createNoticeDto)
  }

  @Get()
  @ApiOperation({ summary: '공지사항 목록 조회', description: '전체 공지사항 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '공지사항 목록 조회 성공' })
  async getNotices() {
    return this.noticeService.getNotices()
  }

  @Get('/search')
  @ApiOperation({ summary: '공지사항 검색', description: '키워드로 공지사항을 검색합니다.' })
  @ApiQuery({ name: 'keyword', description: '검색 키워드' })
  @ApiResponse({ status: 200, description: '검색 결과 조회 성공' })
  async searchNotices(
    @Query('keyword') keyword: string
  ) {
    return this.noticeService.searchNotices(keyword)
  }

  @Get('/:noticeId')
  @ApiOperation({ summary: '공지사항 상세 조회', description: '특정 공지사항의 상세 정보를 조회합니다.' })
  @ApiParam({ name: 'noticeId', description: '공지사항 ID' })
  @ApiResponse({ status: 200, description: '공지사항 조회 성공' })
  @ApiResponse({ status: 404, description: '공지사항 조회 실패' })
  async getNotice(
    @Param('noticeId') noticeId: number
  ) {
    return this.noticeService.getNotice(noticeId)
  }

  @Patch('/:noticeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '공지사항 수정', description: '공지사항을 수정합니다. (ADMIN만 접근 가능)' })
  @ApiParam({ name: 'noticeId', description: '공지사항 ID' })
  @ApiBody({ type: UpdateNoticeDto })
  @ApiResponse({ status: 200, description: '공지사항 수정 성공' })
  @ApiResponse({ status: 401, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
  async updateNotice(
    @Param('noticeId') noticeId: number,
    @Body() updateNoticeDto: UpdateNoticeDto
  ) {
    return this.noticeService.updateNotice(noticeId, updateNoticeDto)
  }

  @Delete('/:noticeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '공지사항 삭제', description: '공지사항을 삭제합니다. (ADMIN만 접근 가능)' })
  @ApiParam({ name: 'noticeId', description: '공지사항 ID' })
  @ApiResponse({ status: 200, description: '공지사항 삭제 성공' })
  @ApiResponse({ status: 401, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '공지사항을 찾을 수 없음' })
  async deleteNotice(
    @Param('noticeId') noticeId: number
  ) {
    return this.noticeService.deleteNotice(noticeId)
  }
}
