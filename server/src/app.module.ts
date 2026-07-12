import { Module } from '@nestjs/common'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { DestinationModule } from './destination/destination.module'

@Module({
  imports: [PrismaModule, AuthModule, UserModule, DestinationModule],
})
export class AppModule {}
