import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateDestinationDto } from './dto/create-destination.dto'
import { ApiResponse } from '../common/dto/api-response'

@Injectable()
export class DestinationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const destinations = await this.prisma.destination.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return ApiResponse.ok(destinations)
  }

  async findOne(id: string) {
    const destination = await this.prisma.destination.findUnique({ where: { id } })
    if (!destination) {
      return ApiResponse.fail('目的地不存在')
    }
    return ApiResponse.ok(destination)
  }

  async create(dto: CreateDestinationDto) {
    const destination = await this.prisma.destination.create({ data: dto })
    return ApiResponse.ok(destination)
  }
}
