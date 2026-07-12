import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { SendCodeDto } from './dto/send-code.dto'
import { LoginDto } from './dto/login.dto'
import { AuthGuard } from '@nestjs/passport'
import { ApiResponse } from '../common/dto/api-response'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-code')
  async sendCode(@Body() dto: SendCodeDto) {
    await this.authService.sendCode(dto.phone)
    return ApiResponse.ok(null)
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto.phone, dto.code)
    return ApiResponse.ok(result)
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@CurrentUser('id') userId: string) {
    const user = await this.authService.getProfile(userId)
    return ApiResponse.ok(user)
  }
}
