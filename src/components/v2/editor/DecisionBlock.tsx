import { NodeViewWrapper } from '@tiptap/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
} from 'lucide-react';

export type DecisionStatus = 'active' | 'decided' | 'reconsideration';

export interface DecisionAttrs {
  id: string;
  title: string;
  status: DecisionStatus;
  context: string;
  options: string;
  criteria: string;
  choice: string;
  reasoning: string;
  revisit_date: string;
  outcome: string;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<DecisionStatus, { label: string; color: string; icon: typeof Brain }> = {
  active: { label: 'Active', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Brain },
  decided: { label: 'Decided', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  reconsideration: { label: 'Reconsider', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: AlertTriangle },
};

function generateId(): string {
  return `dec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface DecisionBlockProps {
  node: { attrs: DecisionAttrs | Record<string, unknown> };
  updateAttributes: (attrs: Partial<DecisionAttrs>) => void;
  selected: boolean;
}

export default function DecisionBlock({ node, updateAttributes, selected }: DecisionBlockProps) {
  const attrs = node.attrs as DecisionAttrs;
  const [collapsed, setCollapsed] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleFieldChange = useCallback(
    (field: keyof DecisionAttrs, value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateAttributes({ [field]: value, updated_at: new Date().toISOString() });
      }, 300);
    },
    [updateAttributes],
  );

  const handleStatusChange = (status: DecisionStatus) => {
    updateAttributes({ status, updated_at: new Date().toISOString() });
  };

  const statusConfig = STATUS_CONFIG[attrs.status] || STATUS_CONFIG.active;

  const revisitDate = attrs.revisit_date ? new Date(attrs.revisit_date) : null;
  const isRevisitOverdue = revisitDate ? revisitDate < new Date() : false;
  const isRevisitToday = revisitDate
    ? revisitDate.toDateString() === new Date().toDateString()
    : false;

  const optionsList = (attrs.options || '').split('\n').filter(Boolean);
  const criteriaList = (attrs.criteria || '').split('\n').filter(Boolean);

  if (collapsed) {
    return (
      <NodeViewWrapper className="my-3">
        <div
          className={`border rounded-lg overflow-hidden transition-all ${
            selected ? 'ring-2 ring-blue-500/30' : ''
          } border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30`}
        >
          <div
            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            onClick={() => setCollapsed(false)}
          >
            <ChevronRight size={14} className="text-gray-400" />
            <Brain size={14} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate flex-1">
              {attrs.title || 'Untitled Decision'}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="my-3">
      <div
        className={`border rounded-lg overflow-hidden transition-all ${
          selected ? 'ring-2 ring-blue-500/30' : ''
        } border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50`}
        data-type="decision"
        data-decision-id={attrs.id}
      >
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Brain size={16} className="text-gray-400 shrink-0" />
            {editingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                className="flex-1 text-sm font-semibold bg-transparent border-none outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
                value={attrs.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingTitle(false);
                }}
                placeholder="Decision title..."
              />
            ) : (
              <span
                className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate cursor-text"
                onClick={() => setEditingTitle(true)}
              >
                {attrs.title || 'Untitled Decision'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {revisitDate && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${
                  isRevisitOverdue
                    ? 'text-red-400 bg-red-500/10'
                    : isRevisitToday
                      ? 'text-amber-400 bg-amber-500/10'
                      : 'text-gray-400 bg-gray-100 dark:bg-gray-700'
                }`}
              >
                <Calendar size={10} />
                {revisitDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}
            <button
              onClick={() => setCollapsed(true)}
              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Collapse"
            >
              <ChevronDown size={14} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="px-3 py-2 space-y-3">
          <div className="flex items-center gap-1.5">
            {(['active', 'decided', 'reconsideration'] as DecisionStatus[]).map((s) => {
              const cfg = STATUS_CONFIG[s];
              const Icon = cfg.icon;
              return (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`text-xs px-2 py-1 rounded border flex items-center gap-1 transition-colors ${
                    attrs.status === s
                      ? cfg.color
                      : 'text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon size={12} />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          <DecisionField
            label="Context"
            value={attrs.context}
            onChange={(v) => handleFieldChange('context', v)}
            placeholder="Why does this decision exist?"
            multiline
          />

          <DecisionListField
            label="Options"
            onChange={(v) => handleFieldChange('options', v)}
            placeholder="Add an option..."
            items={optionsList}
          />

          <DecisionListField
            label="Criteria"
            onChange={(v) => handleFieldChange('criteria', v)}
            placeholder="Add a criterion..."
            items={criteriaList}
          />

          <DecisionField
            label="Choice"
            value={attrs.choice}
            onChange={(v) => handleFieldChange('choice', v)}
            placeholder="What did you decide?"
          />

          <DecisionField
            label="Reasoning"
            value={attrs.reasoning}
            onChange={(v) => handleFieldChange('reasoning', v)}
            placeholder="Why this choice?"
            multiline
          />

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide w-20 shrink-0">
              Revisit
            </label>
            <input
              type="date"
              className="flex-1 text-sm bg-transparent border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              value={attrs.revisit_date ? attrs.revisit_date.slice(0, 10) : ''}
              onChange={(e) =>
                handleFieldChange('revisit_date', e.target.value ? new Date(e.target.value).toISOString() : '')
              }
            />
            {attrs.revisit_date && (
              <button
                onClick={() => handleFieldChange('revisit_date', '')}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Clear revisit date"
              >
                <X size={12} className="text-gray-400" />
              </button>
            )}
          </div>

          <DecisionField
            label="Outcome"
            value={attrs.outcome}
            onChange={(v) => handleFieldChange('outcome', v)}
            placeholder="What happened?"
            multiline
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}

function DecisionField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
        {label}
      </label>
      {multiline ? (
        <textarea
          className="w-full text-sm bg-transparent border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/30 resize-none"
          rows={2}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          className="w-full text-sm bg-transparent border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function DecisionListField({
  label,
  onChange,
  placeholder,
  items,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  items: string[];
}) {
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [adding]);

  const addItem = () => {
    if (!adding) {
      setAdding(true);
      return;
    }
    const val = inputRef.current?.value.trim();
    if (val) {
      const newItems = [...items, val];
      onChange(newItems.join('\n'));
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems.join('\n'));
  };

  return (
    <div>
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
        {label}
      </label>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 group">
            <span className="text-sm text-gray-700 dark:text-gray-200 flex-1">{item}</span>
            <button
              onClick={() => removeItem(i)}
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              title="Remove"
            >
              <X size={12} className="text-gray-400" />
            </button>
          </div>
        ))}
        {adding ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              className="flex-1 text-sm bg-transparent border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              placeholder={placeholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addItem();
                }
                if (e.key === 'Escape') {
                  setAdding(false);
                }
              }}
              onBlur={() => {
                if (inputRef.current?.value.trim()) {
                  addItem();
                }
                setAdding(false);
              }}
            />
          </div>
        ) : (
          <button
            onClick={addItem}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <Plus size={12} />
            Add {label.toLowerCase().slice(0, -1)}
          </button>
        )}
      </div>
    </div>
  );
}

export { generateId, STATUS_CONFIG };
