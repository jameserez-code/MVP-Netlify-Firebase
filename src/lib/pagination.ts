export interface PaginationOptions {
  page?: number
  limit?: number
  filters?: Record<string, unknown>
  sort?: string
  order?: 'asc' | 'desc'
}

export function parsePaginationQuery(query: Record<string, unknown>): PaginationOptions {
  return {
    page: query.page ? parseInt(String(query.page), 10) : 1,
    limit: query.limit ? parseInt(String(query.limit), 10) : 50,
    filters: query.filters as Record<string, unknown> || {},
    sort: query.sort as string || 'createdAt',
    order: (query.order as 'asc' | 'desc') || 'desc',
  }
}

export function paginate(data: any[], options: PaginationOptions) {
  const page = options.page || 1
  const limit = options.limit || 50
  const total = data.length
  const start = (page - 1) * limit
  const paged = data.slice(start, start + limit)
  return {
    data: paged,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}
