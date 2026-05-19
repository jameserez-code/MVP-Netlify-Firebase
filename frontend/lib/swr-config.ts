import { SWRConfiguration } from 'swr'

export const swrConfig: SWRConfiguration = {
  refreshInterval: 10000,
  revalidateOnFocus: true,
  errorRetryCount: 3,
  dedupingInterval: 2000,
}

export const swrDashboardConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 10000,
}

export const swrActivityConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 5000,
}
