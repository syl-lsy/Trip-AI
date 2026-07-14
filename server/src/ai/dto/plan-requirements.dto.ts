import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator'

export class PlanRequirementsDto {
  @IsString()
  destination!: string

  @IsOptional()
  @IsString()
  origin?: string

  @IsString()
  startDate!: string

  @IsString()
  endDate!: string

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
  @IsIn(['relaxed', 'moderate', 'intense'])
  pace?: 'relaxed' | 'moderate' | 'intense'

  @IsOptional()
  @IsNumber()
  budget?: number
}
