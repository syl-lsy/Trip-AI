import { Controller, Post, Body, Sse, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Observable } from 'rxjs'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AiService, type UserRequirements, type SSEEvent } from './ai.service'

@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @Sse()
  chat(@Body('message') message: string, @CurrentUser('id') _userId: string) {
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
  plan(@Body() requirements: UserRequirements, @CurrentUser('id') userId: string) {
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
