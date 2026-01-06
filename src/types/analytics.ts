export type KeyVariant = "pure" | "random" | "hybrid";

export interface SimulationMetricSet {
  pure: number[];
  random: number[];
  hybrid: number[];
}

export interface ComponentScores {
  entropy: number;
  collision: number;
  ber_low: number;
  sir_avg: number;
  autocorr: number;
  crosscorr: number;
  uniformity: number;
}

export interface SecurityScore {
  score: number;
  label: "Poor" | "Fair" | "Good" | "Excellent";
  component_scores: ComponentScores;
}

export interface SecurityResults {
  pure: SecurityScore;
  random: SecurityScore;
  hybrid: SecurityScore;
}

export interface HeatmapData {
  pure: number[][];
  random: number[][];
  hybrid: number[][];
  channels: number;
  grid_size: number;
}

export interface SimulationResults {
  snr_db: number[];
  ber: SimulationMetricSet;
  collision_prob: SimulationMetricSet;
  consecutive_prob: SimulationMetricSet;
  sir: SimulationMetricSet;
  security: SecurityResults;
  heatmap: HeatmapData;
  sequences?: {
    pure: number[];
    random: number[];
    hybrid: number[];
    hybrid_raw?: number[];
  };
}

export interface StoredAnalytics {
  generatedAt: string;
  request: {
    symmetry: string;
    randomness: number;
    gridSize: number;
    seed: number;
    mod: number;
    bitsPerCell: number;
    minHops: number;
  };
  results: SimulationResults;
}

export const ANALYTICS_STORAGE_KEY = "kolamAnalytics";

export type AnalyticsUpdatedEvent = CustomEvent<StoredAnalytics>;

declare global {
  interface WindowEventMap {
    "kolam-analytics-updated": AnalyticsUpdatedEvent;
  }
}
