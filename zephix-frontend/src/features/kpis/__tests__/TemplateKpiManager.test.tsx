import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateKpiManager } from '../components/TemplateKpiManager';

const mockDefinitions = [
  {
    id: 'def-1',
    code: 'velocity',
    name: 'Velocity',
    description: 'Sprint velocity',
    category: 'DELIVERY',
    unit: 'points',
    lifecyclePhase: 'EXECUTION',
    formulaType: 'AGGREGATE',
    dataSources: ['sprints', 'tasks'],
    requiredGovernanceFlag: 'iterationsEnabled',
    isLeading: false,
    isLagging: true,
    defaultEnabled: false,
    calculationStrategy: 'velocity',
    isSystem: true,
    organizationId: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'def-2',
    code: 'wip',
    name: 'Work in Progress',
    description: 'WIP count',
    category: 'DELIVERY',
    unit: 'items',
    lifecyclePhase: 'EXECUTION',
    formulaType: 'SIMPLE',
    dataSources: ['tasks'],
    requiredGovernanceFlag: null,
    isLeading: true,
    isLagging: false,
    defaultEnabled: true,
    calculationStrategy: 'wip',
    isSystem: true,
    organizationId: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const mockTemplateKpis = [
  {
    id: 'tk-1',
    templateId: 'tpl-1',
    kpiDefinitionId: 'def-1',
    isRequired: true,
    defaultTarget: '20',
    kpiDefinition: mockDefinitions[0],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

// Mock API modules
vi.mock('../api/templateKpis.api', () => ({
  listTemplateKpis: vi.fn(),
  assignTemplateKpi: vi.fn(),
  removeTemplateKpi: vi.fn(),
  listKpiPacks: vi.fn(),
  applyKpiPack: vi.fn(),
}));

vi.mock('../api/kpiDefinitions.api', () => ({
  listKpiDefinitions: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockPacks = [
  {
    packCode: 'scrum_core',
    name: 'Agile Scrum Core',
    description: 'Sprint-focused delivery metrics',
    kpiCount: 4,
  },
  {
    packCode: 'kanban_flow',
    name: 'Kanban Flow',
    description: 'Flow-based metrics',
    kpiCount: 4,
  },
];

describe('TemplateKpiManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders definitions list in add form', async () => {
    const { listTemplateKpis, listKpiPacks } = await import('../api/templateKpis.api');
    const { listKpiDefinitions } = await import('../api/kpiDefinitions.api');

    vi.mocked(listTemplateKpis).mockResolvedValue([]);
    vi.mocked(listKpiDefinitions).mockResolvedValue(mockDefinitions);
    vi.mocked(listKpiPacks).mockResolvedValue(mockPacks);

    render(
      <TemplateKpiManager
        templateId="tpl-1"
        templateName="Test Template"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('No KPIs assigned')).toBeInTheDocument();
    });

    // Click add button
    fireEvent.click(screen.getByText('Add KPI to template'));

    await waitFor(() => {
      expect(screen.getByText('KPI Definition')).toBeInTheDocument();
      // Definitions dropdown should appear (there may also be a pack dropdown)
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows existing template KPIs', async () => {
    const { listTemplateKpis, listKpiPacks } = await import('../api/templateKpis.api');
    const { listKpiDefinitions } = await import('../api/kpiDefinitions.api');

    vi.mocked(listTemplateKpis).mockResolvedValue(mockTemplateKpis);
    vi.mocked(listKpiDefinitions).mockResolvedValue(mockDefinitions);
    vi.mocked(listKpiPacks).mockResolvedValue(mockPacks);

    render(
      <TemplateKpiManager
        templateId="tpl-1"
        templateName="Test Template"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Velocity')).toBeInTheDocument();
      expect(screen.getByText('Required')).toBeInTheDocument();
      expect(screen.getByText('Target: 20')).toBeInTheDocument();
    });
  });

  it('adds KPI with correct payload via POST', async () => {
    const { listTemplateKpis, assignTemplateKpi, listKpiPacks } = await import(
      '../api/templateKpis.api'
    );
    const { listKpiDefinitions } = await import('../api/kpiDefinitions.api');

    vi.mocked(listTemplateKpis)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(mockTemplateKpis);
    vi.mocked(listKpiDefinitions).mockResolvedValue(mockDefinitions);
    vi.mocked(assignTemplateKpi).mockResolvedValue(mockTemplateKpis[0]);
    vi.mocked(listKpiPacks).mockResolvedValue(mockPacks);

    render(
      <TemplateKpiManager
        templateId="tpl-1"
        templateName="Test Template"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Add KPI to template')).toBeInTheDocument();
    });

    // Open add form
    fireEvent.click(screen.getByText('Add KPI to template'));

    // Select a definition (find the select with "Select a KPI..." option)
    const selects = screen.getAllByRole('combobox');
    const defSelect = selects.find(
      (el) => el.querySelector('option[value="def-1"]'),
    )!;
    fireEvent.change(defSelect, { target: { value: 'def-1' } });

    // Set target
    const targetInput = screen.getByPlaceholderText('e.g. 95');
    fireEvent.change(targetInput, { target: { value: '25' } });

    // Check required (the checkbox in the add form)
    const checkboxes = screen.getAllByRole('checkbox');
    const requiredCheckbox = checkboxes[checkboxes.length - 1];
    fireEvent.click(requiredCheckbox);

    // Submit
    fireEvent.click(screen.getByText('Add KPI'));

    await waitFor(() => {
      expect(assignTemplateKpi).toHaveBeenCalledWith('tpl-1', {
        kpiDefinitionId: 'def-1',
        isRequired: true,
        defaultTarget: '25',
      });
    });
  });

  it('shows Apply KPI pack dropdown', async () => {
    const { listTemplateKpis, listKpiPacks } = await import('../api/templateKpis.api');
    const { listKpiDefinitions } = await import('../api/kpiDefinitions.api');

    vi.mocked(listTemplateKpis).mockResolvedValue([]);
    vi.mocked(listKpiDefinitions).mockResolvedValue(mockDefinitions);
    vi.mocked(listKpiPacks).mockResolvedValue(mockPacks);

    render(
      <TemplateKpiManager
        templateId="tpl-1"
        templateName="Test Template"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Apply KPI pack...')).toBeInTheDocument();
    });
  });

  it('calls applyKpiPack on pack selection', async () => {
    const { listTemplateKpis, listKpiPacks, applyKpiPack } = await import(
      '../api/templateKpis.api'
    );
    const { listKpiDefinitions } = await import('../api/kpiDefinitions.api');

    vi.mocked(listTemplateKpis).mockResolvedValue([]);
    vi.mocked(listKpiDefinitions).mockResolvedValue(mockDefinitions);
    vi.mocked(listKpiPacks).mockResolvedValue(mockPacks);
    vi.mocked(applyKpiPack).mockResolvedValue(mockTemplateKpis);

    render(
      <TemplateKpiManager
        templateId="tpl-1"
        templateName="Test Template"
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Apply KPI pack...')).toBeInTheDocument();
    });

    // Select the scrum_core pack
    const packSelect = screen.getAllByRole('combobox').find(
      (el) => el.querySelector('option[value="scrum_core"]'),
    ) ?? screen.getAllByRole('combobox')[0];

    fireEvent.change(packSelect, { target: { value: 'scrum_core' } });

    await waitFor(() => {
      expect(applyKpiPack).toHaveBeenCalledWith('tpl-1', 'scrum_core');
    });
  });

  it('calls onClose when Done is clicked', async () => {
    const { listTemplateKpis, listKpiPacks } = await import('../api/templateKpis.api');
    const { listKpiDefinitions } = await import('../api/kpiDefinitions.api');

    vi.mocked(listTemplateKpis).mockResolvedValue([]);
    vi.mocked(listKpiDefinitions).mockResolvedValue([]);
    vi.mocked(listKpiPacks).mockResolvedValue([]);

    const onClose = vi.fn();
    render(
      <TemplateKpiManager
        templateId="tpl-1"
        templateName="Test Template"
        onClose={onClose}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Done'));
    expect(onClose).toHaveBeenCalled();
  });
});
