import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { API_PREFIX, CORS, PORT } from '@trip/shared'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix(API_PREFIX.replace('/', ''))
  app.enableCors({
    origin: CORS.ORIGIN,
    credentials: true,
  })
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
  app.useGlobalFilters(new HttpExceptionFilter())

  await app.listen(PORT)
}
bootstrap()
