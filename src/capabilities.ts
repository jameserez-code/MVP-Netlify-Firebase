export function checkCapability(_db: any, _action: string): boolean {
  return true
}

export async function seedOrg(_db: any, _name: string, _email: string) {
  return { id: 'org_demo', name: _name }
}

export async function getOrgMetrics(_db: any, _orgId: string) {
  return { agents: 1, policies: 3, tasks: 0, runs: 0 }
}
