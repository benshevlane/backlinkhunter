'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/src/lib/supabase/client';
import type { ProspectRecord, ProspectStatus } from '@/src/lib/types';

interface Column {
  key: ProspectStatus;
  label: string;
  color: string;
  collapsed?: boolean;
}

const COLUMNS: Column[] = [
  { key: 'identified', label: 'Identified', color: 'bg-slate-100 border-slate-300' },
  { key: 'enriched', label: 'Enriched', color: 'bg-blue-50 border-blue-300' },
  { key: 'outreach_drafted', label: 'Draft Ready', color: 'bg-purple-50 border-purple-300' },
  { key: 'contacted', label: 'Contacted', color: 'bg-amber-50 border-amber-300' },
  { key: 'followed_up', label: 'Followed Up', color: 'bg-orange-50 border-orange-300' },
  { key: 'won', label: 'Won', color: 'bg-green-50 border-green-300' },
  { key: 'lost', label: 'Lost', color: 'bg-red-50 border-red-300', collapsed: true },
];

const QUICK_ACTIONS: Record<string, { label: string; action: string }> = {
  identified: { label: 'Enrich', action: 'enrich' },
  enriched: { label: 'Draft Email', action: 'draft' },
  outreach_drafted: { label: 'Review Email', action: 'review' },
  contacted: { label: 'Send Follow-up', action: 'followup' },
  won: { label: 'Verify Link', action: 'verify' },
};

interface Props {
  projectId: string;
  initialProspects: ProspectRecord[];
  onSelectProspect: (prospect: ProspectRecord) => void;
}

export function PipelineBoard({ projectId, initialProspects, onSelectProspect }: Props) {
  const [prospects, setProspects] = useState<ProspectRecord[]>(initialProspects);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(
    new Set(COLUMNS.filter((c) => c.collapsed).map((c) => c.key)),
  );
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [minDA, setMinDA] = useState(0);
  const [minScore, setMinScore] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [contactOnly, setContactOnly] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`prospects-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prospects',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setProspects((prev) =>
              prev.map((p) =>
                p.id === (payload.new as ProspectRecord).id
                  ? (payload.new as ProspectRecord)
                  : p,
              ),
            );
          } else if (payload.eventType === 'INSERT') {
            setProspects((prev) => [payload.new as ProspectRecord, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setProspects((prev) =>
              prev.filter((p) => p.id !== (payload.old as { id: string }).id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Sync with parent when initialProspects changes
  useEffect(() => {
    setProspects(initialProspects);
  }, [initialProspects]);

  const filteredProspects = prospects.filter((p) => {
    if (searchQuery && !p.prospect_domain.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (minDA > 0 && (p.domain_authority ?? 0) < minDA) return false;
    if (minScore > 0 && (p.linkability_score ?? 0) < minScore) return false;
    if (selectedTypes.length > 0 && p.opportunity_type && !selectedTypes.includes(p.opportunity_type)) {
      return false;
    }
    if (contactOnly && !p.contact_email) return false;
    return true;
  });

  async function moveProspect(id: string, newStatus: ProspectStatus) {
    setError(null);

    // Optimistic update
    setProspects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)),
    );

    const res = await fetch(`/api/prospects/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      // Revert on failure
      setProspects((prev) =>
        prev.map((p) => {
          const original = initialProspects.find((ip) => ip.id === p.id);
          return p.id === id && original ? original : p;
        }),
      );
      setError('Failed to update prospect status');
    }
  }

  async function handleQuickAction(prospect: ProspectRecord, action: string) {
    setError(null);
    setWorkingId(prospect.id);

    try {
      if (action === 'enrich') {
        const res = await fetch('/api/prospects/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prospect_id: prospect.id }),
        });
        if (!res.ok) throw new Error('Enrichment failed');
      } else if (action === 'draft') {
        const res = await fetch('/api/outreach/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prospect_id: prospect.id,
            tone: 'professional',
            is_followup: false,
          }),
        });
        if (!res.ok) throw new Error('Draft generation failed');
      } else if (action === 'review' || action === 'followup') {
        onSelectProspect(prospect);
        return;
      } else if (action === 'verify') {
        const res = await fetch('/api/links/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prospect_id: prospect.id }),
        });
        if (!res.ok) throw new Error('Link verification failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setWorkingId(null);
    }
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e: React.DragEvent, status: ProspectStatus) {
    e.preventDefault();
    if (draggedId) {
      moveProspect(draggedId, status);
      setDraggedId(null);
    }
  }

  function toggleColumn(key: string) {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function daysSince(dateStr: string | null): number | null {
    if (!dateStr) return null;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  }

  const EMPTY_CTAS: Record<string, string> = {
    identified: 'Ask Claude to find prospects \u2192',
    enriched: 'Claude can enrich all contacts automatically \u2192',
    outreach_drafted: 'Claude can draft emails for all enriched prospects \u2192',
    won: 'Your won links will appear here once confirmed',
  };

  return (
    <div className="flex h-full flex-col">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white p-3">
        <input
          type="text"
          placeholder="Search domains..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs w-40 focus:border-slate-500 focus:outline-none"
        />
        <label className="flex items-center gap-1 text-xs text-slate-600">
          Min DA:
          <input
            type="range"
            min={0}
            max={100}
            value={minDA}
            onChange={(e) => setMinDA(Number(e.target.value))}
            className="w-20"
          />
          <span className="w-6 text-right">{minDA}</span>
        </label>
        <label className="flex items-center gap-1 text-xs text-slate-600">
          Min Score:
          <input
            type="range"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-20"
          />
          <span className="w-6 text-right">{minScore}</span>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={contactOnly}
            onChange={(e) => setContactOnly(e.target.checked)}
            className="rounded"
          />
          Contact found
        </label>
      </div>

      {error && (
        <div className="mx-3 mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Kanban columns */}
      <div className="flex-1 overflow-x-auto p-3">
        <div className="flex gap-3 h-full" style={{ minWidth: `${COLUMNS.length * 240}px` }}>
          {COLUMNS.map((column) => {
            const items = filteredProspects.filter((p) => p.status === column.key);
            const isCollapsed = collapsedColumns.has(column.key);

            if (isCollapsed) {
              return (
                <div
                  key={column.key}
                  className="flex-shrink-0 w-10 cursor-pointer"
                  onClick={() => toggleColumn(column.key)}
                >
                  <div className={`h-full rounded-lg border ${column.color} p-2 flex flex-col items-center`}>
                    <span className="text-xs font-semibold text-slate-600 [writing-mode:vertical-lr]">
                      {column.label} ({items.length})
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={column.key}
                className="flex-shrink-0 w-56"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.key)}
              >
                <div className={`h-full rounded-lg border ${column.color} flex flex-col`}>
                  <div
                    className="flex items-center justify-between p-2 cursor-pointer"
                    onClick={() => toggleColumn(column.key)}
                  >
                    <h3 className="text-xs font-semibold text-slate-800">{column.label}</h3>
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                      {items.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 pt-0 space-y-2">
                    {items.length === 0 && EMPTY_CTAS[column.key] && (
                      <p className="text-[11px] text-slate-400 text-center py-4 px-2">
                        {EMPTY_CTAS[column.key]}
                      </p>
                    )}

                    {items.map((prospect) => {
                      const days = daysSince(prospect.updated_at);
                      const quickAction = QUICK_ACTIONS[prospect.status];

                      return (
                        <article
                          key={prospect.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, prospect.id)}
                          onClick={() => onSelectProspect(prospect)}
                          className={`rounded-md border border-slate-200 bg-white p-2 cursor-pointer hover:border-slate-400 transition-colors ${
                            draggedId === prospect.id ? 'opacity-50' : ''
                          } ${selectedIds.has(prospect.id) ? 'ring-2 ring-slate-400' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs font-medium text-slate-900 truncate flex-1">
                              {prospect.prospect_domain}
                            </p>
                            <span
                              className={`flex-shrink-0 h-2 w-2 rounded-full mt-1 ${
                                prospect.contact_email ? 'bg-green-400' : 'bg-slate-300'
                              }`}
                              title={prospect.contact_email ? 'Contact found' : 'No contact'}
                            />
                          </div>

                          {prospect.opportunity_type && (
                            <span className="mt-1 inline-block rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                              {prospect.opportunity_type.replace('_', ' ')}
                            </span>
                          )}

                          <div className="mt-1.5 flex items-center gap-2">
                            {prospect.domain_authority != null && (
                              <span
                                className={`rounded px-1 py-0.5 text-[10px] font-medium ${
                                  prospect.domain_authority >= 50
                                    ? 'bg-green-100 text-green-700'
                                    : prospect.domain_authority >= 20
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                DA {prospect.domain_authority}
                              </span>
                            )}
                            {prospect.linkability_score != null && (
                              <span className="text-[10px] text-slate-500">
                                Score: {prospect.linkability_score}
                              </span>
                            )}
                          </div>

                          {days != null && days > 7 && (
                            <p
                              className={`mt-1 text-[10px] ${
                                days > 14 ? 'text-red-500' : 'text-amber-500'
                              }`}
                            >
                              {days}d since update
                            </p>
                          )}

                          {quickAction && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickAction(prospect, quickAction.action);
                              }}
                              disabled={workingId === prospect.id}
                              className="mt-1.5 w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                            >
                              {workingId === prospect.id ? 'Working...' : quickAction.label}
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="border-t border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
          <span className="text-xs text-slate-600">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
