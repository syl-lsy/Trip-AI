import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import { ERROR_MSG } from '@trip/shared'

const PRESET_CODES: Record<string, { code: string; nickname?: string }> = {
  '15250092360': { code: '123456', nickname: '亲子用户1' },
  '15370980317': { code: '123456', nickname: '亲子用户2' },
  '13900139000': { code: 'admin666', nickname: '运营管理员' },
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async sendCode(phone: string): Promise<void> {
    if (!PRESET_CODES[phone]) {
      return
    }
  }

  async login(phone: string, code: string) {
    const preset = PRESET_CODES[phone]
    if (!preset || preset.code !== code) {
      throw new UnauthorizedException(ERROR_MSG.UNAUTHORIZED)
    }

    let user = await this.prisma.user.findUnique({ where: { phone } })
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone, nickname: preset.nickname ?? phone },
      })
    }

    const payload = { sub: user.id, phone: user.phone }
    const token = await this.jwtService.signAsync(payload)

    return {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        role: user.role,
      },
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, nickname: true, role: true, createdAt: true },
    })
    if (!user) {
      throw new UnauthorizedException(ERROR_MSG.UNAUTHORIZED)
    }
    return user
  }
}
