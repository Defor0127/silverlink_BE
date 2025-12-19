import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/user/enum/role.enum';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('카테고리')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '카테고리 생성', description: '새로운 카테고리를 생성합니다. (ADMIN만 접근 가능)' })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ status: 201, description: '카테고리 생성 성공' })
  @ApiResponse({ status: 401, description: '권한 없음' })
  @ApiResponse({ status: 409, description: '이미 존재하는 카테고리명' })
  async createCategory(
    @Body() createCategoryDto: CreateCategoryDto
  ) {
    return this.categoryService.createCategory(createCategoryDto)
  }

  @Get()
  @ApiOperation({ summary: '카테고리 목록 조회', description: '전체 카테고리 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '카테고리 목록 조회 성공' })
  async getCategories() {
    return this.categoryService.getCategories()
  }

  @Get('/hub')
  @ApiOperation({ summary: '허브 카테고리 목록 조회', description: '허브 카테고리 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '카테고리 목록 조회 성공' })
  async getHubCategories() {
    return this.categoryService.getHubCategories()
  }

  @Post('/hub')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '허브 카테고리 생성', description: '새로운 허브 카테고리를 생성합니다. (ADMIN만 접근 가능)' })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({ status: 201, description: '카테고리 생성 성공' })
  @ApiResponse({ status: 401, description: '권한 없음' })
  async createHubCategory(
    @Body() createCategoryDto: CreateCategoryDto
  ) {
    return this.categoryService.createHubCategory(createCategoryDto)
  }

  @Get('/:categoryId')
  @ApiOperation({ summary: '카테고리 상세 조회', description: '특정 카테고리의 정보를 조회합니다.' })
  @ApiParam({ name: 'categoryId', description: '카테고리 ID' })
  @ApiResponse({ status: 200, description: '카테고리 조회 성공' })
  @ApiResponse({ status: 404, description: '카테고리를 찾을 수 없음' })
  async getCategory(
    @Param('categoryId') categoryId: number
  ) {
    return this.categoryService.getCategory(categoryId)
  }

  @Patch('/:categoryId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '카테고리 수정', description: '카테고리 정보를 수정합니다. (ADMIN만 접근 가능)' })
  @ApiParam({ name: 'categoryId', description: '카테고리 ID' })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({ status: 200, description: '카테고리 수정 성공' })
  @ApiResponse({ status: 401, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '카테고리를 찾을 수 없음' })
  async updateCategory(
    @Param('categoryId') categoryId: number,
    @Body() updateCategoryDto: UpdateCategoryDto
  ) {
    return this.categoryService.updateCategory(categoryId, updateCategoryDto)
  }

  @Delete('/:categoryId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '카테고리 삭제', description: '카테고리를 삭제합니다. (ADMIN만 접근 가능)' })
  @ApiParam({ name: 'categoryId', description: '카테고리 ID' })
  @ApiResponse({ status: 200, description: '카테고리 삭제 성공' })
  @ApiResponse({ status: 401, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '카테고리를 찾을 수 없음' })
  async deleteCategory(
    @Param('categoryId') categoryId: number
  ) {
    return this.categoryService.deleteCategory(categoryId)
  }

  @Get('/count/post/:categoryId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '카테고리별 게시글 수 조회', description: '특정 카테고리의 게시글 수를 조회합니다.' })
  @ApiParam({ name: 'categoryId', description: '카테고리 ID' })
  @ApiResponse({ status: 200, description: '게시글 수 조회 성공' })
  @ApiResponse({ status: 404, description: '카테고리를 찾을 수 없음' })
  async getCategoriesWithPostCounts(
    @Param('categoryId') categoryId: number
  ) {
    return this.categoryService.getCategoriesWithPostCounts(categoryId)
  }

  @Get('/count/club/:categoryId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '카테고리별 모임 수 조회', description: '특정 카테고리의 모임 수를 조회합니다.' })
  @ApiParam({ name: 'categoryId', description: '카테고리 ID' })
  @ApiQuery({ name: 'status', enum: ['AWAITING', 'ACTIVE', 'PAUSE', 'DELETED'], description: '모임 상태' })
  @ApiResponse({ status: 200, description: '모임 수 조회 성공' })
  @ApiResponse({ status: 404, description: '카테고리를 찾을 수 없음' })
  async getCategoriesWithClubCounts(
    @Param('categoryId') categoryId: number,
    @Query('status') status: 'ACTIVE' | 'PAUSE' | 'DELETED' | 'AWAITING'
  ) {
    return this.categoryService.getCategoriesWithClubCounts(categoryId, status)
  }
}
