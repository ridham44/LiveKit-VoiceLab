import { createContext, useContext, type ReactNode } from 'react';
import { useAgentConfig } from '@/hooks/useAgentConfig';

type AgentConfigContextValue = ReturnType<typeof useAgentConfig>;

const AgentConfigContext = createContext<AgentConfigContextValue | null>(null);

export function AgentConfigProvider({ children }: { children: ReactNode }) {
  const value = useAgentConfig();
  return <AgentConfigContext.Provider value={value}>{children}</AgentConfigContext.Provider>;
}

export function useAgentConfigContext(): AgentConfigContextValue {
  const ctx = useContext(AgentConfigContext);
  if (!ctx) throw new Error('useAgentConfigContext must be used within AgentConfigProvider');
  return ctx;
}
