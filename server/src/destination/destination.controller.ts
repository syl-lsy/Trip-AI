import { Controller, Get, Post, Param, Body } from '@nestjs/common'
import { DestinationService } from './destination.service'
import { CreateDestinationDto } from './dto/create-destination.dto'
import { ROUTES } from '@trip/shared'

@Controller(ROUTES.DESTINATIONS)
export class DestinationController {
  constructor(private readonly destinationService: DestinationService) {}

  @Get()
  async findAll() {
    return this.destinationService.findAll()
  }

  @Post()
  async create(@Body() dto: CreateDestinationDto) {
    return this.destinationService.create(dto)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.destinationService.findOne(id)
  }
}
