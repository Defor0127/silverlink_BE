import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Role } from '@/user/enum/role.enum';
import { UpdateFaqDto } from './dto/update-faq-dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('FAQ')
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'FAQ 작성', description: '새로운 FAQ를 작성합니다. (ADMIN만 접근 가능)' })
  @ApiBody({ type: CreateFaqDto })
  @ApiResponse({ status: 201, description: 'FAQ 작성 성공' })
  @ApiResponse({ status: 401, description: '권한 없음' })
  async createFaq(
    @Body() createFaqDto: CreateFaqDto
  ) {
    return this.faqService.createFaq(createFaqDto)
  }

  @Get()
  @ApiOperation({ summary: 'FAQ 목록 조회', description: '전체 FAQ 목록을 조회합니다.' })
  @ApiResponse({ status: 200, description: 'FAQ 목록 조회 성공' })
  async getFaqs() {
    return this.faqService.getFaqs()
  }

  @Get('/:faqId')
  @ApiOperation({ summary: 'FAQ 상세 조회', description: '특정 FAQ의 상세 정보를 조회합니다.' })
  @ApiParam({ name: 'faqId', description: 'FAQ ID' })
  @ApiResponse({ status: 200, description: 'FAQ 조회 성공' })
  @ApiResponse({ status: 404, description: 'FAQ를 찾을 수 없음' })
  async getFaq(
    @Param('faqId') faqId: number
  ) {
    return this.faqService.getFaq(faqId)
  }

  @Patch('/:faqId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'FAQ 수정', description: 'FAQ를 수정합니다. (ADMIN만 접근 가능)' })
  @ApiParam({ name: 'faqId', description: 'FAQ ID' })
  @ApiBody({ type: UpdateFaqDto })
  @ApiResponse({ status: 200, description: 'FAQ 수정 성공' })
  @ApiResponse({ status: 401, description: '권한 없음' })
  @ApiResponse({ status: 404, description: 'FAQ를 찾을 수 없음' })
  async updateFaq(
    @Param('faqId') faqId: number,
    @Body() updateFaqDto: UpdateFaqDto
  ) {
    return this.faqService.updateFaq(faqId, updateFaqDto)
  }

  @Delete('/:faqId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'FAQ 삭제', description: 'FAQ를 삭제합니다. (ADMIN만 접근 가능)' })
  @ApiParam({ name: 'faqId', description: 'FAQ ID' })
  @ApiResponse({ status: 200, description: 'FAQ 삭제 성공' })
  @ApiResponse({ status: 401, description: '권한 없음' })
  @ApiResponse({ status: 404, description: 'FAQ를 찾을 수 없음' })
  async deleteFaq(
    @Param('faqId') faqId: number
  ) {
    return this.faqService.deleteFaq(faqId)
  }
}

