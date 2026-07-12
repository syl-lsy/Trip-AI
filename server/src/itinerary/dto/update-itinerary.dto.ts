import { PartialType } from '@nestjs/mapped-types'
import { IsOptional, IsEnum, IsObject } from 'class-validator'
import { CreateItineraryDto } from './create-itinerary.dto'

enum TripStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export class UpdateItineraryDto extends PartialType(CreateItineraryDto) {
  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus

  @IsOptional()
  kidFriendly?: number

  @IsOptional()
  @IsObject()
  itineraryJson?: object
}
