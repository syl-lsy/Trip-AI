import { Module } from '@nestjs/common'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module'
import { DestinationModule } from './destination/destination.module'
import { ItineraryModule } from './itinerary/itinerary.module'
import { AiModule } from './ai/ai.module'

@Module({
  imports: [PrismaModule, AuthModule, UserModule, DestinationModule, ItineraryModule, AiModule],
})
export class AppModule {}
