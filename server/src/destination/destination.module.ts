import { Module } from '@nestjs/common'
import { DestinationController } from './destination.controller'
import { DestinationService } from './destination.service'

@Module({
  controllers: [DestinationController],
  providers: [DestinationService],
})
export class DestinationModule {}
