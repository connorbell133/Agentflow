export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
  };
}

export const paginateQuery = async <T>(
  query: any,
  countQuery: any,
  params: PaginationParams
): Promise<PaginatedResponse<T>> => {
  const { page, limit } = params;
  const offset = (page - 1) * limit;

  const [dataResult, countResult] = await Promise.all([
    query
      .range(offset, offset + limit - 1)
      .limit(limit),
    countQuery.select('*', { count: 'exact', head: true })
  ]);

  if (dataResult.error) throw dataResult.error;
  if (countResult.error) throw countResult.error;

  const total = countResult.count || 0;
  const hasMore = offset + limit < total;
  const totalPages = Math.ceil(total / limit);

  return {
    data: dataResult.data || [],
    pagination: {
      page,
      limit,
      total,
      hasMore,
      totalPages,
    },
  };
};

// Helper for cursor-based pagination (better for real-time data)
export interface CursorPaginationParams {
  limit: number;
  cursor?: string; // timestamp or id for cursor
  direction?: 'before' | 'after';
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

export const cursorPaginateQuery = async <T extends Record<string, any>>(
  query: any,
  params: CursorPaginationParams,
  cursorField: string = 'created_at'
): Promise<CursorPaginatedResponse<T>> => {
  const { limit, cursor, direction = 'after' } = params;

  let paginatedQuery = query.limit(limit + 1); // Get one extra to check if there are more

  if (cursor) {
    if (direction === 'after') {
      paginatedQuery = paginatedQuery.gt(cursorField, cursor);
    } else {
      paginatedQuery = paginatedQuery.lt(cursorField, cursor);
    }
  }

  const { data, error } = await paginatedQuery;

  if (error) throw error;

  const items = data || [];
  const hasMore = items.length > limit;
  
  // Remove the extra item if we have more than limit
  if (hasMore) {
    items.pop();
  }

  const nextCursor = hasMore && items.length > 0 
    ? items[items.length - 1][cursorField] 
    : undefined;
  
  const prevCursor = items.length > 0 
    ? items[0][cursorField] 
    : undefined;

  return {
    data: items,
    pagination: {
      limit,
      hasMore,
      nextCursor,
      prevCursor,
    },
  };
};