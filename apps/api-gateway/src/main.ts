import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);
  const configService = app.get(ConfigService);

  //Todo: Fix this
  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     whitelist: true,
  //     forbidNonWhitelisted: true,
  //     transform: true,
  //   }),
  // );

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors();

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('NestJS Ecommerce Microservices API')
    .setDescription(
      'API Gateway cho hệ thống Ecommerce Microservices. ' +
      'API này cung cấp các endpoints để quản lý đơn hàng, khách hàng và tồn kho. ' +
      'Sử dụng RabbitMQ để giao tiếp giữa các microservices.'
    )
    .setVersion('1.0')
    .addTag('Orders', 'Quản lý đơn hàng')
    .addTag('Health', 'Kiểm tra trạng thái hệ thống')
    .addServer('http://localhost:3000', 'Development Server')
    .addServer('https://api.example.com', 'Production Server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Ecommerce API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);

  console.log(`🚀 API Gateway is running on: http://localhost:${port}`);
  console.log(`📚 Swagger Documentation: http://localhost:${port}/api-docs`);
}

bootstrap();
