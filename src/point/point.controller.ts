import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PointService } from './point.service';
import { ChargePointDto } from './dto/charge-point.dto';
import { ChargePointByPackageDto } from './dto/charge-point-by-package.dto';
import { UsePointDto } from './dto/use-point.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { User } from '@/common/decorators/user.decorator';
import { Role } from '@/user/enum/role.enum';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('포인트')
@Controller('point')
export class PointController {
  constructor(private readonly pointService: PointService) { }

  @Post('/charge')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '포인트 충전', description: '포인트를 충전합니다.' })
  @ApiBody({ type: ChargePointDto })
  @ApiResponse({ status: 200, description: '포인트 충전 성공' })
  async chargePoint(
    @Body() chargePointDto: ChargePointDto,
    @User('userId') userId: number
  ) {
    return this.pointService.chargePoint(userId, chargePointDto)
  }

  @Post('/charge/package')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '포인트 패키지로 충전', description: '포인트 패키지를 사용하여 포인트를 충전합니다.' })
  @ApiBody({ type: ChargePointByPackageDto })
  @ApiResponse({ status: 200, description: '포인트 패키지 충전 성공' })
  @ApiResponse({ status: 404, description: '패키지 또는 사용자를 찾을 수 없음' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async chargePointByPackage(
    @Body() chargePointByPackageDto: ChargePointByPackageDto,
    @User('userId') userId: number
  ) {
    return this.pointService.chargePointByPackage(userId, chargePointByPackageDto)
  }

  @Post('/use')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '포인트 사용', description: '포인트를 사용합니다.' })
  @ApiBody({ type: UsePointDto })
  @ApiResponse({ status: 200, description: '포인트 사용 성공' })
  @ApiResponse({ status: 400, description: '보유 포인트 부족' })
  @ApiResponse({ status: 403, description: '본인의 포인트만 사용 가능' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async usePoint(
    @Body() usePointDto: UsePointDto,
    @User('userId') userId: number
  ) {
    return this.pointService.usePoint(userId, usePointDto)
  }

  @Get('/history/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '포인트 내역 조회', description: '사용자의 포인트 사용 내역을 조회합니다. (본인만 조회 가능)' })
  @ApiParam({ name: 'userId', description: '사용자 ID' })
  @ApiResponse({ status: 200, description: '포인트 내역 조회 성공' })
  @ApiResponse({ status: 403, description: '본인의 포인트 내역만 조회 가능' })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async getPointHistories(
    @Param('userId') userId: number,
    @User('userId') myId: number
  ) {
    return this.pointService.getPointHistories(userId, myId)
  }

  @Get('/current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '현재 포인트 조회', description: '현재 보유 포인트를 조회합니다.' })
  @ApiResponse({ status: 200, description: '포인트 조회 성공' })
  async getCurrentPoints(
    @User('userId') userId: number
  ) {
    return this.pointService.getCurrentPoints(userId)
  }

  @Get('/package')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '포인트 패키지 목록 조회', description: '포인트 충전 패키지 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '패키지 목록 조회 성공' })
  async getPointPackages() {
    return this.pointService.getPointPackages()
  }

  @Post('/package')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '포인트 패키지 생성', description: '새로운 포인트 패키지를 생성합니다. (ADMIN만 접근 가능)' })
  @ApiBody({ type: CreatePackageDto })
  @ApiResponse({ status: 201, description: '패키지 생성 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async createPointPackage(
    @Body() createPackageDto: CreatePackageDto
  ) {
    return this.pointService.createPointPackage(createPackageDto)
  }

  @Get('/package/:packageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '포인트 패키지 조회', description: '특정 포인트 패키지의 정보를 조회합니다.' })
  @ApiParam({ name: 'packageId', description: '패키지 ID' })
  @ApiResponse({ status: 200, description: '패키지 조회 성공' })
  @ApiResponse({ status: 404, description: '패키지를 찾을 수 없음' })
  async getPointPackage(
    @Param('packageId') packageId: number
  ) {
    return this.pointService.getPointPackage(packageId)
  }

  @Delete('/package/:packageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '포인트 패키지 삭제', description: '포인트 패키지를 삭제합니다. (ADMIN만 접근 가능)' })
  @ApiParam({ name: 'packageId', description: '패키지 ID' })
  @ApiResponse({ status: 200, description: '패키지 삭제 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '패키지를 찾을 수 없음' })
  async deletePointPackage(
    @Param('packageId') packageId: number
  ) {
    return this.pointService.deletePointPackage(packageId)
  }

  @Patch('/package/:packageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '포인트 패키지 수정', description: '포인트 패키지 정보를 수정합니다. (ADMIN만 접근 가능)' })
  @ApiParam({ name: 'packageId', description: '패키지 ID' })
  @ApiBody({ type: UpdatePackageDto })
  @ApiResponse({ status: 200, description: '패키지 수정 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '패키지를 찾을 수 없음' })
  async updatePointPackage(
    @Param('packageId') packageId: number,
    @Body() updatePackageDto: UpdatePackageDto
  ) {
    return this.pointService.updatePointPackage(packageId, updatePackageDto)
  }
}
