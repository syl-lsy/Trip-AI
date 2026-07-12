import { IsPhoneNumber, IsString, Length } from 'class-validator'

export class LoginDto {
  @IsPhoneNumber('CN')
  phone!: string

  @IsString()
  @Length(4, 20)
  code!: string
}
