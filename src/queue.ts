import { QueueEvent } from "./types";

export class EventQueue {
  private queue: QueueEvent[] = [];
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private apiHost: string;
  private serverKey: string;
  private flushIntervalMs: number;
  private maxQueueSize: number;
  private flushPromise: Promise<void> | null = null;

  constructor(
    apiHost: string,
    serverKey: string,
    flushIntervalMs: number,
    maxQueueSize: number
  ) {
    this.apiHost = apiHost;
    this.serverKey = serverKey;
    this.flushIntervalMs = flushIntervalMs;
    this.maxQueueSize = maxQueueSize;
  }

  add(event: QueueEvent): void {
    this.queue.push(event);
    if (this.queue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  start(): void {
    this.intervalHandle = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  stop(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async flush(): Promise<void> {
    if (this.flushPromise) {
      await this.flushPromise;
    }

    if (this.queue.length === 0) return;

    const events = this.queue.splice(0);
    this.flushPromise = this.doFlush(events);

    try {
      await this.flushPromise;
    } finally {
      this.flushPromise = null;
    }
  }

  async drain(): Promise<void> {
    if (this.flushPromise) {
      await this.flushPromise;
    }
    if (this.queue.length > 0) {
      await this.flush();
    }
  }

  private async doFlush(events: QueueEvent[]): Promise<void> {
    try {
      await this.sendEvents(events);
    } catch {
      try {
        await this.sendEvents(events);
      } catch {
        console.warn(
          `[ABTestingServer] Failed to flush ${events.length} events after retry, discarding.`
        );
      }
    }
  }

  private async sendEvents(events: QueueEvent[]): Promise<void> {
    const url = `${this.apiHost}/api/ab/events/batch`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.serverKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ events }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
  }
}
