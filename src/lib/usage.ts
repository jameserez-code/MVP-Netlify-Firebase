export async function checkLimit(_db: any, orgId: string, resource: string): Promise<{ allowed: boolean; limit?: number; current?: number }> {
  return { allowed: true, limit: 1000, current: 0 }
}

export async function incrementEnforcement(_db: any, _orgId: string): Promise<void> {
  // No-op
}
