import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ClubService } from './club.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { User } from '@/common/decorators/user.decorator';
import { Role } from '@/user/enum/role.enum';
import { CreateClubDto } from './dto/create-club.dto';
import { UpdateClubDto } from './dto/update-club.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('모임')
@Controller('club')
export class ClubController {
  constructor(private readonly clubService: ClubService) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '모임 목록 조회', description: '지역별 모임 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '모임 목록 조회 성공' })
  async getClubs(
    @User('region') region: string,
    @User('role') role: string
  ) {
    return this.clubService.getClubs(region, role);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '모임 생성', description: '새로운 모임을 생성합니다.' })
  @ApiBody({ type: CreateClubDto })
  @ApiResponse({ status: 201, description: '모임 생성 성공' })
  @ApiResponse({ status: 409, description: '이미 존재하는 모임명' })
  async createClub(
    @Body() createClubDto: CreateClubDto,
    @User('userId') userId: number
  ) {
    return this.clubService.createClub(userId, createClubDto)
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '내가 가입한 모임 조회', description: '현재 사용자가 가입한 모임 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '모임 목록 조회 성공' })
  async getClubsByMe(
    @User('userId') userId: number
  ) {
    return this.clubService.getClubsByMe(userId)
  }

  @Get('/me/operate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '내가 운영하는 모임 조회', description: '현재 사용자가 운영하는 모임 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '모임 목록 조회 성공' })
  async getOperatingClubsByMe(
    @User('userId') userId: number
  ) {
    return this.clubService.getOperatingClubsByMe(userId)
  }

  @Get('/type')
  @ApiOperation({ summary: '모임 유형별 조회', description: '모임 유형(FREE/PAID)별로 모임을 조회합니다.' })
  @ApiQuery({ name: 'type', enum: ['FREE', 'PAID'], description: '모임 유형' })
  @ApiResponse({ status: 200, description: '모임 목록 조회 성공' })
  async getClubsByType(
    @Query('type') type: "FREE" | "PAID"
  ) {
    return this.clubService.getClubsByType(type);
  }

  @Get('/category/:categoryId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '카테고리별 모임 조회', description: '유저와 같은 지역에서 활동하는 특정 카테고리의 모임을 조회합니다.' })
  @ApiParam({ name: 'categoryId', description: '카테고리 ID' })
  @ApiResponse({ status: 200, description: '모임 목록 조회 성공' })
  @ApiResponse({ status: 404, description: '카테고리를 찾을 수 없음' })
  async getClubsByCategory(
    @Param('categoryId') categoryId: number,
    @User('region') region: string
  ) {
    return this.clubService.getClubsByCategory(region, categoryId)
  }

  @Get('/status')
  @ApiOperation({ summary: '모임 상태별 조회', description: '모임 상태별로 모임을 조회합니다.' })
  @ApiQuery({ name: 'type', enum: ['AWAITING', 'ACTIVE', 'PAUSE', 'DELETED'], description: '모임 상태' })
  @ApiResponse({ status: 200, description: '모임 목록 조회 성공' })
  async getClubsByStatus(
    @Query('type') type: "AWAITING" | "ACTIVE" | "PAUSE" | "DELETED"
  ) {
    return this.clubService.getClubsByStatus(type)
  }

  @Get('/search')
  @ApiOperation({ summary: '모임 검색', description: '모임명으로 모임을 검색합니다.' })
  @ApiQuery({ name: 'keyword', description: '검색 키워드' })
  @ApiResponse({ status: 200, description: '검색 결과 조회 성공' })
  async searchClubs(
    @Query('keyword') keyword: string
  ) {
    return this.clubService.searchClubs(keyword)
  }

  @Get('/:clubId')
  @ApiOperation({ summary: '모임 상세 조회', description: '특정 모임의 상세 정보를 조회합니다.' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiResponse({ status: 200, description: '모임 조회 성공' })
  @ApiResponse({ status: 404, description: '모임을 찾을 수 없음' })
  async getClub(
    @Param('clubId') clubId: number
  ) {
    return this.clubService.getClub(clubId)
  }

  @Patch('/:clubId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '모임 수정', description: '모임 정보를 수정합니다. (모임장만 가능)' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiBody({ type: UpdateClubDto })
  @ApiResponse({ status: 200, description: '모임 수정 성공' })
  @ApiResponse({ status: 403, description: '수정 권한 없음' })
  @ApiResponse({ status: 404, description: '모임을 찾을 수 없음' })
  async updateClub(
    @Param('clubId') clubId: number,
    @Body() updateClubDto: UpdateClubDto,
    @User('loginEmail') loginEmail: string
  ) {
    return this.clubService.updateClub(loginEmail, clubId, updateClubDto)
  }

  @Delete('/:clubId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '모임 삭제', description: '모임을 삭제합니다. (모임장만 가능)' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiResponse({ status: 200, description: '모임 삭제 성공' })
  @ApiResponse({ status: 403, description: '삭제 권한 없음' })
  @ApiResponse({ status: 404, description: '모임을 찾을 수 없음' })
  async deleteClub(
    @Param('clubId') clubId: number,
    @User('loginEmail') loginEmail: string
  ) {
    return this.clubService.deleteClub(clubId, loginEmail)
  }

  @Get('/:clubId/status')
  @ApiOperation({ summary: '모임 상태 조회', description: '특정 모임의 상태를 조회합니다.' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiResponse({ status: 200, description: '모임 상태 조회 성공' })
  @ApiResponse({ status: 404, description: '모임을 찾을 수 없음' })
  async getClubStatus(
    @Param('clubId') clubId: number
  ) {
    return this.clubService.getClubStatus(clubId)
  }

  @Get('/:clubId/members')
  @ApiOperation({ summary: '모임 멤버 조회', description: '특정 모임의 멤버 목록을 조회합니다.' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiResponse({ status: 200, description: '멤버 목록 조회 성공' })
  @ApiResponse({ status: 404, description: '모임을 찾을 수 없음' })
  async getClubMembers(
    @Param('clubId') clubId: number
  ) {
    return this.clubService.getClubMembers(clubId)
  }

  @Get('/:clubId/members/ban')
  @ApiOperation({ summary: '추방된 멤버 조회', description: '특정 모임에서 추방된 멤버 목록을 조회합니다.' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiResponse({ status: 200, description: '추방된 멤버 목록 조회 성공' })
  @ApiResponse({ status: 404, description: '모임을 찾을 수 없음' })
  async getClubBanMembers(
    @Param('clubId') clubId: number
  ) {
    return this.clubService.getBanMembersByClub(clubId)
  }

  @Delete('/:clubId/members/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '모임 멤버 추방', description: '모임에서 멤버를 추방합니다. (모임장만 가능)' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  @ApiResponse({ status: 200, description: '멤버 추방 성공' })
  @ApiResponse({ status: 403, description: '추방 권한 없음' })
  @ApiResponse({ status: 404, description: '모임 또는 사용자를 찾을 수 없음' })
  async banClubMembers(
    @Param('clubId') clubId: number,
    @Param('userId') userId: number,
    @User('loginEmail') loginEmail: string
  ) {
    return this.clubService.banClubMembers(clubId, userId, loginEmail)
  }

  @Post('/:clubId/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '모임 활성화', description: '모임을 활성화합니다. (ADMIN만 가능)' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiResponse({ status: 200, description: '모임 활성화 성공' })
  @ApiResponse({ status: 401, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '모임을 찾을 수 없음' })
  async activateClub(
    @Param('clubId') clubId: number
  ) {
    return this.clubService.activateClub(clubId)
  }

  @Post('/:clubId/pause')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '모임 일시정지', description: '모임을 일시정지합니다. (ADMIN만 가능)' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiResponse({ status: 200, description: '모임 일시정지 성공' })
  @ApiResponse({ status: 401, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '모임을 찾을 수 없음' })
  async pauseClub(
    @Param('clubId') clubId: number
  ) {
    return this.clubService.pauseClub(clubId)
  }

  @Post('/:clubId/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '모임 가입', description: '모임에 가입합니다.' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiResponse({ status: 200, description: '모임 가입 성공' })
  @ApiResponse({ status: 400, description: '다른 지역의 모임이거나 이미 가입된 모임' })
  @ApiResponse({ status: 404, description: '모임을 찾을 수 없음' })
  async joinClub(
    @Param('clubId') clubId: number,
    @User('region') region: string,
    @User('userId') userId: number
  ) {
    return this.clubService.joinClub(clubId, region, userId);
  }

  @Delete('/:clubId/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '모임 탈퇴', description: '모임에서 탈퇴합니다.' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiResponse({ status: 200, description: '모임 탈퇴 성공' })
  @ApiResponse({ status: 404, description: '모임을 찾을 수 없음' })
  async leaveClub(
    @Param('clubId') clubId: number,
    @User('userId') userId: number
  ) {
    return this.clubService.leaveClub(clubId, userId)
  }

  @Post('/:clubId/schedule')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '모임 일정 생성', description: '모임 일정을 생성합니다. (모임장만 가능)' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiBody({ type: CreateScheduleDto })
  @ApiResponse({ status: 201, description: '일정 생성 성공' })
  @ApiResponse({ status: 403, description: '생성 권한 없음' })
  @ApiResponse({ status: 404, description: '모임을 찾을 수 없음' })
  async createSchedule(
    @Param('clubId') clubId: number,
    @Body() createScheduleDto: CreateScheduleDto,
    @User('userId') userId: number
  ) {
    return this.clubService.createSchedule(clubId, userId, createScheduleDto)
  }

  @Get('/:clubId/schedule')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '모임 일정 조회', description: '모임의 일정 목록을 조회합니다. (모임 멤버만 가능)' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiResponse({ status: 200, description: '일정 목록 조회 성공' })
  @ApiResponse({ status: 404, description: '모임을 찾을 수 없음' })
  async getSchedules(
    @Param('clubId') clubId: number,
    @User('userId') userId: number
  ) {
    return this.clubService.getSchedules(clubId, userId)
  }

  @Post('/:clubId/schedule/:scheduleId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '일정 참석 신청', description: '모임 일정에 참석 신청합니다.' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiParam({ name: 'scheduleId', description: '일정 ID' })
  @ApiResponse({ status: 200, description: '참석 신청 성공' })
  @ApiResponse({ status: 400, description: '최대 인원 초과 또는 이미 참석한 일정' })
  @ApiResponse({ status: 404, description: '모임 또는 일정을 찾을 수 없음' })
  async applySchedule(
    @Param('clubId') clubId: number,
    @Param('scheduleId') scheduleId: number,
    @User('userId') userId: number,
  ) {
    return this.clubService.applySchedule(clubId, scheduleId, userId)
  }

  @Patch('/:clubId/schedule/:scheduleId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '일정 수정', description: '모임 일정을 수정합니다. (모임장만 가능)' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiParam({ name: 'scheduleId', description: '일정 ID' })
  @ApiBody({ type: UpdateScheduleDto })
  @ApiResponse({ status: 200, description: '일정 수정 성공' })
  @ApiResponse({ status: 403, description: '수정 권한 없음' })
  @ApiResponse({ status: 404, description: '모임 또는 일정을 찾을 수 없음' })
  async updateSchedule(
    @Param('clubId') clubId: number,
    @Param('scheduleId') scheduleId: number,
    @User('userId') userId: number,
    @Body() updateScheduleDto: UpdateScheduleDto
  ) {
    return this.clubService.updateSchedule(clubId, scheduleId, userId, updateScheduleDto)
  }

  @Delete('/:clubId/schedule/:scheduleId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '일정 삭제', description: '모임 일정을 삭제합니다. (모임장만 가능, 유료 일정은 삭제 불가)' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiParam({ name: 'scheduleId', description: '일정 ID' })
  @ApiResponse({ status: 200, description: '일정 삭제 성공' })
  @ApiResponse({ status: 403, description: '삭제 권한 없음 또는 유료 일정' })
  @ApiResponse({ status: 404, description: '모임 또는 일정을 찾을 수 없음' })
  async deleteSchedule(
    @Param('clubId') clubId: number,
    @Param('scheduleId') scheduleId: number,
    @User('userId') userId: number,
  ) {
    return this.clubService.deleteSchedule(clubId, scheduleId, userId)
  }

  @Get('/:clubId/schedule/:scheduleId/members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '일정 참석자 조회', description: '특정 일정의 참석자 목록을 조회합니다.' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiParam({ name: 'scheduleId', description: '일정 ID' })
  @ApiResponse({ status: 200, description: '참석자 목록 조회 성공' })
  @ApiResponse({ status: 404, description: '모임 또는 일정을 찾을 수 없음' })
  async getAttendeesBySchedule(
    @Param('clubId') clubId: number,
    @Param('scheduleId') scheduleId: number,
    @User('userId') userId: number
  ) {
    return this.clubService.getAttendeesBySchedule(clubId, scheduleId, userId)
  }

  @Get('/:clubId/chat-room')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '모임 채팅방 조회', description: '모임의 채팅방을 조회합니다. (모임 멤버만 가능)' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiResponse({ status: 200, description: '채팅방 조회 성공' })
  @ApiResponse({ status: 404, description: '모임을 찾을 수 없음' })
  async getClubChatRoom(
    @Param('clubId') clubId: number,
    @User('userId') userId: number
  ) {
    return this.clubService.getClubChatRoom(clubId, userId)
  }

  @Post('/:clubId/chat-room/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '모임 채팅방 참여', description: '모임 채팅방에 참여합니다.' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiResponse({ status: 200, description: '채팅방 참여 성공' })
  @ApiResponse({ status: 404, description: '모임을 찾을 수 없음' })
  async joinClubChatRoom(
    @Param('clubId') clubId: number,
    @User('userId') userId: number
  ) {
    return this.clubService.joinClubChatRoom(clubId, userId)
  }

  @Delete('/:clubId/chat-room/leave')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '모임 채팅방 나가기', description: '모임 채팅방에서 나갑니다.' })
  @ApiParam({ name: 'clubId', description: '모임 ID' })
  @ApiResponse({ status: 200, description: '채팅방 나가기 성공' })
  @ApiResponse({ status: 404, description: '모임을 찾을 수 없음' })
  async leaveClubChatRoom(
    @Param('clubId') clubId: number,
    @User('userId') userId: number
  ) {
    return this.clubService.leaveClubChatRoom(clubId, userId)
  }

  @Get('/user/schedules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '내 일정 조회', description: '현재 사용자가 참석한 모든 모임 일정을 조회합니다.' })
  @ApiResponse({ status: 200, description: '일정 목록 조회 성공' })
  async getClubSchedulesByUser(
    @User('userId') userId: number
  ) {
    return this.clubService.getClubSchedulesByUser(userId);
  }
}

