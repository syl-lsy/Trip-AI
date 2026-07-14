import { Controller, Post, Body, Sse, UseGuards, BadRequestException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Observable } from 'rxjs'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AiService, type SSEEvent } from './ai.service'
import { PlanRequirementsDto } from './dto/plan-requirements.dto'

@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @Sse()
  chat(@Body('message') message: string, @CurrentUser('id') _userId: string) {
    if (!message || typeof message !== 'string') {
      throw new BadRequestException('message is required')
    }
    return new Observable<{ data: string }>((subscriber) => {
      this.aiService
        .chat(message, (event: SSEEvent) => {
          subscriber.next({ data: JSON.stringify(event) })
        })
        .then(() => subscriber.complete())
        .catch((err) => subscriber.error(err))
    })
  }

  @Post('plan')
  @Sse()
  plan(@Body() requirements: PlanRequirementsDto, @CurrentUser('id') userId: string) {
    return new Observable<{ data: string }>((subscriber) => {
      this.aiService
        .plan(requirements, userId, (event: SSEEvent) => {
          subscriber.next({ data: JSON.stringify(event) })
        })
        .then(() => subscriber.complete())
        .catch((err) => subscriber.error(err))
    })
  }

  @Post('modify')
  @Sse()
  modify(
    @Body('planId') planId: string,
    @Body('request') request: string,
    @CurrentUser('id') userId: string,
  ) {
    if (!planId || typeof planId !== 'string') {
      throw new BadRequestException('planId is required')
    }
    if (!request || typeof request !== 'string') {
      throw new BadRequestException('request is required')
    }
    return new Observable<{ data: string }>((subscriber) => {
      this.aiService
        .modify(planId, request, userId, (event: SSEEvent) => {
          subscriber.next({ data: JSON.stringify(event) })
        })
        .then(() => subscriber.complete())
        .catch((err) => subscriber.error(err))
    })
  }
}
