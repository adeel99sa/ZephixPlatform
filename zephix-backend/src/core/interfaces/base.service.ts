export interface IBaseService<T> {
  isAvailable(): boolean;
  getHealth(): Promise<HealthStatus>;
  getStatus(): ServiceStatus;
}

export enum ServiceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded', 
  UNAVAILABLE = 'unavailable',
  INITIALIZING = 'initializing'
}

export interface HealthStatus {
  status: ServiceStatus;
  message?: string;
  error?: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  responseTime?: number;
  lastCheck: string;
  error?: string;
}

export interface ApplicationHealth {
  status: ServiceStatus;
  services: Record<string, ServiceHealth>;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}
