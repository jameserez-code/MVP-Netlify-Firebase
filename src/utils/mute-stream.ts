import { Writable } from 'stream'

export class MuteStream extends Writable {
  muted: boolean = false

  _write(chunk: any, encoding: string, callback: (error?: Error | null) => void): void {
    if (!this.muted) {
      process.stdout.write(chunk, encoding)
    }
    callback()
  }
}
