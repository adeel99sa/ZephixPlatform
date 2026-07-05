import type { AttributeDataType, AttributeDefinition } from './attributes.types';

export type AttributeSelectChoice = {
  key: string;
  label: string;
  color?: string;
  order?: number;
};

export type AttributeFieldOptions = {
  values?: string[];
  /** Chip colors parallel to `values` by index (optional; editor enrichment). */
  colors?: string[];
  /** @deprecated Legacy read path only — new writes use `values`. */
  choices?: AttributeSelectChoice[];
  currencyCode?: string;
  durationUnit?: 'hours' | 'days';
  ratingMax?: number;
};

export const SELECT_OPTION_COLORS = [
  '#64748b',
  '#3b82f6',
  '#22c55e',
  '#eab308',
  '#f97316',
  '#ef4444',
  '#a855f7',
  '#ec4899',
] as const;

export function slugifyOptionKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

/** Normalize API options (string[], {values}, {choices}) into field options. */
export function normalizeFieldOptions(raw: unknown): AttributeFieldOptions | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    const values = raw.map(String).filter(Boolean);
    return values.length ? { values } : null;
  }
  if (typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const result: AttributeFieldOptions = {};
  if (Array.isArray(o.values)) {
    result.values = o.values.map(String).filter(Boolean);
  }
  if (Array.isArray(o.colors)) {
    result.colors = o.colors.map(String).filter(Boolean);
  }
  if (Array.isArray(o.choices)) {
    const parsed: AttributeSelectChoice[] = [];
    o.choices.forEach((c, i) => {
      if (!c || typeof c !== 'object') return;
      const row = c as Record<string, unknown>;
      const label = String(row.label ?? row.key ?? '');
      if (!label) return;
      parsed.push({
        key: String(row.key ?? slugifyOptionKey(label)),
        label,
        color: typeof row.color === 'string' ? row.color : undefined,
        order: typeof row.order === 'number' ? row.order : i,
      });
    });
    result.choices = parsed.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  if (typeof o.currencyCode === 'string') result.currencyCode = o.currencyCode;
  if (o.durationUnit === 'hours' || o.durationUnit === 'days') {
    result.durationUnit = o.durationUnit;
  }
  if (typeof o.ratingMax === 'number') result.ratingMax = o.ratingMax;
  return Object.keys(result).length ? result : null;
}

export function getSelectChoices(definition: AttributeDefinition): AttributeSelectChoice[] {
  const opts = normalizeFieldOptions(definition.options);
  if (!opts) return [];
  if (opts.values?.length) {
    return opts.values.map((label, i) => ({
      key: slugifyOptionKey(label),
      label,
      color: opts.colors?.[i],
      order: i,
    }));
  }
  if (opts.choices?.length) return opts.choices;
  return [];
}

export function getSelectChoiceLabels(definition: AttributeDefinition): string[] {
  return getSelectChoices(definition).map((c) => c.label);
}

export function choiceForValue(
  definition: AttributeDefinition,
  value: string,
): AttributeSelectChoice | undefined {
  const choices = getSelectChoices(definition);
  return choices.find((c) => c.label === value || c.key === value);
}

export function buildSelectOptionsPayload(choices: AttributeSelectChoice[]): Record<string, unknown> {
  const valid = choices.filter((c) => c.label.trim());
  const values = valid.map((c) => c.label.trim());
  const colors = valid.map(
    (c, i) => c.color ?? SELECT_OPTION_COLORS[i % SELECT_OPTION_COLORS.length],
  );
  return { values, colors };
}

export function buildCreateOptionsPayload(
  dataType: AttributeDataType,
  choices: AttributeSelectChoice[],
  extras?: { currencyCode?: string; durationUnit?: 'hours' | 'days' },
): Record<string, unknown> | undefined {
  if (dataType === 'single_select' || dataType === 'multi_select') {
    if (choices.length === 0) return undefined;
    return buildSelectOptionsPayload(choices);
  }
  if (dataType === 'currency' && extras?.currencyCode) {
    return { currencyCode: extras.currencyCode };
  }
  if (dataType === 'duration' && extras?.durationUnit) {
    return { durationUnit: extras.durationUnit };
  }
  if (dataType === 'rating') {
    return { ratingMax: 5 };
  }
  return undefined;
}

export function durationUnitLabel(definition: AttributeDefinition): string {
  const opts = normalizeFieldOptions(definition.options);
  return opts?.durationUnit === 'days' ? 'days' : 'hours';
}

export function currencyCodeLabel(definition: AttributeDefinition): string {
  const opts = normalizeFieldOptions(definition.options);
  return opts?.currencyCode ?? 'USD';
}
