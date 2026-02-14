/**
 * Generator 9: Earned value snapshots.
 * For 200 scaled EV projects, create 12 monthly snapshots with coherent metrics.
 */
import { ScaleSeedConfig } from '../scale-seed.config';
import {
  stableId, batchInsert, fmtTs, fmtDate, seededRng, scaleCount,
} from '../scale-seed.utils';
import { projectId, projectWorkspaceIndex } from './projects.generator';
import { workspaceId } from './workspaces.generator';
import { baselineId } from './baselines.generator';

export async function generateEvSnapshots(
  ds: { query: (sql: string, params?: any[]) => Promise<any> },
  cfg: ScaleSeedConfig,
  orgIdVal: string,
  evProjectIndices: number[],
  log: (msg: string) => void,
): Promise<{ count: number }> {
  const rng = seededRng(cfg.seed + 9);
  const maxProjects = scaleCount(200, cfg.scale);
  const projectsForEv = evProjectIndices.slice(0, maxProjects);
  const months = 12;

  const cols = [
    'id', 'organization_id', 'workspace_id', 'project_id',
    'baseline_id', 'as_of_date',
    'bac', 'pv', 'ev', 'ac',
    'cpi', 'spi', 'eac', 'etc', 'vac',
    'created_at',
  ];

  let rows: any[][] = [];
  let count = 0;
  const now = fmtTs(new Date());

  for (const pIdx of projectsForEv) {
    const wsIdx = projectWorkspaceIndex(cfg, pIdx);
    const wsId = workspaceId(cfg, wsIdx);
    const pId = projectId(cfg, pIdx);
    const blId = baselineId(cfg, pIdx);

    // BAC: $50K–$500K range
    const bac = 50000 + Math.floor(rng() * 450000);

    for (let m = 0; m < months; m++) {
      const asOfDate = new Date();
      asOfDate.setMonth(asOfDate.getMonth() - (months - m - 1));
      const fraction = (m + 1) / months; // progress fraction

      // PV: linear ramp
      const pv = Math.round(bac * fraction);
      // EV: PV * random factor 0.85–1.10
      const ev = Math.round(pv * (0.85 + rng() * 0.25));
      // AC: EV * random factor 0.90–1.15
      const ac = Math.round(ev * (0.90 + rng() * 0.25));

      const cpi = ac > 0 ? Math.round((ev / ac) * 10000) / 10000 : 1;
      const spi = pv > 0 ? Math.round((ev / pv) * 10000) / 10000 : 1;
      const eac = cpi > 0 ? Math.round(bac / cpi) : bac;
      const etc = Math.max(0, eac - ac);
      const vac = bac - eac;

      rows.push([
        stableId('evsnap', `${cfg.seed}:${pId}:${m}`),
        orgIdVal, wsId, pId, blId,
        fmtDate(asOfDate),
        bac, pv, ev, ac,
        cpi, spi, eac, etc, vac,
        now,
      ]);
      count++;

      if (rows.length >= cfg.batch) {
        await batchInsert(
          ds, 'earned_value_snapshots', cols, rows,
          cfg.batch, ['project_id', 'as_of_date'], log,
        );
        rows = [];
      }
    }
  }

  if (rows.length > 0) {
    await batchInsert(
      ds, 'earned_value_snapshots', cols, rows,
      cfg.batch, ['project_id', 'as_of_date'], log,
    );
  }

  return { count };
}
