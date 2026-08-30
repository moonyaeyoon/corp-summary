import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

type ConfigReader = Pick<ConfigService, 'get'>;

export function createDatabaseConfig(configService: ConfigReader): TypeOrmModuleOptions {
  const sslEnabled = configService.get<string>('DB_SSL', 'false') === 'true';

  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: Number(configService.get<string | number>('DB_PORT', 5432)),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'postgres'),
    database: configService.get<string>('DB_DATABASE', 'corp_summary'),
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    autoLoadEntities: true,
    synchronize: configService.get<string>('DB_SYNC', 'false') === 'true',
  };
}
