import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ApiResponse } from '../common/dto/api-response'
import { ItineraryService } from './itinerary.service'
import { CreateItineraryDto } from './dto/create-itinerary.dto'
import { UpdateItineraryDto } from './dto/update-itinerary.dto'

@Controller('itineraries')
@UseGuards(AuthGuard('jwt'))
export class ItineraryController {
  constructor(private readonly itineraryService: ItineraryService) {}

  @Get()
  async findAll(@CurrentUser('id') userId: string) {
    const data = await this.itineraryService.findAll(userId)
    return ApiResponse.ok(data)
  }

  @Post()
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateItineraryDto) {
    const data = await this.itineraryService.create(userId, dto)
    return ApiResponse.ok(data)
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const data = await this.itineraryService.findOne(id, userId)
    return ApiResponse.ok(data)
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateItineraryDto,
  ) {
    const data = await this.itineraryService.update(id, userId, dto)
    return ApiResponse.ok(data)
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.itineraryService.remove(id, userId)
    return ApiResponse.ok(null)
  }
}
