import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Club } from './entities/club.entity';
import { DataSource, In, Like, Repository } from 'typeorm';
import { CreateClubDto } from './dto/create-club.dto';
import { Users } from '@/user/entities/user.entity';
import { UpdateClubDto } from './dto/update-club.dto';
import { ClubMember } from './entities/club-member.entity';
import { ClubBanMember } from './entities/club-ban-member.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ClubSchedule } from './entities/club-schedule.entity';
import { ClubScheduleMember } from './entities/club-schedule-member.entity';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ClubChatRoom } from './entities/club-chat-room.entity';
import { ChatRoomUser } from '@/chat/entities/chatroom-user.entity';
import { ClubChatRoomMember } from './entities/club-chat-room-member.entity';
import { User } from '@/common/decorators/user.decorator';
import { EntityLookupService } from '@/common/services/entity-lookup.service';

@Injectable()
export class ClubService {
  constructor(
    @InjectRepository(Club)
    private readonly clubRepository: Repository<Club>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @InjectRepository(ClubMember)
    private readonly clubMemberRepository: Repository<ClubMember>,
    @InjectRepository(ClubBanMember)
    private readonly clubBanMemberRepository: Repository<ClubBanMember>,
    @InjectRepository(ClubSchedule)
    private readonly clubScheduleRepository: Repository<ClubSchedule>,
    @InjectRepository(ClubScheduleMember)
    private readonly clubScheduleMemberRepository: Repository<ClubScheduleMember>,
    @InjectRepository(ClubChatRoom)
    private readonly clubChatRoomRepository: Repository<ClubChatRoom>,
    @InjectRepository(ClubChatRoomMember)
    private readonly clubChatRoomMemberRepository: Repository<ClubChatRoomMember>,
    @InjectRepository(ChatRoomUser)
    private readonly chatRoomUserRepository: Repository<ChatRoomUser>,
    private readonly datasource: DataSource,
    private readonly entityLookupService: EntityLookupService
  ) { }

  async createClub(userId: number, createClubDto: CreateClubDto) {
    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const userRepo = queryRunner.manager.getRepository(Users)
      const clubRepo = queryRunner.manager.getRepository(Club)
      const clubMemberRepo = queryRunner.manager.getRepository(ClubMember)
      const clubChatRoomRepo = queryRunner.manager.getRepository(ClubChatRoom)
      const nameExist = await clubRepo.findOne({
        where: { clubName: createClubDto.clubName }
      })
      if (nameExist) {
        await queryRunner.rollbackTransaction();
        throw new ConflictException("이미 존재하는 모임명입니다.")
      }
      const userExist = await userRepo.findOne({
        where: { id: userId }
      })
      if (!userExist) {
        await queryRunner.rollbackTransaction();
        throw new NotFoundException("대상 유저가 존재하지 않습니다.")
      }
      // 유료 클럽 생성일 경우 'AWAITING' 상태로 생성, 채팅방은 ADMIN이 승인할 때 생성됨.
      if (createClubDto.type === 'PAID') {
        const clubToCreate = clubRepo.create({
          ...createClubDto,
          leaderId: userExist.id,
          status: 'AWAITING'
        })
        const saved = await clubRepo.save(clubToCreate);
        const userToInsert = clubMemberRepo.create({
          userId: userExist.id, clubId: saved.id
        })
        const savedMember = await clubMemberRepo.save(userToInsert)
        await queryRunner.commitTransaction();
        return {
          message: "클럽이 승인 대기 상태로 생성되었습니다.",
          data: {
            club: saved,
            member: savedMember
          }
        }
      }
      const clubToCreate = clubRepo.create({
        ...createClubDto,
        leaderId: userExist.id
      })
      const saved = await clubRepo.save(clubToCreate);
      const userToInsert = clubMemberRepo.create({
        userId: userExist.id, clubId: saved.id
      })
      const savedMember = await clubMemberRepo.save(userToInsert)
      const clubChatRoomToCreate = clubChatRoomRepo.create({
        clubId: saved.id
      })
      const savedClubChatRoom = await clubChatRoomRepo.save(clubChatRoomToCreate)
      await queryRunner.commitTransaction();
      return {
        message: "클럽이 생성되었습니다.",
        data: {
          club: saved,
          member: savedMember,
          clubChatRoom: savedClubChatRoom
        }
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    } finally {
      await queryRunner.release();
    }
  }

  //ADMIN이랑 일반 유저가 호출했을 때 차이가 있음. admin은 전체 지역 모임 정보, 일반 유저는 자기 지역 주변
  async getClubs(region: string, role: string) {
    if (role === 'ADMIN') {
      const clubs = await this.clubRepository.find({
        relations: ['members', 'schedules', 'chatRooms', 'bannedMembers']
      })
      return {
        message: "전체 모임 정보를 반환합니다.",
        data: clubs
      }
    }
    const clubs = await this.clubRepository.find({
      where: { region: region, status: 'ACTIVE' },
      select: ['clubName', 'categoryId', 'leaderId']
    })
    if (clubs.length === 0) {
      return {
        message: "생성된 모임이 없습니다.",
        data: []
      }
    }
    return {
      message: "주변 모임 정보를 반환합니다.",
      data: {
        region: region,
        clubs: clubs
      }
    }
  }

  async getClub(clubId: number) {
    const clubExist = await this.clubRepository.findOne({
      where: { id: clubId, status: 'ACTIVE' },
      relations: ['schedules', 'members', 'leader']
    })
    if (!clubExist) {
      throw new NotFoundException("대상 모임이 존재하지 않습니다.")
    }
    return {
      message: "대상 모임의 정보를 반환합니다.",
      data: {
        clubName: clubExist.clubName,
        introduction: clubExist.introduction,
        region: clubExist.region,
        memberCount: clubExist.members.length,
        leader: clubExist.leader.nickname,
        schedules: clubExist.schedules,
        members: clubExist.members
      }
    }
  }

  async updateClub(loginEmail: string, clubId: number, updateClubDto: UpdateClubDto) {
    const clubExist = await this.clubRepository.findOne({
      where: { id: clubId },
      relations: ['leader']
    })
    if (!clubExist) {
      throw new NotFoundException("대상 모임이 존재하지 않습니다.")
    }
    if (clubExist.leader.loginEmail !== loginEmail) {
      throw new ForbiddenException("대상 모임에 대한 수정 권한이 없습니다.")
    }
    Object.assign(clubExist, updateClubDto)
    const saved = await this.clubRepository.save(clubExist);
    return {
      message: "대상 모임 정보 수정에 성공했습니다.",
      data: saved.clubName
    }
  }
  async getClubStatus(clubId: number) {
    const clubExist = await this.entityLookupService.findOneOrThrow(
      this.clubRepository,
      { id: clubId },
      "대상 모임이 존재하지 않습니다."
    )
    return {
      message: "대상 모임의 상태를 반환합니다.",
      data: {
        name: clubExist.clubName,
        status: clubExist.status
      }
    }
  }

  async getClubsByStatus(type: "AWAITING" | "ACTIVE" | "PAUSE" | "DELETED") {
    const clubs = await this.clubRepository.find({
      where: { status: type }
    })
    if (clubs.length === 0) {
      return {
        message: "대상 상태의 모임이 없습니다.",
        data: []
      }
    }
    return {
      message: "대상 상태의 모임을 조회하였습니다.",
      data: clubs
    }
  }

  async getClubsByType(type: "FREE" | "PAID") {
    const clubs = await this.clubRepository.find({
      where: { type: type }
    })
    if (clubs.length === 0) {
      return {
        message: "대상 타입의 모임이 없습니다.",
        data: []
      }
    }
    return {
      message: "대상 타입의 모임을 조회하였습니다.",
      data: clubs
    }
  }

  // 유저 region 받아서 카테고리별로
  async getClubsByCategory(region: string, categoryId: number) {
    const clubsByCategory = await this.clubRepository.createQueryBuilder('club')
      .leftJoin('club.category', 'category')
      .leftJoin('club.leader', 'leader')
      .leftJoin('club.members', 'members')
      .leftJoin('members.user', 'user')
      .select([
        'category.id',
        'category.name',
        'club.id',
        'club.region',
        'club.clubName',
        'leader.id',
        'leader.nickname',
        'members.userId',
        'user.nickname',
      ])
      .where('club.region = :region', { region })
      .andWhere('club.categoryId = :categoryId', { categoryId })
      .getMany()
    return {
      message: "해당 카테고리의 모임을 전부 반환합니다.",
      data: clubsByCategory
    }
  }

  async activateClub(clubId: number) {
    const targetClub = await this.entityLookupService.findOneOrThrow(
      this.clubRepository,
      { id: clubId },
      "대상 모임이 존재하지 않습니다."
    )
    if (targetClub.status === 'ACTIVE') {
      throw new ConflictException("이미 활성 상태인 모임입니다.")
    }
    const updateResult = await this.clubRepository.update(
      { id: clubId },
      { status: 'ACTIVE' }
    )
    if (!updateResult || updateResult.affected === 0) {
      throw new InternalServerErrorException("모임 상태 변경에 실패했습니다.")
    }
    return {
      message: "모임 상태 변경에 성공했습니다.",
      data: { status: 'ACTIVE' }
    }
  }

  async pauseClub(clubId: number) {
    const targetClub = await this.entityLookupService.findOneOrThrow(
      this.clubRepository,
      { id: clubId },
      "대상 모임이 존재하지 않습니다."
    )
    if (targetClub.status === 'PAUSE') {
      throw new ConflictException("이미 일시정지 상태인 모임입니다.")
    }
    const updateResult = await this.clubRepository.update(
      { id: clubId },
      { status: 'PAUSE' }
    )
    if (!updateResult || updateResult.affected === 0) {
      throw new InternalServerErrorException("모임 상태 변경에 실패했습니다.")
    }
    return {
      message: "모임 상태 변경에 성공했습니다.",
      data: { status: 'PAUSE' }
    }
  }

  async searchClubs(keyword: string) {
    const targetClubs = await this.clubRepository.find({
      select: ['category', 'clubName', 'region', 'leaderId', 'introduction', 'joinMode'],
      where: { clubName: Like(`%${keyword}%`), status: 'ACTIVE' },
      relations: ['category']
    })
    return {
      data: targetClubs,
      message: targetClubs.length === 0 ? "검색 결과가 없습니다" : "검색 결과를 전부 반환합니다."
    }
  }

  async deleteClub(clubId: number, loginEmail: string) {
    const clubExist = await this.clubRepository.findOne({
      where: { id: clubId },
      relations: ['leader']
    })
    if (!clubExist) {
      throw new NotFoundException("대상 모임이 존재하지 않습니다.")
    }
    if (clubExist.leader.loginEmail !== loginEmail) {
      throw new ForbiddenException("삭제 권한이 존재하지 않습니다.")
    }
    const deleteResult = await this.clubRepository.update({
      id: clubId
    }, { status: 'DELETED' })
    if (!deleteResult || deleteResult.affected === 0) {
      throw new InternalServerErrorException("모임 삭제에 실패했습니다.")
    }
    return {
      message: "모임 삭제에 성공했습니다."
    }
  }

  async getClubMembers(clubId: number) {
    const clubExist = await this.entityLookupService.findOneOrThrow(
      this.clubRepository,
      { id: clubId },
      "대상 모임이 존재하지 않습니다."
    )
    const targetMembers = await this.clubMemberRepository.find({
      select: ['userId'],
      where: { clubId }
    })

    if (targetMembers.length === 0) {
      return {
        message: "대상 모임의 멤버가 0명입니다.",
        data: []
      }
    }
    const memberIds = targetMembers.map(({ userId }) => userId)
    const membersDetail = await this.userRepository.find({
      select: ['id', 'loginEmail', 'nickname'],
      where: { id: In(memberIds) }
    })
    return {
      message: "대상 모임의 멤버를 전부 조회했습니다.",
      data: membersDetail
    }
  }
  //가입한 모임 조회
  async getClubsByMe(userId: number) {
    try {
      const targetUser = await this.entityLookupService.findOneOrThrow(
        this.userRepository,
        { id: userId },
        "대상 유저가 존재하지 않습니다."
      )
      const clubIdsToGet = await this.clubMemberRepository.find({
        select: ['clubId'],
        where: { userId }
      })
      if (clubIdsToGet.length === 0) {
        return {
          message: "대상 유저가 가입한 모임이 없습니다.",
          data: []
        }
      }
      const clubIds = clubIdsToGet.map(({ clubId }) => clubId)
      const clubsToGet = await this.clubRepository.find({
        select: ['id', 'categoryId', 'clubName', 'introduction', 'joinMode'],
        where: { id: In(clubIds) }
      })
      return {
        message: `${clubIdsToGet.length}개의 모임을 조회했습니다.`,
        data: clubsToGet
      }
    } catch (error) {
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    }
  }

  async getOperatingClubsByMe(userId: number) {
    const userExist = await this.entityLookupService.findOneOrThrow(
      this.userRepository,
      { id: userId },
      "대상 유저가 존재하지 않습니다."
    )
    const operatingClubs = await this.clubRepository.find({
      select: ['clubName', 'category', 'region', 'introduction', 'joinMode', 'status'],
      where: { leaderId: userId },
      relations: ['category']
    })
    if (operatingClubs.length === 0) {
      return {
        message: "운영중인 모임이 없습니다.",
        data: []
      }
    }
    return {
      message: `${operatingClubs.length}개의 모임을 조회하였습니다.`,
      data: operatingClubs
    }
  }

  async banClubMembers(clubId: number, userId: number, loginEmail: string) {
    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const clubRepo = queryRunner.manager.getRepository(Club);
      const clubMemberRepo = queryRunner.manager.getRepository(ClubMember);
      const clubBanMemberRepo = queryRunner.manager.getRepository(ClubBanMember);

      const clubExist = await clubRepo.findOne({
        where: { id: clubId },
        relations: ['leader']
      })
      if (!clubExist) {
        await queryRunner.rollbackTransaction();
        throw new NotFoundException("대상 모임이 존재하지 않습니다.")
      }
      const memberExist = await clubMemberRepo.findOne({
        where: { userId: userId, clubId: clubId }
      })
      if (!memberExist) {
        await queryRunner.rollbackTransaction();
        throw new NotFoundException("대상 멤버가 존재하지 않습니다.")
      }
      if (clubExist.leader.loginEmail !== loginEmail) {
        await queryRunner.rollbackTransaction();
        throw new ForbiddenException("삭제 권한이 존재하지 않습니다.")
      }
      if (clubExist.leaderId === userId) {
        await queryRunner.rollbackTransaction();
        throw new ForbiddenException("모임장 자신을 추방할 수 없습니다.")
      }
      const deleteResult = await clubMemberRepo.delete({
        userId: userId, clubId: clubId
      })
      if (!deleteResult || deleteResult.affected === 0) {
        await queryRunner.rollbackTransaction();
        throw new InternalServerErrorException("멤버 추방에 실패했습니다.")
      }
      const banUser = clubBanMemberRepo.create({
        banUserId: userId, clubId: clubId
      })
      const saved = await clubBanMemberRepo.save(banUser)
      await queryRunner.commitTransaction();
      return {
        message: "멤버 추방에 성공했습니다.",
        data: saved
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    } finally {
      await queryRunner.release();
    }
  }

  async getBanMembersByClub(clubId: number) {
    const targetMembers = await this.clubBanMemberRepository.find({
      select: ['banUserId'],
      where: { clubId },
    })
    if (targetMembers.length === 0) {
      return {
        message: "대상 클럽에 추방 유저가 존재하지 않습니다.",
        data: []
      }
    }
    const memberIds = targetMembers.map(({ banUserId }) => banUserId)
    const membersDetail = await this.userRepository.find({
      select: ['id', 'loginEmail', 'nickname'],
      where: { id: In(memberIds) }
    })
    return {
      message: "대상 모임의 추방된 유저 목록을 반환합니다.",
      data: membersDetail
    }
  }

  async joinClub(clubId: number, region: string, userId: number) {
    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const clubRepo = queryRunner.manager.getRepository(Club);
      const clubMemberRepo = queryRunner.manager.getRepository(ClubMember);

      const clubExist = await clubRepo.findOne({
        where: { id: clubId }
      })
      if (!clubExist) {
        await queryRunner.rollbackTransaction();
        throw new NotFoundException("대상 모임이 존재하지 않습니다.")
      }
      if (clubExist.region !== region) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException("다른 지역의 모임에 가입할 수 없습니다.")
      }
      const memberExist = await clubMemberRepo.findOne({
        where: { clubId: clubId, userId: userId }
      })
      if (memberExist) {
        await queryRunner.rollbackTransaction();
        throw new ConflictException("이미 대상 모임에 가입된 유저입니다.")
      }
      if (clubExist.joinMode === 'AUTO') {
        const memberToCreate = clubMemberRepo.create({
          clubId: clubId, userId: userId, status: 'JOIN'
        })
        const saved = await clubMemberRepo.save(memberToCreate);
        await queryRunner.commitTransaction();
        return {
          message: "모임에 가입했습니다.",
          data: saved
        }
      }
      const memberToCreate = clubMemberRepo.create({
        clubId: clubId, userId: userId, status: 'WAIT'
      })
      const saved = await clubMemberRepo.save(memberToCreate);
      await queryRunner.commitTransaction();
      return {
        message: "모임에 가입 신청하였습니다.",
        data: saved
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    } finally {
      await queryRunner.release();
    }
  }

  async leaveClub(clubId: number, userId: number) {
    try {
      const clubExist = await this.entityLookupService.findOneOrThrow(
        this.clubRepository,
        { id: clubId },
        "대상 모임이 존재하지 않습니다."
      )
      const memberExist = await this.entityLookupService.findOneOrThrow(
        this.clubMemberRepository,
        { userId, clubId },
        "대상 모임에 가입중인 멤버가 아닙니다."
      )
      if (userId === clubExist.leaderId) {
        throw new ForbiddenException("모임의 운영자는 모임을 탈퇴할 수 없습니다.")
      }
      if (memberExist.status === 'WAIT') {
        const deleteResult = await this.clubMemberRepository.delete({
          userId, clubId
        })
        if (!deleteResult || deleteResult.affected === 0) {
          throw new InternalServerErrorException("모임 가입 신청 취소에 실패했습니다.")
        }
        return {
          message: "모임 가입 신청 취소에 성공했습니다."
        }
      }
      if (memberExist.status === 'JOIN') {
        const deleteResult = await this.clubMemberRepository.delete({
          userId, clubId
        })
        if (!deleteResult || deleteResult.affected === 0) {
          throw new InternalServerErrorException("모임 탈퇴에 실패했습니다.")
        }
        return {
          message: "모임 탈퇴에 성공했습니다."
        }
      }
    } catch (error) {
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    }
  }

  async createSchedule(clubId: number, userId: number, createScheduleDto: CreateScheduleDto) {
    try {
      const clubExist = await this.entityLookupService.findOneOrThrow(
        this.clubRepository,
        { id: clubId },
        "대상 모임이 존재하지 않습니다."
      )
      if (clubExist.leaderId !== userId) {
        throw new ForbiddenException("모임장만 일정을 생성할 수 있습니다.")
      }
      const scheduleToCreate = this.clubScheduleRepository.create({
        ...createScheduleDto,
        clubId: clubExist.id
      })
      if (createScheduleDto.price) {
        if (clubExist.type === 'FREE') {
          throw new BadRequestException("유료 모임만 유료 일정을 생성할 수 있습니다.")
        } else if (clubExist.type === 'PAID') {
          const saved = await this.clubScheduleRepository.save(scheduleToCreate)
          return {
            message: "유료 일정을 생성했습니다.",
            data: saved
          }
        }
      }
      const saved = await this.clubScheduleRepository.save(scheduleToCreate)
      return {
        message: "클럽 일정이 생성되었습니다.",
        data: saved
      }
    } catch (error) {
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    }
  }

  async getSchedules(clubId: number, userId: number) {
    try {
      const clubExist = await this.entityLookupService.findOneOrThrow(
        this.clubRepository,
        { id: clubId },
        "대상 모임이 존재하지 않습니다."
      )
      const isMember = await this.clubMemberRepository.findOne({
        where: { userId, clubId, status: 'JOIN' }
      })
      if (!isMember) {
        throw new ForbiddenException("대상 모임의 멤버가 아닙니다.")
      }
      const schedulesToGet = await this.clubScheduleRepository.find({
        select: ['id', 'title', 'content', 'place', 'price', 'maxAttendee', 'startDate', 'endDate'],
        where: { clubId },
      })
      if (schedulesToGet.length === 0) {
        return {
          message: "대상 모임의 일정이 없습니다.",
          data: []
        }
      }
      return {
        message: "대상 모임의 일정을 전부 조회하였습니다.",
        data: {
          clubName: clubExist.clubName,
          schedules: schedulesToGet
        }
      }
    } catch (error) {
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    }
  }

  async applySchedule(clubId: number, scheduleId: number, userId: number) {
    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const clubRepo = queryRunner.manager.getRepository(Club);
      const clubScheduleRepo = queryRunner.manager.getRepository(ClubSchedule);
      const clubMemberRepo = queryRunner.manager.getRepository(ClubMember);
      const clubScheduleMemberRepo = queryRunner.manager.getRepository(ClubScheduleMember);

      const clubExist = await clubRepo.findOne({
        where: { id: clubId }
      })
      if (!clubExist) {
        await queryRunner.rollbackTransaction();
        throw new NotFoundException("대상 모임이 존재하지 않습니다.")
      }
      const scheduleExist = await clubScheduleRepo.findOne({
        where: { id: scheduleId }
      })
      if (!scheduleExist) {
        await queryRunner.rollbackTransaction();
        throw new NotFoundException("대상 일정이 존재하지 않습니다.")
      }
      const isMatch = await clubScheduleRepo.findOne({
        where: { id: scheduleId, clubId: clubId }
      })
      if (!isMatch) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException("대상 모임의 일정이 아닙니다.")
      }
      const isMember = await clubMemberRepo.findOne({
        where: { userId: userId, clubId, status: 'JOIN' }
      })
      if (!isMember) {
        await queryRunner.rollbackTransaction();
        throw new ForbiddenException("대상 모임의 멤버가 아닙니다.")
      }
      const isExist = await clubScheduleMemberRepo.findOne({
        where: { id: scheduleId, memberId: userId }
      })
      if (isExist) {
        await queryRunner.rollbackTransaction();
        throw new ConflictException("이미 참석한 일정입니다.")
      }
      const scheduleMembers = await clubScheduleMemberRepo.find({
        where: { id: scheduleId, status: 'ATTEND' }
      })
      if (scheduleMembers.length >= scheduleExist.maxAttendee) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException("대상 일정의 최대 참가 인원을 초과하였습니다.")
      }
      const scheduleMemberToApply = clubScheduleMemberRepo.create({
        scheduleId: scheduleId, memberId: userId, status: 'ATTEND'
      })
      const saved = await clubScheduleMemberRepo.save(scheduleMemberToApply)
      await queryRunner.commitTransaction();
      return {
        message: "대상 일정에 참석하였습니다.",
        data: saved
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException("서버 에러가 발생하였습니다.")
    } finally {
      await queryRunner.release();
    }
  }

  async updateSchedule(clubId: number, scheduleId: number, userId: number, updateScheduleDto: UpdateScheduleDto) {
    const isExistSchedule = await this.entityLookupService.findOneOrThrow(
      this.clubScheduleRepository,
      { id: scheduleId, clubId: clubId },
      "대상 일정이 존재하지 않습니다."
    )
    const targetClub = await this.clubRepository.findOne({
      where: { id: isExistSchedule.clubId }
    })
    const attendees = await this.clubScheduleMemberRepository.find({
      where: { scheduleId, status: 'ATTEND' }
    })
    if (targetClub.leaderId !== userId) {
      throw new ForbiddenException("대상에 대한 수정 권한이 없습니다.")
    }
    if (attendees.length > updateScheduleDto.maxAttendee) {
      throw new ForbiddenException("현재 참석 인원 이하로 최대 참석자를 수정할 수 없습니다.")
    }
    Object.assign(isExistSchedule, updateScheduleDto)
    const saved = await this.clubScheduleRepository.save(isExistSchedule)
    return {
      message: "대상 일정을 수정했습니다.",
      data: saved
    }
  }

  async deleteSchedule(clubId: number, scheduleId: number, userId: number) {
    const isExistSchedule = await this.entityLookupService.findOneOrThrow(
      this.clubScheduleRepository,
      { id: scheduleId, clubId: clubId },
      "대상 일정이 존재하지 않습니다."
    )
    const targetClub = await this.clubRepository.findOne({
      where: { id: isExistSchedule.clubId }
    })
    if (targetClub.leaderId !== userId) {
      throw new ForbiddenException("대상에 대한 수정 권한이 없습니다.")
    }
    if (isExistSchedule.type === 'PAID') {
      throw new ForbiddenException("유료 일정은 삭제할 수 없습니다.")
    }
    const deleteResult = await this.clubScheduleRepository.delete({
      id: scheduleId
    })
    if (!deleteResult || deleteResult.affected === 0) {
      throw new InternalServerErrorException("일정 삭제에 실패했습니다.")
    }
    return {
      message: "일정 삭제에 성공했습니다."
    }
  }

  async getAttendeesBySchedule(clubId: number, scheduleId: number, userId: number) {
    try {
      const attendees = await this.clubScheduleMemberRepository.find({
        where: { scheduleId, status: 'ATTEND' }
      })
      if (attendees.length === 0) {
        return {
          message: "대상 스케줄에 참석한 멤버가 없습니다.",
          data: []
        }
      }
      const memberIds = attendees.map(({ memberId }) => memberId)
      const membersDetail = await this.userRepository.find({
        where: { id: In(memberIds) },
        select: ['id', 'loginEmail', 'nickname']
      })
      return {
        message: "참석 멤버의 정보를 반환합니다.",
        data: membersDetail
      }
    } catch (error) {
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    }
  }

  async getClubChatRoom(clubId: number, userId: number) {
    try {
      const clubExist = await this.entityLookupService.findOneOrThrow(
        this.clubRepository,
        { id: clubId },
        "대상 모임이 존재하지 않습니다."
      )
      const isMember = await this.clubMemberRepository.findOne({
        where: { clubId: clubId, userId: userId }
      })
      if (!isMember) {
        throw new ForbiddenException("대상 모임의 멤버만 해당 모임 채팅방을 조회할 수 있습니다.")
      }
      const clubChatRoom = await this.clubChatRoomRepository.findOne({
        where: { clubId: clubId }
      })
      return {
        message: "대상 모임의 채팅방을 조회하였습니다.",
        data: clubChatRoom
      }
    } catch (error) {
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    }
  }

  async getClubSchedulesByUser(userId: number) {
    try {
      const userExist = await this.entityLookupService.findOneOrThrow(
        this.userRepository,
        { id: userId },
        "대상 유저가 존재하지 않습니다."
      )
      // 클럽 별로 참석한 일정 정리
      const attendSchedules = await this.clubScheduleRepository.createQueryBuilder('clubSchedule')
        .innerJoin('clubSchedule.attendees', 'attendee')
        .select([
          'clubSchedule.id',
          'clubSchedule.startDate',
          'clubSchedule.endDate',
          'clubSchedule.place',
          'clubSchedule.title',
          'clubSchedule.content',
          'clubSchedule.maxAttendee',
          'attendee.memberId'
        ])
        .where('attendee.memberId = :userId', { userId })
        .getMany()
      return {
        message: "대상 유저가 참석한 일정을 전부 조회하였습니다.",
        data: attendSchedules
      }
    } catch (error) {
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    }
  }

  async joinClubChatRoom(clubId: number, userId: number) {
    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const clubMemberRepo = queryRunner.manager.getRepository(ClubMember);
      const clubChatRoomRepo = queryRunner.manager.getRepository(ClubChatRoom);
      const clubChatRoomMemberRepo = queryRunner.manager.getRepository(ClubChatRoomMember);

      const isSubscribed = await clubMemberRepo.findOne({
        where: { clubId, userId }
      })
      if (!isSubscribed) {
        await queryRunner.rollbackTransaction();
        throw new ForbiddenException("대상 모임의 멤버가 아니면 채팅방에 들어갈 수 없습니다.")
      }
      const clubChatRoomToJoin = await clubChatRoomRepo.findOne({
        where: { clubId }
      })
      if (!clubChatRoomToJoin) {
        await queryRunner.rollbackTransaction();
        throw new NotFoundException("대상 모임의 채팅방이 존재하지 않습니다.")
      }
      const isConnected = await clubChatRoomMemberRepo.findOne({
        where: { roomId: clubChatRoomToJoin.id, userId }
      })
      if (isConnected) {
        await queryRunner.rollbackTransaction();
        throw new ConflictException("이미 대상 채팅방에 접속중인 유저입니다.")
      }
      const joinChatRoom = clubChatRoomMemberRepo.create({
        roomId: clubChatRoomToJoin.id, userId
      })
      const saved = await clubChatRoomMemberRepo.save(joinChatRoom)
      await queryRunner.commitTransaction();
      return {
        data: saved,
        message: "모임 채팅방에 참여하였습니다."
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof ForbiddenException || error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException("서버 에러가 발생했습니다.")
    } finally {
      await queryRunner.release();
    }
  }

  async leaveClubChatRoom(clubId: number, userId: number) {
    const isSubscribed = await this.clubMemberRepository.findOne({
      where: { clubId, userId }
    })
    if (!isSubscribed) {
      throw new ForbiddenException("대상 모임의 멤버가 아닙니다.")
    }
    const chatRoomToLeave = await this.clubChatRoomRepository.findOne({
      where: { clubId }
    })
    if (!chatRoomToLeave) {
      throw new NotFoundException("대상 모임의 채팅방이 존재하지 않습니다.")
    }
    const isConnected = await this.clubChatRoomMemberRepository.findOne({
      where: { roomId: chatRoomToLeave.id, userId }
    })
    if (!isConnected) {
      throw new NotFoundException("대상 채팅방에 존재하지 않는 유저입니다.")
    }
    const leaveChatRoom = await this.clubChatRoomMemberRepository.delete({
      roomId: chatRoomToLeave.id, userId
    })
    if (!leaveChatRoom || leaveChatRoom.affected === 0) {
      throw new InternalServerErrorException("대상 채팅방 나가기에 실패했습니다.")
    }
    return {
      message: "대상 채팅방 나가기에 성공했습니다."
    }
  }
}

