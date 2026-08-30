import { createDatabaseConfig } from './database.config.js';

describe('createDatabaseConfig', () => {
  it('builds postgres connection options from ConfigService values loaded from .env', () => {
    const configService = {
      get: vi.fn((key: string, defaultValue?: string | number) => {
        const values: Record<string, string> = {
          DB_HOST: 'db.example.internal',
          DB_PORT: '15432',
          DB_USERNAME: 'corp_user',
          DB_PASSWORD: 'secret',
          DB_DATABASE: 'corp_summary',
          DB_SSL: 'true',
        };

        return values[key] ?? defaultValue;
      }),
    };

    expect(createDatabaseConfig(configService)).toMatchObject({
      type: 'postgres',
      host: 'db.example.internal',
      port: 15432,
      username: 'corp_user',
      password: 'secret',
      database: 'corp_summary',
      ssl: { rejectUnauthorized: false },
      synchronize: false,
      autoLoadEntities: true,
    });
  });
});
