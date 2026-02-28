'use client';

import { useState } from 'react';
import type { ProjectRecord, ProspectRecord } from '@/src/lib/types';
import { PipelineBoard } from './PipelineBoard';
import { ProspectDetailDrawer } from './ProspectDetailDrawer';
import { AgentChat } from '@/components/agent/AgentChat';

interface Props {
  project: ProjectRecord;
  initialProspects: ProspectRecord[];
  hasEmailIntegration: boolean;
}

type MobileTab = 'pipeline' | 'chat';

export function PipelinePage({ project, initialProspects, hasEmailIntegration }: Props) {
  const [selectedProspect, setSelectedProspect] = useState<ProspectRecord | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>('pipeline');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex h-[calc(100vh-48px)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{project.name}</h1>
          <p className="text-xs text-slate-500">Pipeline &middot; {project.target_url}</p>
        </div>

        {!hasEmailIntegration && (
          <a
            href="/settings/integrations"
            className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100"
          >
            Connect Gmail to send outreach &rarr;
          </a>
        )}
      </div>

      {/* Mobile tab switcher */}
      <div className="flex border-b border-slate-200 lg:hidden">
        <button
          onClick={() => setMobileTab('pipeline')}
          className={`flex-1 py-2 text-sm font-medium border-b-2 ${
            mobileTab === 'pipeline'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500'
          }`}
        >
          Pipeline
        </button>
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-2 text-sm font-medium border-b-2 ${
            mobileTab === 'chat'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500'
          }`}
        >
          Agent Chat
        </button>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel: Kanban (65%) */}
        <div
          className={`flex-1 lg:flex lg:w-[65%] ${
            mobileTab === 'pipeline' ? 'flex' : 'hidden'
          }`}
        >
          <div className="flex-1 overflow-hidden">
            <PipelineBoard
              key={refreshKey}
              projectId={project.id}
              initialProspects={initialProspects}
              onSelectProspect={setSelectedProspect}
            />
          </div>
        </div>

        {/* Right panel: Agent Chat (35%) */}
        <div
          className={`border-l border-slate-200 bg-slate-50 lg:flex lg:w-[35%] lg:flex-col ${
            mobileTab === 'chat' ? 'flex flex-col flex-1' : 'hidden'
          }`}
        >
          <AgentChat
            projectId={project.id}
            onProspectsImported={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      </div>

      {/* Prospect detail drawer */}
      {selectedProspect && (
        <ProspectDetailDrawer
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
          hasEmailIntegration={hasEmailIntegration}
        />
      )}
    </div>
  );
}
