import { BadRequestException } from '@nestjs/common';
import {
  getDefaultDashboardLayoutConfig,
  validateDashboardLayoutConfig,
} from './dashboard-layout.contract';

describe('dashboard-layout.contract', () => {
  it('returns default layout when omitted', () => {
    expect(validateDashboardLayoutConfig(undefined)).toEqual(
      getDefaultDashboardLayoutConfig(),
    );
  });

  it('accepts strict v1 layout payload', () => {
    const result = validateDashboardLayoutConfig({
      version: 1,
      grid: { columns: 12, rowHeight: 32 },
      widgets: [
        {
          id: 'd89f896f-4c96-4f72-bbb3-8f7661a8f3ef',
          type: 'kpi_cards',
          title: 'KPIs',
          layout: { x: 0, y: 0, w: 4, h: 3 },
          config: { key: 'value', threshold: 3, enabled: true, nullable: null },
          dataSource: { kind: 'kpi_cards', metricKey: 'burnup' },
        },
      ],
    });

    expect(result.version).toBe(1);
    expect(result.grid.columns).toBe(12);
    expect(result.widgets).toHaveLength(1);
  });

  it('rejects payloads without versioned contract', () => {
    expect(() =>
      validateDashboardLayoutConfig({
        widgets: [],
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects unsupported widget type', () => {
    expect(() =>
      validateDashboardLayoutConfig({
        version: 1,
        grid: { columns: 12, rowHeight: 32 },
        widgets: [
          {
            id: 'd89f896f-4c96-4f72-bbb3-8f7661a8f3ef',
            type: 'custom_widget',
            title: 'Custom',
            layout: { x: 0, y: 0, w: 4, h: 3 },
            config: {},
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });
});
