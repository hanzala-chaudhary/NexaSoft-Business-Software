import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Vercel/frontend ko API call karne ki permission
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  // Ye zaroori hai - warna DTO validation (name required, price number, etc) kaam nahi karegi
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // Body mein jo fields DTO mein define nahi, unhe automatically hata deta hai
      forbidNonWhitelisted: false,
      transform: true,        // "10" string ko 10 number mein auto-convert karta hai
      exceptionFactory: (errors) => {
        const messages = errors.map((err) =>
          Object.values(err.constraints || {}).join(', '),
        );
        return { statusCode: 400, message: messages.join(' | '), error: 'Bad Request' };
      },
    }),
  );

  await app.listen(process.env.PORT || 4000);
  console.log(`🚀 Server running on port ${process.env.PORT || 4000}`);
}
bootstrap();