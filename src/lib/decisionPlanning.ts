import type { DecisionStatus } from '../components/v2/editor/DecisionBlock';

export interface DecisionRecord {
  id: string;
  title: string;
  status: DecisionStatus;
  context: string;
  options: string[];
  criteria: string[];
  choice: string;
  reasoning: string;
  revisit_date: string | null;
  outcome: string;
  created_at: string;
  updated_at: string;
  page_id: number;
  page_title: string;
}

export function extractDecisions(
  content: unknown,
  pageId: number,
  pageTitle: string,
): DecisionRecord[] {
  if (!content || typeof content !== 'object') return [];

  const decisions: DecisionRecord[] = [];
  walkNodes(content, pageId, pageTitle, decisions);
  return decisions;
}

function walkNodes(
  node: unknown,
  pageId: number,
  pageTitle: string,
  results: DecisionRecord[],
): void {
  if (!node) return;

  if (Array.isArray(node)) {
    for (const item of node) {
      walkNodes(item, pageId, pageTitle, results);
    }
    return;
  }

  if (typeof node !== 'object') return;

  const obj = node as Record<string, unknown>;

  if (obj.type === 'decision' && obj.attrs) {
    const attrs = obj.attrs as Record<string, unknown>;
    const decision = normalizeDecision(attrs, pageId, pageTitle);
    if (decision) {
      results.push(decision);
    }
  }

  if (obj.content && Array.isArray(obj.content)) {
    for (const child of obj.content) {
      walkNodes(child, pageId, pageTitle, results);
    }
  }
}

function normalizeDecision(
  attrs: Record<string, unknown>,
  pageId: number,
  pageTitle: string,
): DecisionRecord | null {
  if (!attrs.id) return null;

  const validStatuses: DecisionStatus[] = ['active', 'decided', 'reconsideration'];
  const status = validStatuses.includes(attrs.status as DecisionStatus) ? (attrs.status as DecisionStatus) : 'active';

  const options = typeof attrs.options === 'string'
    ? attrs.options.split('\n').filter(Boolean)
    : [];

  const criteria = typeof attrs.criteria === 'string'
    ? attrs.criteria.split('\n').filter(Boolean)
    : [];

  return {
    id: attrs.id as string,
    title: (attrs.title as string) || '',
    status,
    context: (attrs.context as string) || '',
    options,
    criteria,
    choice: (attrs.choice as string) || '',
    reasoning: (attrs.reasoning as string) || '',
    revisit_date: (attrs.revisit_date as string) || null,
    outcome: (attrs.outcome as string) || '',
    created_at: (attrs.created_at as string) || new Date().toISOString(),
    updated_at: (attrs.updated_at as string) || new Date().toISOString(),
    page_id: pageId,
    page_title: pageTitle,
  };
}

export function getRecentDecisions(
  decisions: DecisionRecord[],
  limit: number = 5,
): DecisionRecord[] {
  return [...decisions]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, limit);
}

export function getDecisionsDueForReview(decisions: DecisionRecord[]): DecisionRecord[] {
  const now = new Date();
  const todayStr = now.toDateString();

  return decisions
    .filter((d) => {
      if (!d.revisit_date) return false;
      const revisitDate = new Date(d.revisit_date);
      return revisitDate <= now || revisitDate.toDateString() === todayStr;
    })
    .sort((a, b) => new Date(a.revisit_date!).getTime() - new Date(b.revisit_date!).getTime());
}

export function getActiveDecisions(decisions: DecisionRecord[]): DecisionRecord[] {
  return decisions.filter((d) => d.status === 'active');
}

export function getDecidedDecisions(decisions: DecisionRecord[]): DecisionRecord[] {
  return decisions.filter((d) => d.status === 'decided');
}

export function isDecisionOverdueForRevisit(decision: DecisionRecord): boolean {
  if (!decision.revisit_date) return false;
  const revisitDate = new Date(decision.revisit_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return revisitDate < today;
}

export function isDecisionDueToday(decision: DecisionRecord): boolean {
  if (!decision.revisit_date) return false;
  const revisitDate = new Date(decision.revisit_date);
  return revisitDate.toDateString() === new Date().toDateString();
}
