import { IsPhoneNumber } from 'class-validator'

export class SendCodeDto {
  @IsPhoneNumber('CN')
  phone!: string
}
