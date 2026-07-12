import { Controller, Get, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { PrismaService } from '../prisma/prisma.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ApiResponse } from '../common/dto/api-response'

@Controller('user')
export class UserController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('profile-detail')
  @UseGuards(AuthGuard('jwt'))
  async getProfileDetail(@CurrentUser('id') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, nickname: true },
    })
    return ApiResponse.ok(user)
  }
}
