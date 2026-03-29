/**
 * Prompt 9: Turn template_snapshot delta JSON (computed_delta) into short PM-facing lines.
 * Keys mirror backend `TEMPLATE_SNAPSHOT_DELTA_KEYS`: templateId, templateVersion, locked, blocks.
 */

function readBlockConfig(block: unknown): Record<string, unknown> {
  if (!block || typeof block !== 'object' || Array.isArray(block)) return {};
  const cfg = (block as { config?: unknown }).config;
  if (cfg && typeof cfg === 'object' && !Array.isArray(cfg)) {
    return cfg as Record<string, unknown>;
  }
  return {};
}

function phaseLabelFromConfig(cfg: Record<string, unknown>): string | null {
  const name =
    (typeof cfg.phaseName === 'string' && cfg.phaseName.trim()) ||
    (typeof cfg.phaseLabel === 'string' && cfg.phaseLabel.trim()) ||
    (typeof cfg.phase === 'string' && cfg.phase.trim());
  return name || null;
}

function blockIdToFriendlyLabel(blockId: string): string | null {
  const id = blockId.toLowerCase();
  if (id.includes('risk') || id.includes('raid')) {
    return 'Risks tab requirement';
  }
  if (id.includes('kpi')) {
    return 'KPI block';
  }
  if (id.includes('document')) {
    return 'Documents requirement';
  }
  if (id.includes('approval') || id.includes('gate')) {
    return 'Governance / gate block';
  }
  return null;
}

/**
 * @param delta — `computedDelta` / `computed_delta` object from API
 */
export function humanizeTemplateComputedDelta(
  delta: Record<string, unknown> | null | undefined,
): string[] {
  const lines: string[] = [];
  if (!delta || typeof delta !== 'object' || Array.isArray(delta)) {
    return ['No structured changes were included in this review.'];
  }

  if (typeof delta.templateVersion === 'number') {
    lines.push(`Template version will update to ${delta.templateVersion}.`);
  }

  if (delta.locked === true) {
    lines.push('The template snapshot will be locked after you accept.');
  } else if (delta.locked === false) {
    lines.push('The template snapshot will stay editable (unlocked) after merge.');
  }

  const blocks = delta.blocks;
  if (Array.isArray(blocks) && blocks.length > 0) {
    const phaseCounts = new Map<string, number>();
    let genericBlockHints = 0;

    for (const block of blocks) {
      if (!block || typeof block !== 'object' || Array.isArray(block)) continue;
      const b = block as { blockId?: unknown };
      const blockId = typeof b.blockId === 'string' ? b.blockId : '';
      const cfg = readBlockConfig(block);
      const phase = phaseLabelFromConfig(cfg);
      if (phase) {
        phaseCounts.set(phase, (phaseCounts.get(phase) ?? 0) + 1);
      } else {
        const hint = blockId ? blockIdToFriendlyLabel(blockId) : null;
        if (hint) {
          lines.push(`Adds or updates: ${hint}.`);
          genericBlockHints += 1;
        }
      }
    }

    for (const [phase, count] of phaseCounts) {
      lines.push(
        `Adds ${count} template block update${count === 1 ? '' : 's'} in the ${phase} phase.`,
      );
    }

    if (phaseCounts.size === 0 && genericBlockHints === 0) {
      lines.push(
        `Includes ${blocks.length} change(s) to the template block structure.`,
      );
    }
  }

  if (lines.length === 0) {
    lines.push(
      'The master template published a new snapshot; review raw details below if needed.',
    );
  }

  return lines;
}

export function getComputedDeltaRecord(review: {
  computedDelta?: unknown;
  computed_delta?: unknown;
}): Record<string, unknown> {
  const raw = review.computedDelta ?? review.computed_delta;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}
