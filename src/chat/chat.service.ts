import { Users } from '@/user/entities/user.entity';
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoomUser } from './entities/chatroom-user.entity';
import { ChatRoom } from './entities/chatroom.entity';
import { v4 as uuidv4 } from 'uuid';
import { EntityLookupService } from '@/common/services/entity-lookup.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @InjectRepository(ChatRoomUser)
    private readonly chatRoomUserRepository: Repository<ChatRoomUser>,
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    private readonly entityLookupService: EntityLookupService
  ) { }

  async getChatRoomsByUser(userId: number) {
    const getUserChatRooms = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['chatRooms']
    })
    if (!getUserChatRooms) {
      throw new NotFoundException("대상 유저가 존재하지 않습니다.")
    }
    if (getUserChatRooms.chatRooms.length === 0) {
      return {
        message: "대상 유저가 보유중인 채팅방이 없습니다.",
        data: []
      }
    }
    return {
      message: "대상 유저가 접속중인 채팅방을 조회했습니다.",
      data: getUserChatRooms.chatRooms
    }
  }

  async enterChatRoom(userId: number, roomId: string) {
    const userExist = await this.entityLookupService.findOneOrThrow(
      this.userRepository,
      { id: userId },
      "대상 유저가 존재하지 않습니다."
    )
    const roomExist = await this.entityLookupService.findOneOrThrow(
      this.chatRoomRepository,
      { id: roomId },
      "대상 채팅방이 존재하지 않습니다."
    )
    const isConnected = await this.chatRoomUserRepository.findOne({
      where: { userId, roomId }
    })
    if (isConnected) {
      return { message: "이미 대상 채팅방에 접속중인 유저입니다." }
    }
    const connect = await this.chatRoomUserRepository.create({
      userId, roomId
    })
    const saved = await this.chatRoomUserRepository.save(connect);
    return {
      data: saved,
      message: "대상 채팅방에 접속했습니다."
    }
  }

  async leaveChatRoom(userId: number, roomId: string) {
    const userExist = await this.entityLookupService.findOneOrThrow(
      this.userRepository,
      { id: userId },
      "대상 유저가 존재하지 않습니다."
    )
    const roomExist = await this.entityLookupService.findOneOrThrow(
      this.chatRoomRepository,
      { id: roomId },
      "대상 채팅방이 존재하지 않습니다."
    )
    const isConnected = await this.chatRoomUserRepository.findOne({
      where: { userId, roomId }
    })
    if (!isConnected) {
      throw new NotFoundException("대상 채팅방에 접속하지 않은 유저입니다.")
    }
    const disconnect = await this.chatRoomUserRepository.delete({
      userId, roomId
    })
    if (!disconnect || disconnect.affected === 0) {
      throw new InternalServerErrorException("채팅방 나가기에 실패했습니다.")
    }
    return {
      message: "채팅방 나가기에 성공했습니다."
    }
  }

}
