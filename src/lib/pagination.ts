// Pagination, sorting, and filtering utilities for list endpoints

export interface PaginationOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: Record<string, string | undefined>
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export function paginate<T extends Record<string, any>>(
  collection: T[],
  options: PaginationOptions = {},
): PaginatedResult<T> {
  const page = Math.max(1, Math.floor(options.page || 1))
  const limit = Math.max(1, Math.min(100, Math.floor(options.limit || 20)))
  const sortBy = options.sortBy
  const sortOrder = options.sortOrder === 'asc' ? 'asc' : 'desc'
  const filters = options.filters || {}

  // Apply filters
  let data = collection
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === '') continue
    data = data.filter((item) => {
      const itemValue = item[key]
      if (typeof itemValue === 'string') {
        return itemValue.toLowerCase() === value.toLowerCase()
      }
      return String(itemValue) === value
    })
  }

  // Apply sorting
  if (sortBy) {
    data = [...data].sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]
      if (aVal === undefined || bVal === undefined) return 0
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }
      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1
      if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }

  const total = data.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const start = (page - 1) * limit
  const paginated = data.slice(start, start + limit)

  return {
    data: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}

// Parse query params for pagination from Fastify request query object
export function parsePaginationQuery(query: Record<string, unknown>): PaginationOptions {
  return {
    page: query.page ? parseInt(String(query.page), 10) : undefined,
    limit: query.limit ? parseInt(String(query.limit), 10) : undefined,
    sortBy: query.sort ? String(query.sort) : undefined,
    sortOrder: query.order === 'asc' || query.order === 'desc' ? query.order : undefined,
    filters: query.filters as Record<string, string | undefined> || undefined,
  }
}
