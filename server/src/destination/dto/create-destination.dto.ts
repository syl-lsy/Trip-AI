import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, Min, Max } from 'class-validator'

export class CreateDestinationDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsString()
  @IsOptional()
  englishName?: string

  @IsString()
  @IsNotEmpty()
  emoji!: string

  @IsString()
  @IsNotEmpty()
  region!: string

  @IsString()
  @IsNotEmpty()
  bestSeason!: string

  @IsNumber()
  @Min(0)
  @Max(5)
  kidFriendly!: number

  @IsArray()
  @IsString({ each: true })
  tags!: string[]

  @IsArray()
  @IsString({ each: true })
  seasonTags!: string[]

  @IsString()
  @IsNotEmpty()
  ageRange!: string
}
