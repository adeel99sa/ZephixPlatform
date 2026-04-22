/**
 * Phase 5A — Zephix-native template blueprint preview.
 *
 * Replaces any external screenshot, marketing art, or placeholder visuals
 * with a small SVG that visually reflects the **structure** of the template.
 *
 * Each shape is keyed by methodology so three or more templates that
 * differ in real backend phases/tasks visibly differ in their preview:
 *
 *   waterfall → horizontal phase sequence with milestone diamonds
 *   agile     → backlog column + sprint strip + board + retro panel
 *   kanban    → three-column flow with WIP slots
 *   hybrid    → phase blocks with an embedded board strip
 *
 * The blueprint is intentionally schematic, not pixel-perfect art:
 * accessibility cannot depend on color alone, so each shape carries an
 * `aria-label` describing the structure in words.
 */
import type { TemplateDto } from '../templates.api';

interface Props {
  template: Pick<TemplateDto, 'methodology' | 'phases' | 'taskTemplates' | 'task_templates'>;
  className?: string;
  /** "card" = small thumbnail in the grid; "preview" = larger modal hero */
  size?: 'card' | 'preview';
}

const PALETTE = {
  bg: '#f8fafc',          // slate-50
  stroke: '#cbd5e1',      // slate-300
  block: '#e2e8f0',       // slate-200
  accent: '#3b82f6',      // blue-500
  accent2: '#6366f1',     // indigo-500
  text: '#475569',        // slate-600
};

function phaseCount(t: Props['template']): number {
  return Array.isArray(t.phases) ? t.phases.length : 0;
}
function taskCount(t: Props['template']): number {
  const flat = (t.taskTemplates ?? t.task_templates ?? []) as unknown[];
  return Array.isArray(flat) ? flat.length : 0;
}

export function TemplateBlueprint({ template, className, size = 'card' }: Props) {
  const m = template.methodology;
  const ariaParts: string[] = [];
  const ph = phaseCount(template);
  const tk = taskCount(template);
  if (ph > 0) ariaParts.push(`${ph} phase${ph === 1 ? '' : 's'}`);
  if (tk > 0) ariaParts.push(`${tk} task${tk === 1 ? '' : 's'}`);
  ariaParts.push(`${m ?? 'unspecified'} structure preview`);
  const ariaLabel = ariaParts.join(', ');

  const w = size === 'card' ? 240 : 480;
  const h = size === 'card' ? 110 : 220;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height="100%"
      role="img"
      aria-label={ariaLabel}
      className={className}
      data-testid="template-blueprint"
      data-methodology={m ?? 'unspecified'}
    >
      <rect x={0} y={0} width={w} height={h} fill={PALETTE.bg} />
      {m === 'waterfall' && <Waterfall w={w} h={h} phases={ph || 5} />}
      {(m === 'agile' || m === undefined) && <Agile w={w} h={h} />}
      {m === 'kanban' && <Kanban w={w} h={h} />}
      {m === 'hybrid' && <Hybrid w={w} h={h} phases={ph || 4} />}
    </svg>
  );
}

/* ────────── Waterfall: phase sequence with milestone diamonds ────────── */
function Waterfall({ w, h, phases }: { w: number; h: number; phases: number }) {
  const padX = 16;
  const padY = h * 0.3;
  const gap = 8;
  const blockW = (w - padX * 2 - gap * (phases - 1)) / phases;
  const blockH = h * 0.32;
  const blocks = Array.from({ length: phases }, (_, i) => i);

  return (
    <g>
      {blocks.map((i) => {
        const x = padX + i * (blockW + gap);
        return (
          <g key={i}>
            <rect
              x={x}
              y={padY}
              width={blockW}
              height={blockH}
              rx={3}
              fill={PALETTE.block}
              stroke={PALETTE.stroke}
              strokeWidth={1}
            />
            {/* milestone diamond between blocks */}
            {i < phases - 1 && (
              <path
                d={`M ${x + blockW + gap / 2} ${padY + blockH / 2 - 4}
                    L ${x + blockW + gap / 2 + 4} ${padY + blockH / 2}
                    L ${x + blockW + gap / 2} ${padY + blockH / 2 + 4}
                    L ${x + blockW + gap / 2 - 4} ${padY + blockH / 2}
                    Z`}
                fill={PALETTE.accent}
              />
            )}
          </g>
        );
      })}
      {/* baseline arrow */}
      <line
        x1={padX}
        y1={padY + blockH + 10}
        x2={w - padX}
        y2={padY + blockH + 10}
        stroke={PALETTE.stroke}
        strokeWidth={1}
      />
    </g>
  );
}

/* ────────── Agile: backlog + sprint strip + board + retro ────────── */
function Agile({ w, h }: { w: number; h: number }) {
  const pad = 14;
  // Backlog column on the left
  const backlogW = w * 0.18;
  const backlogX = pad;
  const backlogY = pad;
  const backlogH = h - pad * 2;
  // Sprint strip across the top right
  const stripX = backlogX + backlogW + 8;
  const stripY = pad;
  const stripW = w - stripX - pad;
  const stripH = h * 0.18;
  // Board: 3 columns under the strip
  const boardY = stripY + stripH + 6;
  const boardH = h - boardY - pad - h * 0.18;
  const colGap = 6;
  const colW = (stripW - colGap * 2) / 3;
  // Retro bar bottom right
  const retroY = boardY + boardH + 6;
  const retroH = h * 0.12;

  return (
    <g>
      {/* backlog */}
      <rect
        x={backlogX}
        y={backlogY}
        width={backlogW}
        height={backlogH}
        rx={3}
        fill={PALETTE.block}
        stroke={PALETTE.stroke}
      />
      {Array.from({ length: 4 }).map((_, i) => (
        <rect
          key={i}
          x={backlogX + 4}
          y={backlogY + 6 + i * 14}
          width={backlogW - 8}
          height={6}
          rx={1}
          fill={PALETTE.bg}
        />
      ))}
      {/* sprint strip */}
      <rect
        x={stripX}
        y={stripY}
        width={stripW}
        height={stripH}
        rx={3}
        fill={PALETTE.accent}
        opacity={0.85}
      />
      {/* board */}
      {Array.from({ length: 3 }).map((_, i) => (
        <rect
          key={i}
          x={stripX + i * (colW + colGap)}
          y={boardY}
          width={colW}
          height={boardH}
          rx={3}
          fill={PALETTE.block}
          stroke={PALETTE.stroke}
        />
      ))}
      {/* retro bar */}
      <rect
        x={stripX}
        y={retroY}
        width={stripW}
        height={retroH}
        rx={3}
        fill={PALETTE.accent2}
        opacity={0.7}
      />
    </g>
  );
}

/* ────────── Kanban: three columns with WIP slots ────────── */
function Kanban({ w, h }: { w: number; h: number }) {
  const pad = 16;
  const gap = 8;
  const colW = (w - pad * 2 - gap * 2) / 3;
  const colH = h - pad * 2;
  const cols = ['To do', 'In progress', 'Done'];

  return (
    <g>
      {cols.map((_label, i) => {
        const x = pad + i * (colW + gap);
        const fill = i === 1 ? PALETTE.accent : PALETTE.block;
        const opacity = i === 1 ? 0.6 : 1;
        return (
          <g key={i}>
            <rect
              x={x}
              y={pad}
              width={colW}
              height={colH}
              rx={3}
              fill={fill}
              opacity={opacity}
              stroke={PALETTE.stroke}
            />
            {Array.from({ length: 3 }).map((_, k) => (
              <rect
                key={k}
                x={x + 4}
                y={pad + 6 + k * 16}
                width={colW - 8}
                height={8}
                rx={1}
                fill={PALETTE.bg}
              />
            ))}
          </g>
        );
      })}
    </g>
  );
}

/* ────────── Hybrid: phase blocks + embedded board strip ────────── */
function Hybrid({ w, h, phases }: { w: number; h: number; phases: number }) {
  const pad = 14;
  const phaseY = pad;
  const phaseH = h * 0.28;
  const gap = 6;
  const blockW = (w - pad * 2 - gap * (phases - 1)) / phases;
  // Board strip below phases
  const boardY = phaseY + phaseH + 8;
  const boardH = h - boardY - pad;

  return (
    <g>
      {Array.from({ length: phases }).map((_, i) => {
        const x = pad + i * (blockW + gap);
        // Highlight middle phase as the "iterative delivery" zone
        const isCenter = i === Math.floor(phases / 2);
        return (
          <rect
            key={i}
            x={x}
            y={phaseY}
            width={blockW}
            height={phaseH}
            rx={3}
            fill={isCenter ? PALETTE.accent : PALETTE.block}
            opacity={isCenter ? 0.85 : 1}
            stroke={PALETTE.stroke}
          />
        );
      })}
      {/* board lanes */}
      {Array.from({ length: 3 }).map((_, i) => (
        <rect
          key={i}
          x={pad + i * ((w - pad * 2) / 3 + 0)}
          y={boardY}
          width={(w - pad * 2) / 3 - 4}
          height={boardH}
          rx={2}
          fill={PALETTE.block}
          stroke={PALETTE.stroke}
        />
      ))}
    </g>
  );
}
