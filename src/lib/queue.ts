class StubQueue {
  async add(_name: string, _data: unknown, _options?: unknown): Promise<void> {}
  async process(_name: string, _fn: Function): Promise<void> {}
  async getJobCounts(): Promise<Record<string, number>> { return { waiting: 0, active: 0, completed: 0, failed: 0 } }
}

export const webhookQueue = new StubQueue()
export const emailQueue = new StubQueue()
export const webhookCleanupQueue = new StubQueue()
export const deadLetterQueue = new StubQueue()
