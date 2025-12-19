import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Club } from '@/club/entities/club.entity';
import { Post } from '@/post/entities/post.entity';
import { EntityLookupService } from '@/common/services/entity-lookup.service';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Club)
    private readonly clubRepository: Repository<Club>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    private readonly entityLookupService: EntityLookupService
  ) { }

  async createCategory(createCategoryDto: CreateCategoryDto) {
    const nameExist = await this.categoryRepository.findOne({
      where: { name: createCategoryDto.name, type: 'NORMAL' }
    })
    if (nameExist) {
      throw new ConflictException("이미 존재하는 카테고리명입니다.")
    }
    const categoryToCreate = this.categoryRepository.create({
      ...createCategoryDto,
      type: 'NORMAL'
    })
    const saved = await this.categoryRepository.save(categoryToCreate)
    return {
      data: saved,
      message: "카테고리가 생성되었습니다."
    }
  }

  async getCategories() {
    const categories = await this.categoryRepository.find({
      where: { type: 'NORMAL' }
    })
    return {
      data: categories,
      message: categories.length === 0 ? "등록된 카테고리가 없습니다." : "전체 카테고리를 조회했습니다."
    }
  }

  async getCategory(categoryId: number) {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    })
    if (!category) {
      throw new NotFoundException("대상 카테고리가 존재하지 않습니다.")
    }
    return {
      data: category,
      message: "대상 카테고리를 조회했습니다."
    }
  }

  async updateCategory(categoryId: number, updateCategoryDto: UpdateCategoryDto) {
    const categoryExist = await this.entityLookupService.findOneOrThrow(
      this.categoryRepository,
      { id: categoryId },
      "대상 카테고리가 존재하지 않습니다."
    )
    if (updateCategoryDto.name) {
      const nameExist = await this.categoryRepository.findOne({
        where: { name: updateCategoryDto.name }
      })
      if (nameExist && nameExist.id !== categoryId) {
        throw new ConflictException("이미 존재하는 카테고리명입니다.")
      }
    }
    Object.assign(categoryExist, updateCategoryDto)
    const saved = await this.categoryRepository.save(categoryExist)
    return {
      data: saved,
      message: "카테고리 수정에 성공했습니다."
    }
  }

  async deleteCategory(categoryId: number) {
    const categoryExist = await this.entityLookupService.findOneOrThrow(
      this.categoryRepository,
      { id: categoryId },
      "대상 카테고리가 존재하지 않습니다."
    )
    const updatePostsCategory = await this.postRepository.update(
      { categoryId }, { categoryId: 1 }
    )
    const updateClubsCategory = await this.clubRepository.update(
      { categoryId }, { categoryId: 1 }
    )
    const deleteResult = await this.categoryRepository.delete({
      id: categoryId
    })
    if (!deleteResult) {
      throw new InternalServerErrorException("해당 카테고리 삭제에 실패하였습니다.")
    }
    return {
      message: "해당 카테고리 삭제에 성공하였습니다.",
      data: {
        postsChange: updatePostsCategory,
        clubsChange: updateClubsCategory
      }
    }
  }

  async getHubCategories() {
    const categories = await this.categoryRepository.find({
      where: { type: 'HUB' }
    })
    return {
      data: categories,
      message: categories.length === 0 ? "등록된 HUB 카테고리가 없습니다." : "HUB 카테고리 목록을 조회했습니다."
    }
  }

  async createHubCategory(createCategoryDto: CreateCategoryDto) {
    const nameExist = await this.categoryRepository.findOne({
      where: { name: createCategoryDto.name, type: 'HUB' }
    })
    if (nameExist) {
      throw new ConflictException("이미 존재하는 HUB 카테고리명입니다.")
    }
    const categoryToCreate = this.categoryRepository.create({
      ...createCategoryDto,
      type: 'HUB'
    })
    const saved = await this.categoryRepository.save(categoryToCreate)
    return {
      data: saved,
      message: "HUB 카테고리가 생성되었습니다."
    }
  }

  async getCategoriesWithPostCounts(categoryId: number) {
    const isExist = await this.entityLookupService.findOneOrThrow(
      this.categoryRepository,
      { id: categoryId },
      "대상 카테고리가 존재하지 않습니다."
    )
    const targetCategoryWithCounts = await this.categoryRepository.createQueryBuilder('category')
      .leftJoin('category.posts', 'post')
      .select('category.id', 'id')
      .addSelect('category.name', 'name')
      //post 갯수를 postCount로
      .addSelect('COUNT(post.id)', 'postCount')
      // 상태가 1인 게시물
      .where('post.status = 1')
      .andWhere('category.id =:categoryId', { categoryId })
      .groupBy('category.id')
      .getRawMany()
    return {
      data: targetCategoryWithCounts,
    }
  }

  async getCategoriesWithClubCounts(categoryId: number, status: string) {
    const isExist = await this.entityLookupService.findOneOrThrow(
      this.categoryRepository,
      { id: categoryId },
      "대상 카테고리가 존재하지 않습니다."
    )
    const targetCategoryWithCounts = await this.categoryRepository.createQueryBuilder('category')
      .leftJoin('category.clubs', 'club')
      .select('category.id', 'id')
      .addSelect('category.name', 'name')
      .addSelect('COUNT(club.id)', 'clubCount')
      .where('club.status = :status', { status })
      .andWhere('category.id =:categoryId', { categoryId })
      .groupBy('category.id')
      .getRawMany()
    return {
      data: targetCategoryWithCounts,
    }
  }
}
