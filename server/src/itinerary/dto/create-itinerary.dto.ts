import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator'

export class CreateItineraryDto {
  @IsString()
  title!: string

  @IsString()
  destination!: string

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsNumber()
  adults?: number

  @IsOptional()
  @IsNumber()
  children?: number

  @IsOptional()
  @IsNumber()
  childAge?: number

  @IsOptional()
  @IsString()
  pace?: string

  @IsOptional()
  @IsNumber()
  budget?: number
}
