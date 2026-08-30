export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;

export interface PaginationQuery {
  limit?: string | number;
  cursor?: string;
}

export interface NormalizedPagination {
  limit: number;
  cursor?: string;
}

export interface CursorPage<T> {
  items: T[];
  page: {
    limit: number;
    nextCursor: string | null;
  };
}

export function parsePaginationQuery(query: PaginationQuery): NormalizedPagination {
  const requestedLimit = Number(query.limit ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  return {
    limit,
    cursor: query.cursor,
  };
}

export function buildCursorPage<T>(
  rows: T[],
  limit: number,
  getCursor: (item: T) => string,
): CursorPage<T> {
  const items = rows.slice(0, limit);
  const hasNextPage = rows.length > limit;
  const lastItem = items.at(-1);

  return {
    items,
    page: {
      limit,
      nextCursor: hasNextPage && lastItem ? getCursor(lastItem) : null,
    },
  };
}
