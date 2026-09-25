export const HEALTH_PATHS = {
  live: "/api/v1/health/live",
  ready: "/api/v1/health/ready"
} as const;

export interface LivenessResponse {
  status: "alive";
  service: "api";
  checkedAt: string;
}

export interface ReadinessResponse {
  status: "ready" | "unavailable";
  service: "api";
  dependencies: {
    database: "ready" | "unavailable";
  };
  checkedAt: string;
}
