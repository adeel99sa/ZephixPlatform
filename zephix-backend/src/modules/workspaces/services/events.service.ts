import { Injectable, Logger, Optional } from '@nestjs/common';
import { TelemetryService } from '../../../observability/telemetry.service';
import { MetricsService } from '../../../observability/metrics.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @Optional() private telemetryService?: TelemetryService,
    @Optional() private metricsService?: MetricsService,
  ) {}

  async track(event: string, data: Record<string, any>): Promise<void> {
    // Ensure required fields are present
    const enrichedData = {
      ...data,
      timestamp: new Date().toISOString(),
      event,
    };

    // Structured logging
    this.logger.log(`[Telemetry] ${event}`, enrichedData);

    // Send to OpenTelemetry if available
    if (this.telemetryService) {
      try {
        await this.telemetryService.traceFunction(
          `event.${event}`,
          async () => {
            this.telemetryService?.addSpanAttributes({
              'event.name': event,
              ...Object.fromEntries(
                Object.entries(enrichedData).map(([k, v]) => [
                  `event.${k}`,
                  typeof v === 'object' ? JSON.stringify(v) : v,
                ]),
              ),
            });
          },
          enrichedData,
        );
      } catch (error) {
        this.logger.warn(`Failed to send telemetry for ${event}:`, error);
      }
    }

    // Increment metrics if available
    if (this.metricsService) {
      try {
        // Track workspace events
        if (event.startsWith('workspace.')) {
          // MetricsService uses httpRequestsTotal, errorsTotal, etc.
          // For custom events, we log them and they'll be picked up by telemetry
          this.logger.debug(`Workspace event tracked: ${event}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to update metrics for ${event}:`, error);
      }
    }

    // In production, also send to analytics service (e.g., Mixpanel, Amplitude)
    // Example: await this.analyticsService.track(event, enrichedData);
  }
}
