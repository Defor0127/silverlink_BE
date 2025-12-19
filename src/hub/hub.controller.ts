import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { HubService } from "./hub.service";
import { CreateHubContentDto } from "./dto/create-hub-content.dto";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";
import { User } from "@/common/decorators/user.decorator";
import { Role } from "@/user/enum/role.enum";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('허브')
@Controller("hub")
export class HubController {
  constructor(private readonly hubService: HubService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '허브 콘텐츠 생성', description: '새로운 허브 콘텐츠를 생성합니다. (ADMIN만 접근 가능)' })
  @ApiBody({ type: CreateHubContentDto })
  @ApiResponse({ status: 201, description: '콘텐츠 생성 성공' })
  @ApiResponse({ status: 401, description: '권한 없음' })
  async createHubContent(
    @Body() createHubContentDto: CreateHubContentDto,
    @User('userId') userId: number
  ) {
    return this.hubService.createHubContent(userId, createHubContentDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '허브 콘텐츠 목록 조회', description: '전체 허브 콘텐츠 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: '콘텐츠 목록 조회 성공' })
  async getHubContents() {
    return this.hubService.getHubContents()
  }

  @Get("/search")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '허브 콘텐츠 검색', description: '제목으로 허브 콘텐츠를 검색합니다.' })
  @ApiQuery({ name: 'keyword', description: '검색 키워드' })
  @ApiResponse({ status: 200, description: '검색 결과 조회 성공' })
  async searchHubContents(
    @Query("keyword") keyword: string
  ) {
    return this.hubService.searchHubContents(keyword);
  }

  @Get("/:contentId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '허브 콘텐츠 상세 조회', description: '특정 허브 콘텐츠의 상세 정보를 조회합니다.' })
  @ApiParam({ name: 'contentId', description: '콘텐츠 ID' })
  @ApiResponse({ status: 200, description: '콘텐츠 조회 성공' })
  @ApiResponse({ status: 404, description: '콘텐츠를 찾을 수 없음' })
  async getHubContent(
    @Param("contentId") contentId: number
  ) {
    return this.hubService.getHubContent(contentId);
  }

  @Get('/category/:categoryId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '카테고리별 허브 콘텐츠 조회', description: '카테고리별 허브 콘텐츠 목록을 조회합니다.' })
  @ApiParam({ name: 'categoryId', description: '카테고리 ID' })
  @ApiResponse({ status: 200, description: '카테고리별 허브 콘텐츠 목록 조회 성공' })
  @ApiResponse({ status: 404, description: '카테고리를 찾을 수 없음' })
  async getHubContentsByCategory(
    @Param('categoryId') categoryId: number
  ) {
    return this.hubService.getHubContentByCategory(categoryId)
  }
}
