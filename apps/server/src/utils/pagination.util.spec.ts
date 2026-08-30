import { buildCursorPage, parsePaginationQuery } from './pagination.util.js';

describe('pagination util', () => {
  it('normalizes missing and excessive limits', () => {
    expect(parsePaginationQuery({}).limit).toBe(50);
    expect(parsePaginationQuery({ limit: '500' }).limit).toBe(100);
  });

  it('fetches one extra row to compute the next cursor', () => {
    const page = buildCursorPage(
      [
        { id: 'a' },
        { id: 'b' },
        { id: 'c' },
      ],
      2,
      (item) => item.id,
    );

    expect(page).toEqual({
      items: [{ id: 'a' }, { id: 'b' }],
      page: {
        limit: 2,
        nextCursor: 'b',
      },
    });
  });
});
