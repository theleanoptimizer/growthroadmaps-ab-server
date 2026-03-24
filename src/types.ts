export interface Variant {
  id: string;
  name: string;
  weight: number;
}

export interface ExperimentConfig {
  id: string;
  name: string;
  status: string;
  variants: Variant[];
}

export interface SDKConfig {
  serverKey: string;
  apiHost: string;
  pollInterval?: number;
  flushInterval?: number;
  maxQueueSize?: number;
}

export interface GetVariantOptions {
  experimentId: string;
  userId?: string;
  sessionId?: string;
  fallback: string;
}

export interface TrackOptions {
  experimentId: string;
  userId?: string;
  sessionId?: string;
  goalName: string;
  goalValue?: number;
  metadata?: Record<string, unknown>;
}

export interface ExposureEvent {
  type: "exposure";
  experimentId: string;
  variantId: string;
  userId?: string;
  sessionId?: string;
  timestamp: number;
}

export interface ConversionEvent {
  type: "conversion";
  experimentId: string;
  userId?: string;
  sessionId?: string;
  goalName: string;
  goalValue?: number;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export type QueueEvent = ExposureEvent | ConversionEvent;
