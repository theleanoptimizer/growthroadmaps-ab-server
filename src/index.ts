import { SDKConfig, GetVariantOptions, TrackOptions } from "./types";
import { assignVariant } from "./hasher";
import { Poller } from "./poller";
import { EventQueue } from "./queue";

export { fnv1a, assignVariant } from "./hasher";
export * from "./types";

export class ABTestingServer {
  private serverKey: string;
  private apiHost: string;
  private pollInterval: number;
  private flushInterval: number;
  private maxQueueSize: number;
  private poller: Poller;
  private queue: EventQueue;

  constructor(config: SDKConfig) {
    this.serverKey = config.serverKey;
    this.apiHost = config.apiHost.replace(/\/+$/, "");
    this.pollInterval = (config.pollInterval ?? 30) * 1000;
    this.flushInterval = (config.flushInterval ?? 5) * 1000;
    this.maxQueueSize = config.maxQueueSize ?? 100;

    this.poller = new Poller(this.apiHost, this.serverKey, this.pollInterval);
    this.queue = new EventQueue(
      this.apiHost,
      this.serverKey,
      this.flushInterval,
      this.maxQueueSize
    );
  }

  async connect(): Promise<void> {
    let success = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.poller.fetchConfigs();
        success = true;
        break;
      } catch {
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    if (!success) {
      console.warn(
        "[ABTestingServer] Failed to fetch initial configs after 3 attempts. Continuing without configs."
      );
    }

    this.poller.start();
    this.queue.start();
  }

  getVariant(options: GetVariantOptions): string {
    const { experimentId, userId, sessionId, fallback } = options;

    const identifier = userId ?? sessionId;
    if (!identifier) return fallback;

    const config = this.poller.getConfig(experimentId);
    if (!config) return fallback;
    if (config.status !== "running") return fallback;
    if (!config.variants || config.variants.length === 0) return fallback;

    const variant = assignVariant(experimentId, identifier, config.variants);

    this.queue.add({
      type: "exposure",
      experimentId,
      variantId: variant.id,
      userId,
      sessionId,
      timestamp: Date.now(),
    });

    return variant.name;
  }

  track(options: TrackOptions): void {
    this.queue.add({
      type: "conversion",
      experimentId: options.experimentId,
      userId: options.userId,
      sessionId: options.sessionId,
      goalName: options.goalName,
      goalValue: options.goalValue,
      metadata: options.metadata,
      timestamp: Date.now(),
    });
  }

  async close(): Promise<void> {
    this.poller.stop();
    this.queue.stop();

    const drainPromise = this.queue.drain();
    const timeoutPromise = new Promise<void>((resolve) =>
      setTimeout(resolve, 5000)
    );

    await Promise.race([drainPromise, timeoutPromise]);
  }
}
