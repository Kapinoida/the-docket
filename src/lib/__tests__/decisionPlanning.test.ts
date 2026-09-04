import {
  extractDecisions,
  getRecentDecisions,
  getDecisionsDueForReview,
  getActiveDecisions,
  getDecidedDecisions,
  isDecisionOverdueForRevisit,
  isDecisionDueToday,
  DecisionRecord,
} from '../decisionPlanning';

function makeDecision(overrides: Partial<DecisionRecord> = {}): DecisionRecord {
  return {
    id: 'dec_test',
    title: 'Test Decision',
    status: 'active',
    context: 'Test context',
    options: ['Option A', 'Option B'],
    criteria: ['Cost', 'Quality'],
    choice: 'Option A',
    reasoning: 'It was cheaper',
    revisit_date: null,
    outcome: '',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    page_id: 1,
    page_title: 'Test Page',
    ...overrides,
  };
}

describe('extractDecisions', () => {
  it('returns empty array for null content', () => {
    expect(extractDecisions(null, 1, 'Page')).toEqual([]);
  });

  it('returns empty array for undefined content', () => {
    expect(extractDecisions(undefined, 1, 'Page')).toEqual([]);
  });

  it('returns empty array for content without decisions', () => {
    const content = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
      ],
    };
    expect(extractDecisions(content, 1, 'Page')).toEqual([]);
  });

  it('extracts a single decision node', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'decision',
          attrs: {
            id: 'dec_123',
            title: 'Buy a car',
            status: 'decided',
            context: 'Need transportation',
            options: 'Tesla\nBMW\nHonda',
            criteria: 'Cost\nReliability',
            choice: 'Honda',
            reasoning: 'Most reliable',
            revisit_date: null,
            outcome: 'Happy with it',
            created_at: '2026-09-01T00:00:00Z',
            updated_at: '2026-09-02T00:00:00Z',
          },
        },
      ],
    };

    const decisions = extractDecisions(content, 42, 'My Page');
    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toEqual({
      id: 'dec_123',
      title: 'Buy a car',
      status: 'decided',
      context: 'Need transportation',
      options: ['Tesla', 'BMW', 'Honda'],
      criteria: ['Cost', 'Reliability'],
      choice: 'Honda',
      reasoning: 'Most reliable',
      revisit_date: null,
      outcome: 'Happy with it',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-02T00:00:00Z',
      page_id: 42,
      page_title: 'My Page',
    });
  });

  it('extracts decisions from nested content', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'collapsibleBlock',
          attrs: { collapsed: false },
          content: [
            {
              type: 'decision',
              attrs: {
                id: 'dec_nested',
                title: 'Nested Decision',
                status: 'active',
                context: '',
                options: '',
                criteria: '',
                choice: '',
                reasoning: '',
                revisit_date: null,
                outcome: '',
                created_at: '2026-09-01T00:00:00Z',
                updated_at: '2026-09-01T00:00:00Z',
              },
            },
          ],
        },
      ],
    };

    const decisions = extractDecisions(content, 1, 'Page');
    expect(decisions).toHaveLength(1);
    expect(decisions[0].id).toBe('dec_nested');
  });

  it('extracts multiple decisions', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'decision',
          attrs: { id: 'dec_1', title: 'First', status: 'active', context: '', options: '', criteria: '', choice: '', reasoning: '', revisit_date: null, outcome: '', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'text' }] },
        {
          type: 'decision',
          attrs: { id: 'dec_2', title: 'Second', status: 'decided', context: '', options: '', criteria: '', choice: '', reasoning: '', revisit_date: null, outcome: '', created_at: '2026-09-02T00:00:00Z', updated_at: '2026-09-02T00:00:00Z' },
        },
      ],
    };

    const decisions = extractDecisions(content, 1, 'Page');
    expect(decisions).toHaveLength(2);
    expect(decisions[0].title).toBe('First');
    expect(decisions[1].title).toBe('Second');
  });

  it('skips decision nodes without id', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'decision',
          attrs: { title: 'No ID', status: 'active' },
        },
      ],
    };

    expect(extractDecisions(content, 1, 'Page')).toEqual([]);
  });

  it('normalizes invalid status to active', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'decision',
          attrs: {
            id: 'dec_bad_status',
            title: 'Test',
            status: 'invalid_status',
            context: '',
            options: '',
            criteria: '',
            choice: '',
            reasoning: '',
            revisit_date: null,
            outcome: '',
            created_at: '2026-09-01T00:00:00Z',
            updated_at: '2026-09-01T00:00:00Z',
          },
        },
      ],
    };

    const decisions = extractDecisions(content, 1, 'Page');
    expect(decisions[0].status).toBe('active');
  });

  it('handles empty options and criteria strings', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'decision',
          attrs: {
            id: 'dec_empty',
            title: 'Test',
            status: 'active',
            context: '',
            options: '',
            criteria: '',
            choice: '',
            reasoning: '',
            revisit_date: null,
            outcome: '',
            created_at: '2026-09-01T00:00:00Z',
            updated_at: '2026-09-01T00:00:00Z',
          },
        },
      ],
    };

    const decisions = extractDecisions(content, 1, 'Page');
    expect(decisions[0].options).toEqual([]);
    expect(decisions[0].criteria).toEqual([]);
  });
});

describe('getRecentDecisions', () => {
  it('sorts by updated_at descending', () => {
    const decisions = [
      makeDecision({ id: 'a', updated_at: '2026-09-01T00:00:00Z' }),
      makeDecision({ id: 'b', updated_at: '2026-09-03T00:00:00Z' }),
      makeDecision({ id: 'c', updated_at: '2026-09-02T00:00:00Z' }),
    ];

    const recent = getRecentDecisions(decisions);
    expect(recent.map(d => d.id)).toEqual(['b', 'c', 'a']);
  });

  it('respects limit parameter', () => {
    const decisions = [
      makeDecision({ id: 'a', updated_at: '2026-09-01T00:00:00Z' }),
      makeDecision({ id: 'b', updated_at: '2026-09-02T00:00:00Z' }),
      makeDecision({ id: 'c', updated_at: '2026-09-03T00:00:00Z' }),
    ];

    const recent = getRecentDecisions(decisions, 2);
    expect(recent).toHaveLength(2);
    expect(recent[0].id).toBe('c');
  });

  it('defaults to 5 items', () => {
    const decisions = Array.from({ length: 10 }, (_, i) =>
      makeDecision({ id: `dec_${i}`, updated_at: new Date(2026, 8, i + 1).toISOString() }),
    );

    const recent = getRecentDecisions(decisions);
    expect(recent).toHaveLength(5);
  });
});

describe('getDecisionsDueForReview', () => {
  it('returns decisions with revisit_date in the past', () => {
    const decisions = [
      makeDecision({ id: 'past', revisit_date: '2020-01-01T00:00:00Z' }),
      makeDecision({ id: 'future', revisit_date: '2099-01-01T00:00:00Z' }),
      makeDecision({ id: 'none', revisit_date: null }),
    ];

    const due = getDecisionsDueForReview(decisions);
    expect(due).toHaveLength(1);
    expect(due[0].id).toBe('past');
  });

  it('returns decisions with revisit_date today', () => {
    const today = new Date().toISOString();
    const decisions = [
      makeDecision({ id: 'today', revisit_date: today }),
      makeDecision({ id: 'tomorrow', revisit_date: new Date(Date.now() + 86400000).toISOString() }),
    ];

    const due = getDecisionsDueForReview(decisions);
    expect(due.some(d => d.id === 'today')).toBe(true);
  });

  it('sorts by revisit_date ascending', () => {
    const decisions = [
      makeDecision({ id: 'later', revisit_date: '2020-06-01T00:00:00Z' }),
      makeDecision({ id: 'earlier', revisit_date: '2020-01-01T00:00:00Z' }),
    ];

    const due = getDecisionsDueForReview(decisions);
    expect(due[0].id).toBe('earlier');
  });
});

describe('getActiveDecisions', () => {
  it('filters to active status only', () => {
    const decisions = [
      makeDecision({ id: 'a', status: 'active' }),
      makeDecision({ id: 'b', status: 'decided' }),
      makeDecision({ id: 'c', status: 'reconsideration' }),
    ];

    const active = getActiveDecisions(decisions);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe('a');
  });
});

describe('getDecidedDecisions', () => {
  it('filters to decided status only', () => {
    const decisions = [
      makeDecision({ id: 'a', status: 'active' }),
      makeDecision({ id: 'b', status: 'decided' }),
      makeDecision({ id: 'c', status: 'reconsideration' }),
    ];

    const decided = getDecidedDecisions(decisions);
    expect(decided).toHaveLength(1);
    expect(decided[0].id).toBe('b');
  });
});

describe('isDecisionOverdueForRevisit', () => {
  it('returns true for past revisit date', () => {
    const decision = makeDecision({ revisit_date: '2020-01-01T00:00:00Z' });
    expect(isDecisionOverdueForRevisit(decision)).toBe(true);
  });

  it('returns false for future revisit date', () => {
    const decision = makeDecision({ revisit_date: '2099-01-01T00:00:00Z' });
    expect(isDecisionOverdueForRevisit(decision)).toBe(false);
  });

  it('returns false for null revisit date', () => {
    const decision = makeDecision({ revisit_date: null });
    expect(isDecisionOverdueForRevisit(decision)).toBe(false);
  });
});

describe('isDecisionDueToday', () => {
  it('returns true for today revisit date', () => {
    const decision = makeDecision({ revisit_date: new Date().toISOString() });
    expect(isDecisionDueToday(decision)).toBe(true);
  });

  it('returns false for different date', () => {
    const decision = makeDecision({ revisit_date: '2020-01-01T00:00:00Z' });
    expect(isDecisionDueToday(decision)).toBe(false);
  });

  it('returns false for null revisit date', () => {
    const decision = makeDecision({ revisit_date: null });
    expect(isDecisionDueToday(decision)).toBe(false);
  });
});
