import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { AgentConfigInput, AgentDto } from '@voicelab/shared';
import { api } from '@/services/api';

/**
 * Loads the (single, for this dashboard) agent and its active configuration, and tracks a local
 * draft the Settings pages mutate. `save()` persists the draft as the new active AgentConfig
 * (server/src/services/agents.ts keeps prior versions rather than overwriting them). The next
 * session picks up the saved config automatically (agent/src/agent.ts fetches it fresh per job);
 * an already-running call only sees it if pushed live via the RPC bridge (see LiveTestPanel).
 */
export function useAgentConfig() {
  const [agent, setAgent] = useState<AgentDto | null>(null);
  const [draft, setDraft] = useState<AgentConfigInput | null>(null);
  const [saved, setSaved] = useState<AgentConfigInput | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const agents = await api.agents.list();
      const first = agents[0] ?? null;
      setAgent(first);
      if (first?.activeConfig) {
        const { id, agentId, isActive, createdAt, ...input } = first.activeConfig;
        void id;
        void agentId;
        void isActive;
        void createdAt;
        setDraft(input);
        setSaved(input);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load agent configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const save = useCallback(async () => {
    if (!agent || !draft) return;
    try {
      await api.agents.saveConfig(agent.id, draft);
      setSaved(draft);
      toast.success('Configuration saved — active for the next session.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save configuration');
    }
  }, [agent, draft]);

  const reset = useCallback(() => {
    setDraft(saved);
  }, [saved]);

  return { agent, draft, setDraft, dirty, loading, save, reset, reload };
}
