import { ExperimentConfig } from "./types";

export class Poller {
  private configs: Map<string, ExperimentConfig> = new Map();
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private apiHost: string;
  private serverKey: string;
  private pollIntervalMs: number;

  constructor(apiHost: string, serverKey: string, pollIntervalMs: number) {
    this.apiHost = apiHost;
    this.serverKey = serverKey;
    this.pollIntervalMs = pollIntervalMs;
  }

  async fetchConfigs(): Promise<void> {
    const url = `${this.apiHost}/api/ab/experiments/all-configs`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.serverKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as ExperimentConfig[];
    this.configs.clear();
    for (const config of data) {
      this.configs.set(config.id, config);
    }
  }

  private async pollSafely(): Promise<void> {
    try {
      await this.fetchConfigs();
    } catch (err) {
      console.warn(`[ABTestingServer] Error polling configs:`, err);
    }
  }

  getConfig(experimentId: string): ExperimentConfig | undefined {
    return this.configs.get(experimentId);
  }

  start(): void {
    this.intervalHandle = setInterval(() => {
      this.pollSafely();
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }
}
