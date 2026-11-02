import type { Response } from 'express';
import { AppError } from './errors.js';
/** Observer: clients receive invalidation only, never appointment or patient data. */
export class EventBus {
  private clients = new Set<Response>();
  subscribe(res: Response) {
    if (this.clients.size >= 500) throw new AppError(503, 'EVENT_CAPACITY', 'נסו שוב מאוחר יותר');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    this.clients.add(res);
    res.write(': connected\n\n');
    const timer = setInterval(() => res.write(': heartbeat\n\n'), 20000);
    timer.unref();
    res.on('close', () => {
      clearInterval(timer);
      this.clients.delete(res);
    });
  }
  publish() {
    for (const client of this.clients) {
      try {
        client.write(`data: ${JSON.stringify({ type: 'appointments.updated' })}\n\n`);
      } catch {
        this.clients.delete(client);
      }
    }
  }
}
