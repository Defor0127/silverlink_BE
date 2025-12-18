import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule,

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
        const isProd = nodeEnv === 'production';

        const host = configService.get<string>('DB_HOST') ?? 'localhost';
        const port = Number(configService.get<string>('DB_PORT') ?? '3306');
        const username = configService.get<string>('DB_USERNAME') ?? 'root';
        const password = configService.get<string>('DB_PASSWORD') ?? '';
        const database = configService.get<string>('DB_NAME') ?? '';

        const entities = [join(__dirname, '/../**/*.entity{.js,.ts}')];
        const migrations = [join(__dirname, '/../migrations/*{.js,.ts}')];

        const dbSsl =
          (configService.get<string>('DB_SSL') ?? (isProd ? 'true' : 'false')) === 'true';

        const base: TypeOrmModuleOptions = {
          type: 'mariadb',
          host,
          port,
          username,
          password,
          database,

          entities,
          migrations,

          // 운영 안전
          synchronize: !isProd,

          // 타입 안전하게 배열로
          logging: isProd ? ['error'] : ['query', 'error', 'schema', 'warn'],

          charset: 'utf8mb4',

          // ✅ 이 둘은 Nest 옵션이라 여기서 가능
          retryAttempts: 10,
          retryDelay: 3000,
        };

        if (dbSsl) {
          return {
            ...base,
            ssl: true,
            extra: {
              ssl: { rejectUnauthorized: false },
            },
          };
        }

        return base;
      },
    }),
  ],
})
export class DatabaseModule {}
