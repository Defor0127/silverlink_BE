import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Faq } from './entities/faq.entity';
import { Repository } from 'typeorm';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq-dto';

@Injectable()
export class FaqService {
  constructor(
    @InjectRepository(Faq)
    private readonly faqRepository: Repository<Faq>
  ) { }

  async getFaqs() {
    const faqs = await this.faqRepository.find({
      order: { createdAt: 'DESC' },
    })
    return {
      data: faqs,
      message: faqs.length === 0 ? "작성된 FAQ가 없습니다." : "작성된 FAQ 목록을 반환합니다.",
    }
  }

  async createFaq(createFaqDto: CreateFaqDto) {
    const faqToCreate = this.faqRepository.create({
      ...createFaqDto
    })
    const saved = await this.faqRepository.save(
      faqToCreate
    )
    return {
      data: saved,
      message: "FAQ 생성에 성공했습니다."
    }
  }

  async getFaq(faqId: number) {
    const faqToGet = await this.faqRepository.findOne({
      where: { id: faqId },
    });
    if (!faqToGet) {
      throw new NotFoundException('해당 FAQ를 찾을 수 없습니다.');
    }
    return {
      data: faqToGet,
      message: "대상 FAQ를 조회하였습니다."
    }
  }

  async updateFaq(faqId: number, updateFaqDto: UpdateFaqDto) {
    const faqToUpdate = await this.faqRepository.findOne({
      where: { id: faqId }
    })
    if (!faqToUpdate) {
      throw new NotFoundException('해당 FAQ를 찾을 수 없습니다.');
    }
    Object.assign(faqToUpdate, updateFaqDto)
    const saved = await this.faqRepository.save(faqToUpdate)
    return {
      data: saved,
      message: "대상 FAQ 수정을 완료하였습니다."
    }
  }

  async deleteFaq(faqId: number) {
    const faqToDelete = await this.faqRepository.findOne({
      where: { id: faqId }
    })
    if (!faqToDelete) {
      throw new NotFoundException("해당 FAQ를 찾을 수 없습니다.")
    }
    const deleteResult = await this.faqRepository.delete({
      id: faqId
    })
    if (!deleteResult || deleteResult.affected === 0) {
      throw new NotFoundException("해당 FAQ를 찾을 수 없습니다.")
    }
    return { message: "해당 FAQ 삭제에 성공했습니다." }
  }
}

