import { useVoiceLabRoom } from '@/hooks/useVoiceLabRoom';
import { useAgentConfig } from '@/hooks/useAgentConfig';

function App() {
  const { agent, draft, loading, reload } = useAgentConfig();
  const { phase, error, micPermission, connect, disconnect } = useVoiceLabRoom(agent?.id);

  const isConnected = phase === 'connected';
  const isConnecting = phase === 'connecting';

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm font-medium text-primary">LiveKit VoiceLab</p>
          <h1 className="text-3xl font-semibold tracking-tight">Voice agent test console</h1>
          <p className="text-muted-foreground">
            Start a browser call to the configured LiveKit voice agent.
          </p>
        </header>

        <section className="rounded-xl border bg-card p-6 shadow-sm">
          {loading ? (
            <p className="text-muted-foreground">Loading agent configuration…</p>
          ) : agent ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold">{agent.name}</h2>
                {agent.description && <p className="mt-1 text-sm text-muted-foreground">{agent.description}</p>}
              </div>

              {draft && (
                <dl className="grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Speech to text</dt>
                    <dd className="font-medium capitalize">{draft.transcriptionSettings.sttProvider}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Language model</dt>
                    <dd className="font-medium">{draft.behaviorSettings.llmModel}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Voice</dt>
                    <dd className="font-medium capitalize">{draft.voiceSettings.voiceId}</dd>
                  </div>
                </dl>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {isConnected ? (
                  <button className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground" onClick={() => void disconnect()}>
                    End call
                  </button>
                ) : (
                  <button
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isConnecting}
                    onClick={() => void connect()}
                  >
                    {isConnecting ? 'Connecting…' : 'Start voice call'}
                  </button>
                )}
                <span className="text-sm text-muted-foreground">Status: {phase}</span>
                {micPermission !== 'unknown' && <span className="text-sm text-muted-foreground">Microphone: {micPermission}</span>}
              </div>

              {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground">No seeded agent was found. Run <code>npm run db:seed</code> in the project root, then reload.</p>
              <button className="rounded-md border px-4 py-2 text-sm font-medium" onClick={() => void reload()}>
                Retry
              </button>
            </div>
          )}
        </section>

        <p className="text-sm text-muted-foreground">
          The API runs at <code>http://localhost:4100</code>. This dashboard runs at <code>http://localhost:5173</code>.
        </p>
      </div>
    </main>
  );
}

export default App;
