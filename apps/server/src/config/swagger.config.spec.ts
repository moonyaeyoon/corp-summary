import { describe, expect, it } from 'vitest';
import { createSwaggerConfig } from './swagger.config.js';

describe('createSwaggerConfig', () => {
  it('does not add a /v1 server because the global prefix already handles it', () => {
    const config = createSwaggerConfig();

    expect(config.servers).not.toContainEqual({ url: '/v1' });
  });
});
