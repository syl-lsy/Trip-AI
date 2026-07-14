import { Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateItineraryDto } from './dto/create-itinerary.dto'
import { UpdateItineraryDto } from './dto/update-itinerary.dto'

@Injectable()
export class ItineraryService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.itinerary.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async findOne(id: string, userId: string) {
    const itinerary = await this.prisma.itinerary.findFirst({
      where: { id, userId },
    })
    if (!itinerary) {
      throw new NotFoundException('Itinerary not found')
    }
    return itinerary
  }

  async create(userId: string, dto: CreateItineraryDto) {
    const data: Prisma.ItineraryCreateInput = {
      title: dto.title,
      destination: dto.destination,
      user: { connect: { id: userId } },
      ...(dto.startDate && { startDate: new Date(dto.startDate) }),
      ...(dto.endDate && { endDate: new Date(dto.endDate) }),
      ...(dto.adults !== undefined && { adults: dto.adults }),
      ...(dto.children !== undefined && { children: dto.children }),
      ...(dto.childAge !== undefined && { childAge: dto.childAge }),
      ...(dto.pace && { pace: dto.pace }),
      ...(dto.budget !== undefined && { budget: dto.budget }),
      ...(dto.itineraryJson !== undefined && {
        itineraryJson: dto.itineraryJson as Prisma.InputJsonValue,
      }),
    }
    return this.prisma.itinerary.create({ data })
  }

  async update(id: string, userId: string, dto: UpdateItineraryDto) {
    await this.findOne(id, userId)
    const data: Prisma.ItineraryUpdateInput = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.destination !== undefined && { destination: dto.destination }),
      ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate) }),
      ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
      ...(dto.adults !== undefined && { adults: dto.adults }),
      ...(dto.children !== undefined && { children: dto.children }),
      ...(dto.childAge !== undefined && { childAge: dto.childAge }),
      ...(dto.pace !== undefined && { pace: dto.pace }),
      ...(dto.budget !== undefined && { budget: dto.budget }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.kidFriendly !== undefined && { kidFriendly: dto.kidFriendly }),
      ...(dto.itineraryJson !== undefined && {
        itineraryJson: dto.itineraryJson as Prisma.InputJsonValue,
      }),
    }
    return this.prisma.itinerary.update({ where: { id }, data })
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId)
    return this.prisma.itinerary.delete({ where: { id } })
  }
}
