import { Injectable } from '@nestjs/common';
import { TemplateDefinitionsService } from '../templates/template-definitions.service';
import { KpiLibraryService } from '../kpis/kpi-library.service';
import { DocumentLibraryService } from '../documents/document-library.service';
import type { TemplateCenterScope } from '../common/template-center-scope.util';

export type SearchResultType = 'template' | 'kpi' | 'doc' | 'command';

export interface SearchResultItem {
  type: SearchResultType;
  key: string;
  title: string;
  subtitle?: string;
  score: number;
  updatedAt?: string;
  payload: Record<string, any>;
}

@Injectable()
export class TemplateCenterSearchService {
  constructor(
    private readonly templateDefinitionsService: TemplateDefinitionsService,
    private readonly kpiLibraryService: KpiLibraryService,
    private readonly documentLibraryService: DocumentLibraryService,
  ) {}

  async search(
    q: string,
    context: SearchResultType | undefined,
    limit: number,
    scope: TemplateCenterScope,
  ): Promise<SearchResultItem[]> {
    const effectiveLimit = Math.min(Math.max(1, limit || 20), 50);
    const term = (q || '').trim().toLowerCase();
    const results: SearchResultItem[] = [];
    const maxPerType = Math.max(5, Math.ceil(effectiveLimit / 4));

    if (!context || context === 'template') {
      const { definitions, latestVersions } = await this.templateDefinitionsService.list(
        { search: term || undefined },
        scope.organizationId,
        scope.workspaceId ?? undefined,
      );
      for (const d of definitions.slice(0, maxPerType)) {
        const score = this.score(term, d.templateKey, d.name, d.description);
        if (score > 0 || !term) {
          const latest = latestVersions.get(d.id);
          const item: SearchResultItem = {
            type: 'template',
            key: d.templateKey,
            title: d.name,
            subtitle: d.isPrebuilt ? 'Pre built template' : undefined,
            score: score || 0,
            payload: {
              templateKey: d.templateKey,
              name: d.name,
              version: latest?.version,
              latestVersion: latest ? { version: latest.version, status: latest.status } : undefined,
            },
          };
          if ((d as any).updatedAt) item.updatedAt = (d as any).updatedAt.toISOString();
          results.push(item);
        }
      }
    }

    if (!context || context === 'kpi') {
      const kpis = await this.kpiLibraryService.list({
        search: term || undefined,
        activeOnly: true,
      });
      for (const k of kpis.slice(0, maxPerType)) {
        const score = this.score(term, k.kpiKey, k.name);
        if (score > 0 || !term) {
          results.push({
            type: 'kpi',
            key: k.kpiKey,
            title: k.name,
            subtitle: k.category,
            score: score || 0,
            payload: {
              kpiKey: k.kpiKey,
              name: k.name,
              category: k.category ?? undefined,
              unit: k.unit ?? undefined,
            },
          });
        }
      }
    }

    if (!context || context === 'doc') {
      const docs = await this.documentLibraryService.listTemplates({
        search: term || undefined,
        activeOnly: true,
      });
      for (const d of docs.slice(0, maxPerType)) {
        const score = this.score(term, d.docKey, d.name);
        if (score > 0 || !term) {
          results.push({
            type: 'doc',
            key: d.docKey,
            title: d.name,
            subtitle: d.category,
            score: score || 0,
            payload: {
              docKey: d.docKey,
              name: d.name,
              category: d.category ?? undefined,
            },
          });
        }
      }
    }

    if (!context || context === 'command') {
      const commands = [
        { key: 'add_kpis', title: 'Add KPIs to project', term: 'kpi add' },
        { key: 'add_docs', title: 'Add documents to project', term: 'doc add' },
      ];
      for (const c of commands) {
        if (!term || c.term.includes(term) || term.includes(c.key)) {
          results.push({
            type: 'command',
            key: c.key,
            title: c.title,
            score: term ? 0.8 : 0,
            payload: { command: c.key, commandId: c.key },
          });
        }
      }
    }

    // Primary: score DESC, secondary: updatedAt DESC, tertiary: key ASC
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aAt = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bAt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      if (bAt !== aAt) return bAt - aAt;
      return (a.key || '').localeCompare(b.key || '');
    });
    return results.slice(0, effectiveLimit);
  }

  private score(term: string, ...fields: (string | null | undefined)[]): number {
    if (!term) return 0;
    let best = 0;
    for (const f of fields) {
      if (!f) continue;
      const lower = f.toLowerCase();
      if (lower === term) return 1;
      if (lower.startsWith(term)) best = Math.max(best, 0.9);
      else if (lower.includes(term)) best = Math.max(best, 0.7);
    }
    return best;
  }
}
