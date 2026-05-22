declare module 'bull' {
  export class Job<T = any> {
    id: string | number | undefined
    data: T
    progress(value: number): Promise<void>
  }

  class Queue<T = any> {
    constructor(name: string, redisUrl?: string, opts?: any)
    on(event: string, handler: (...args: any[]) => void): this
    add(data: T, opts?: any): Promise<Job<T>>
    add(name: string, data: T, opts?: any): Promise<Job<T>>
    process(handler: (job: Job<T>) => Promise<any>): void
    process(name: string, handler: (job: Job<T>) => Promise<any>): void
    process(concurrency: number, handler: (job: Job<T>) => Promise<any>): void
    process(name: string, concurrency: number, handler: (job: Job<T>) => Promise<any>): void
    getJobCounts(): Promise<Record<string, number>>
    close(): Promise<void>
  }
  export default Queue
}
