import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from '@/lib/api/client';
import {
  mapPmResponseToAiAssist,
  postAiPmAssistantAsk,
  type AiAssistPayload,
} from './aiAssistant.api';

describe('postAiPmAssistantAsk', () => {
  beforeEach(() => {
    vi.mocked(apiClient.post).mockReset();
  });

  it('posts to /ai-pm-assistant/ask with question and project context', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      answer: 'Hello',
      confidence: 0.9,
      sources: [],
      recommendations: [],
      nextActions: [],
    });

    const payload: AiAssistPayload = {
      route: { pathname: '/projects/p1' },
      entityContext: { projectId: 'p1' },
      userQuery: 'What is blocked?',
      intentHint: 'GOVERNANCE',
    };

    await postAiPmAssistantAsk(payload);

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    const [path, body] = vi.mocked(apiClient.post).mock.calls[0];
    expect(path).toBe('/ai-pm-assistant/ask');
    expect(body).toMatchObject({
      question: expect.stringContaining('What is blocked?'),
      context: { projectId: 'p1' },
    });
    expect(String(body.question)).toContain('[intent: GOVERNANCE]');
  });

  it('mapPmResponseToAiAssist carries answer as narrativeSummary', () => {
    const out = mapPmResponseToAiAssist(
      {
        answer: 'Sync standups.',
        confidence: 1,
        sources: [],
        recommendations: [],
        nextActions: [],
      },
      42,
    );
    expect(out.narrativeSummary).toBe('Sync standups.');
    expect(out.debug.latencyMs).toBe(42);
    expect(out.rankedActions).toEqual([]);
  });
});
