/**
 * Resource Timeline Types
 * Types for Resource Intelligence timeline and heatmap APIs
 */

export type TimelineClassification = 'NONE' | 'WARNING' | 'CRITICAL';

export interface ResourceTimelinePoint {
  date: string;
  capacityPercent: number;
  hardLoadPercent: number;
  softLoadPercent: number;
  warningThreshold: number;
  criticalThreshold: number;
  hardCap: number;
  classification: TimelineClassification;
}

export interface HeatmapCell {
  resourceId: string;
  date: string;
  capacityPercent: number;
  hardLoadPercent: number;
  softLoadPercent: number;
  classification: TimelineClassification;
  justification?: string; // Optional: justification if allocation has one
}

export interface HeatmapResourceRow {
  resourceId: string;
  displayName: string;
  role?: string;
}

export interface HeatmapResponse {
  resources: HeatmapResourceRow[];
  dates: string[];
  cells: HeatmapCell[];
}

/**
 * Backend API response shape for timeline endpoint
 */
export interface TimelineApiResponse {
  data: ResourceTimelinePoint[];
}

/**
 * Backend API response shape for heatmap endpoint
 * Returns array of { date, resources: [...] }
 */
export interface HeatmapApiResponse {
  data: Array<{
    date: string;
    resources: Array<{
      resourceId: string;
      resourceName: string;
      hardLoad: number;
      softLoad: number;
      classification: TimelineClassification;
    }>;
  }>;
}





