import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Users } from '@/user/entities/user.entity';
import { PointHistory } from './entities/point-history.entity';
import { ChargePointDto } from './dto/charge-point.dto';
import { ChargePointByPackageDto } from './dto/charge-point-by-package.dto';
import { UsePointDto } from './dto/use-point.dto';
import { PointPackage } from './entities/point-package.entity';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

@Injectable()
export class PointService {
  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @InjectRepository(PointHistory)
    private readonly pointHistoryRepository: Repository<PointHistory>,
    @InjectRepository(PointPackage)
    private readonly pointPackageRepository: Repository<PointPackage>,
    private readonly dataSource: DataSource
  ) { }

  async chargePoint(userId: number, chargePointDto: ChargePointDto) {
    if (chargePointDto.userId !== userId) {
      throw new ForbiddenException("본인의 포인트만 충전할 수 있습니다.")
    }
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const userRepo = queryRunner.manager.getRepository(Users)
      const pointHistoryRepo = queryRunner.manager.getRepository(PointHistory)

      const user = await userRepo.findOne({
        where: { id: chargePointDto.userId }
      })
      if (!user) {
        await queryRunner.rollbackTransaction();
        throw new NotFoundException("대상 유저가 존재하지 않습니다.")
      }
      await userRepo.increment(
        { id: userId },
        'points',
        chargePointDto.amount
      )
      const pointHistory = pointHistoryRepo.create({
        userId: chargePointDto.userId,
        paymentId: chargePointDto.paymentId,
        changes: chargePointDto.amount,
        charge: chargePointDto.chargeReason
      })
      await pointHistoryRepo.save(pointHistory)

      await queryRunner.commitTransaction();
      const updatedUser = await userRepo.findOne({
        where: { id: chargePointDto.userId }
      })
      return {
        data: {
          userId: updatedUser.id,
          points: updatedUser.points
        },
        message: "포인트 충전에 성공했습니다."
      }
    } catch (error) {
      await queryRunner.rollbackTransaction()
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    } finally {
      await queryRunner.release()
    }
  }

  async chargePointByPackage(userId: number, chargePointByPackageDto: ChargePointByPackageDto) {
    if (chargePointByPackageDto.userId !== userId) {
      throw new ForbiddenException("본인의 포인트만 충전할 수 있습니다.")
    }
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const userRepo = queryRunner.manager.getRepository(Users)
      const pointHistoryRepo = queryRunner.manager.getRepository(PointHistory)
      const pointPackageRepo = queryRunner.manager.getRepository(PointPackage)

  
      const pointPackage = await pointPackageRepo.findOne({
        where: { id: chargePointByPackageDto.packageId }
      })
      if (!pointPackage) {
        await queryRunner.rollbackTransaction();
        throw new NotFoundException("포인트 패키지를 찾을 수 없습니다.")
      }


      const user = await userRepo.findOne({
        where: { id: chargePointByPackageDto.userId }
      })
      if (!user) {
        await queryRunner.rollbackTransaction();
        throw new NotFoundException("대상 유저가 존재하지 않습니다.")
      }

 
      await userRepo.increment(
        { id: userId },
        'points',
        pointPackage.pointCharge
      )

  
      const pointHistory = pointHistoryRepo.create({
        userId: chargePointByPackageDto.userId,
        paymentId: chargePointByPackageDto.paymentId,
        changes: pointPackage.pointCharge,
        charge: `패키지 충전: ${pointPackage.title} (${pointPackage.pointCharge}포인트)`
      })
      await pointHistoryRepo.save(pointHistory)

      await queryRunner.commitTransaction();
      const updatedUser = await userRepo.findOne({
        where: { id: chargePointByPackageDto.userId }
      })
      return {
        data: {
          userId: updatedUser.id,
          points: updatedUser.points,
          package: {
            id: pointPackage.id,
            title: pointPackage.title,
            pointCharge: pointPackage.pointCharge,
            requireCash: pointPackage.requireCash
          }
        },
        message: "포인트 패키지 충전에 성공했습니다."
      }
    } catch (error) {
      await queryRunner.rollbackTransaction()
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    } finally {
      await queryRunner.release()
    }
  }

  async usePoint(userId: number, usePointDto: UsePointDto) {
    if (usePointDto.userId !== userId) {
      throw new ForbiddenException("본인의 포인트만 사용할 수 있습니다.")
    }
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const userRepo = queryRunner.manager.getRepository(Users)
      const pointHistoryRepo = queryRunner.manager.getRepository(PointHistory)

      const user = await userRepo.findOne({
        where: { id: usePointDto.userId }
      })
      if (!user) {
        await queryRunner.rollbackTransaction();
        throw new NotFoundException("대상 유저가 존재하지 않습니다.")
      }

      if (user.points < usePointDto.amount) {
        await queryRunner.rollbackTransaction();
        throw new InternalServerErrorException("보유 포인트가 부족합니다.")
      }
      await userRepo.decrement(
        { id: userId },
        'points',
        usePointDto.amount
      )
      const pointHistory = pointHistoryRepo.create({
        userId: usePointDto.userId,
        changes: -usePointDto.amount,
        use: usePointDto.useReason
      })
      await pointHistoryRepo.save(pointHistory)
      await queryRunner.commitTransaction();
      const updatedUser = await userRepo.findOne({
        where: { id: usePointDto.userId }
      })
      return {
        data: {
          userId: updatedUser.id,
          points: updatedUser.points,
          usedAmount: usePointDto.amount
        },
        message: "포인트 사용에 성공했습니다."
      }
    } catch (error) {
      await queryRunner.rollbackTransaction()
      if (error instanceof NotFoundException || error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    } finally {
      await queryRunner.release()
    }
  }

  async getPointHistories(userId: number, myId: number) {
    if(userId !== myId ){
      throw new ForbiddenException("내 포인트 사용이력만 조회할 수 있습니다.")
    }
    const historiesToGet = await this.pointHistoryRepository.createQueryBuilder('ph')
      .where('ph.userId = :userId', { userId })
      .orderBy('ph.createdAt','DESC')
      .getRawMany()
    return {
      data: historiesToGet,
      message: historiesToGet.length === 0 ? "대상 유저의 포인트 사용기록이 없습니다.": "대상 유저의 포인트 사용 기록을 전부 조회하였습니다."
    }
  }


  async getCurrentPoints(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    })
    if (!user) {
      throw new NotFoundException("대상 유저가 존재하지 않습니다.")
    }
    return {
      data: {
        userId: user.id,
        points: user.points
      },
      message: "현재 보유 포인트를 조회했습니다."
    }
  }

  async createPointPackage(createPackageDto: CreatePackageDto) {
    const packageToCreate = this.pointPackageRepository.create({
      ...createPackageDto
    })
    const saved = await this.pointPackageRepository.save(packageToCreate)
    return {
      message: "포인트 패키지 생성에 성공했습니다.",
      data: saved
    }
  }

  async getPointPackages() {
    const packages = await this.pointPackageRepository.find({
      order: { requireCash: 'ASC' }
    })
    return {
      data: packages,
      message: packages.length === 0 ? "만들어진 포인트 패키지가 없습니다." : "포인트 패키지 목록을 반환합니다."
    }
  }

  async updatePointPackage(packageId: number, updatePackageDto: UpdatePackageDto) {
    const packageToUpdate = await this.pointPackageRepository.findOne({
      where: { id: packageId }
    })
    if (!packageToUpdate) {
      throw new NotFoundException("대상 패키지가 존재하지 않습니다.")
    }
    Object.assign(packageToUpdate, updatePackageDto)
    const saved = await this.pointPackageRepository.save(packageToUpdate)
    return {
      message: "대상 패키지 정보 수정에 성공했습니다.",
      data: saved
    }
  }

  async deletePointPackage(packageId: number) {
    const deleteResult = await this.pointPackageRepository.delete({
      id: packageId
    })
    if (!deleteResult) {
      throw new NotFoundException("대상 패키지가 존재하지 않습니다.")
    }
    return {
      message: "대상 패키지 삭제에 성공했습니다.",
    }
  }

  async getPointPackage(packageId: number) {
    const packageToGet = await this.pointPackageRepository.findOne({
      where: { id: packageId }
    })
    if (!packageToGet) {
      throw new NotFoundException("대상 패키지가 존재하지 않습니다.")
    }
    return {
      message: "대상 패키지를 조회하였습니다",
      data: packageToGet
    }
  }
}
