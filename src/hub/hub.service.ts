import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { SeniorContent } from './entities/senior-content.entity';
import { CreateHubContentDto } from './dto/create-hub-content.dto';
import { UpdateHubContentDto } from './dto/update-hub-content.dto';
import { Category } from '@/category/entities/category.entity';
import { EntityLookupService } from '@/common/services/entity-lookup.service';
import { Role } from '@/user/enum/role.enum';

@Injectable()

//todo: 지역별 커뮤니티 활동 위주인 시니어 대상 앱인 만큼 특정 지역이나 특정 연령대에 맞는 기능 추가
export class HubService {
  constructor(
    @InjectRepository(SeniorContent)
    private readonly seniorContentRepository: Repository<SeniorContent>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly entityLookupService: EntityLookupService
  ) { }

  async createHubContent(userId: number, createHubContentDto: CreateHubContentDto) {
    const isHubCategory = await this.categoryRepository.findOne({
      where: { id: createHubContentDto.categoryId, type: 'HUB' }
    })
    if(!isHubCategory) {
      throw new NotFoundException("대상 HUB 카테고리가 존재하지 않습니다.")
    }
    const contentToCreate = this.seniorContentRepository.create({
      ...createHubContentDto,
      adminId: userId
    })
    const saved = await this.seniorContentRepository.save(contentToCreate)
    return {
      data: saved,
      message: "허브 콘텐츠가 생성되었습니다."
    }
  }

  async getHubContents() {
    const contents = await this.seniorContentRepository.find({
      select: ['title', 'categoryId']
    })
    return {
      data: contents,
      message: contents.length === 0 ? "작성된 HUB 콘텐츠가 없습니다." : "작성된 HUB 콘텐츠 목록을 반환합니다.",
    }
  }

  async getHubContent(contentId: number) {
    const contentExist = await this.entityLookupService.findOneOrThrow(
      this.seniorContentRepository,
      { id: contentId },
      "대상 콘텐츠가 존재하지 않습니다."
    )
    return {
      data: contentExist,
      message: "대상 콘텐츠를 조회했습니다."
    }
  }

  async getHubContentByCategory(categoryId: number) {
    const contents = await this.seniorContentRepository.find({
      where: { categoryId },
      relations: ['category']
    })
    if(contents.length === 0) {
      return {
        data: [],
        message: "카테고리에 해당하는 HUB 콘텐츠가 존재하지 않습니다."
      }
    }
    return {
      data: contents,
      message: "카테고리에 해당하는 HUB 콘텐츠 목록을 반환합니다."
    }
  }

  async searchHubContents(keyword: string) {
    const contents = await this.seniorContentRepository.find({
      where: { title: Like(`%${keyword}%`) },
      order: { createdAt: 'DESC' }
    })
    return {
      data: contents,
      message: contents.length === 0 ? "검색 결과가 없습니다." : "검색 결과를 반환합니다."
    }
  }

  async updateHubContent( contentId: number, updateHubContentDto: UpdateHubContentDto) {
    const contentExist = await this.entityLookupService.findOneOrThrow(
      this.seniorContentRepository,
      { id: contentId },
      "대상 콘텐츠가 존재하지 않습니다."
    )
    Object.assign(contentExist, updateHubContentDto)
    const saved = await this.seniorContentRepository.save(contentExist)
    return {
      data: saved,
      message: "허브 콘텐츠 수정에 성공했습니다."
    }
  }

  async deleteHubContent( contentId: number) {
    const contentExist = await this.entityLookupService.findOneOrThrow(
      this.seniorContentRepository,
      { id: contentId },
      "대상 콘텐츠가 존재하지 않습니다."
    )
    const deleteResult = await this.seniorContentRepository.delete({ id: contentId })
    if (!deleteResult || deleteResult.affected === 0) {
      throw new NotFoundException("대상 콘텐츠가 존재하지 않습니다.")
    }
    return { message: "콘텐츠 삭제에 성공했습니다." }
  }
}
