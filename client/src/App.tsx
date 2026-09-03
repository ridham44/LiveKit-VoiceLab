import { useEffect, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { RoomAudioRenderer, useTranscriptions } from '@livekit/components-react';
import { RoomEvent, type Room } from 'livekit-client';
import type { AgentConfigInput, KnowledgeDocumentDto } from '@voicelab/shared';
import { useVoiceLabRoom } from '@/hooks/useVoiceLabRoom';
import { useAgentConfig } from '@/hooks/useAgentConfig';
import { api } from '@/services/api';

function RangeControl({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (value: number) => void }) {
  return <label className="block space-y-2 text-sm font-medium"><span>{label}</span><div className="flex items-center gap-3"><input className="w-full accent-primary" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /><output className="w-20 rounded-md border px-2 py-1 text-center text-muted-foreground">{value}{unit}</output></div></label>;
}

function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-start justify-between gap-4 rounded-md border p-3"><span><span className="block text-sm font-medium">{label}</span>{description && <span className="mt-1 block text-xs text-muted-foreground">{description}</span>}</span><input className="mt-1 h-4 w-4 accent-primary" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function SettingsPanel({ config, setConfig, onSave, saving }: { config: AgentConfigInput; setConfig: Dispatch<SetStateAction<AgentConfigInput | null>>; onSave: () => void; saving: boolean }) {
  const update = (fn: (current: AgentConfigInput) => AgentConfigInput) => setConfig((current) => current ? fn(current) : current);
  const behavior = config.behaviorSettings;
  const voice = config.voiceSettings;
  const transcription = config.transcriptionSettings;
  const call = config.callSettings;
  return <section className="rounded-xl border bg-card p-5 shadow-sm">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Agent settings</h2><p className="text-sm text-muted-foreground">Save applies these preferences to the next voice call.</p></div><button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50" disabled={saving} onClick={onSave}>{saving ? 'Saving…' : 'Save settings'}</button></div>
    <div className="grid gap-5 lg:grid-cols-2">
      <fieldset className="space-y-4 rounded-lg border p-4"><legend className="px-1 font-semibold">Call settings</legend>
        <RangeControl label="Maximum call time" value={call.maxDurationSec / 60} min={1} max={120} step={1} unit=" min" onChange={(value) => update((c) => ({ ...c, callSettings: { ...c.callSettings, maxDurationSec: value * 60 } }))} />
        <Toggle label="Idle time and reminders" description="Remind the caller after silence." checked={call.idleDetection.enabled} onChange={(value) => update((c) => ({ ...c, callSettings: { ...c.callSettings, idleDetection: { ...c.callSettings.idleDetection, enabled: value } } }))} />
        <RangeControl label="First reminder after" value={call.idleDetection.awayTimeoutSec} min={1} max={120} step={1} unit=" sec" onChange={(value) => update((c) => ({ ...c, callSettings: { ...c.callSettings, idleDetection: { ...c.callSettings.idleDetection, awayTimeoutSec: value } } }))} />
        <RangeControl label="Reminder count" value={call.idleDetection.reminderMaxCount} min={0} max={5} step={1} unit="x" onChange={(value) => update((c) => ({ ...c, callSettings: { ...c.callSettings, idleDetection: { ...c.callSettings.idleDetection, reminderMaxCount: value } } }))} />
        <RangeControl label="End call after silence" value={call.idleDetection.endCallAfterSilenceSec} min={0} max={600} step={5} unit=" sec" onChange={(value) => update((c) => ({ ...c, callSettings: { ...c.callSettings, idleDetection: { ...c.callSettings.idleDetection, endCallAfterSilenceSec: value } } }))} />
        <RangeControl label="Wait before speaking" value={call.waitBeforeSpeakingMs / 1000} min={0} max={5} step={0.1} unit=" sec" onChange={(value) => update((c) => ({ ...c, callSettings: { ...c.callSettings, waitBeforeSpeakingMs: Math.round(value * 1000) } }))} />
      </fieldset>
      <fieldset className="space-y-4 rounded-lg border p-4"><legend className="px-1 font-semibold">Agent behavior</legend>
        <RangeControl label="LLM temperature" value={behavior.llmTemperature} min={0} max={2} step={0.1} onChange={(value) => update((c) => ({ ...c, behaviorSettings: { ...c.behaviorSettings, llmTemperature: value } }))} />
        <RangeControl label="Response endpoint delay" value={behavior.endpointing.minDelayMs} min={0} max={5000} step={100} unit=" ms" onChange={(value) => update((c) => ({ ...c, behaviorSettings: { ...c.behaviorSettings, endpointing: { ...c.behaviorSettings.endpointing, minDelayMs: value } } }))} />
        <Toggle label="Dynamic response" description="Adjust reply style based on the user's input." checked={behavior.dynamicResponse.enabled} onChange={(value) => update((c) => ({ ...c, behaviorSettings: { ...c.behaviorSettings, dynamicResponse: { ...c.behaviorSettings.dynamicResponse, enabled: value } } }))} />
        <Toggle label="Enable backchanneling" description="Use brief acknowledgements while listening." checked={behavior.backchanneling.enabled} onChange={(value) => update((c) => ({ ...c, behaviorSettings: { ...c.behaviorSettings, backchanneling: { ...c.behaviorSettings.backchanneling, enabled: value } } }))} />
        <label className="block text-sm font-medium">Backchannel words<textarea className="mt-2 min-h-20 w-full rounded-md border p-2 font-normal" value={behavior.backchanneling.words.join(', ')} onChange={(event) => update((c) => ({ ...c, behaviorSettings: { ...c.behaviorSettings, backchanneling: { ...c.behaviorSettings.backchanneling, words: event.target.value.split(',').map((word) => word.trim()).filter(Boolean) } } }))} /></label>
        <label className="block text-sm font-medium">Hold phrases<textarea className="mt-2 min-h-20 w-full rounded-md border p-2 font-normal" value={behavior.holdPhrases.map((phrase) => phrase.phrase).join(', ')} onChange={(event) => update((c) => ({ ...c, behaviorSettings: { ...c.behaviorSettings, holdPhrases: event.target.value.split(',').map((phrase) => phrase.trim()).filter(Boolean).slice(0, 20).map((phrase) => ({ phrase, silenceMs: 3000 })) } }))} /></label>
      </fieldset>
      <fieldset className="space-y-4 rounded-lg border p-4"><legend className="px-1 font-semibold">Transcription & speech</legend>
        <div className="space-y-2 text-sm font-medium"><span>Transcription mode</span><div className="flex gap-4">{(['fast', 'accurate', 'custom'] as const).map((mode) => <label key={mode} className="font-normal capitalize"><input className="mr-1 accent-primary" type="radio" checked={transcription.mode === mode} onChange={() => update((c) => ({ ...c, transcriptionSettings: { ...c.transcriptionSettings, mode } }))} />{mode}</label>)}</div></div>
        <label className="block text-sm font-medium">Language<select className="mt-2 w-full rounded-md border bg-background p-2 font-normal" value={transcription.language} onChange={(event) => update((c) => ({ ...c, transcriptionSettings: { ...c.transcriptionSettings, language: event.target.value } }))}><option value="en">English</option><option value="hi">Hindi</option><option value="es">Spanish</option><option value="fr">French</option></select></label>
        <label className="block text-sm font-medium">Boosted keywords<textarea className="mt-2 min-h-20 w-full rounded-md border p-2 font-normal" placeholder="Pagani, product names, technical terms" value={transcription.vocabulary.join(', ')} onChange={(event) => update((c) => ({ ...c, transcriptionSettings: { ...c.transcriptionSettings, vocabulary: event.target.value.split(',').map((word) => word.trim()).filter(Boolean) } }))} /></label>
      </fieldset>
      <fieldset className="space-y-4 rounded-lg border p-4"><legend className="px-1 font-semibold">Voice settings</legend>
        <label className="block text-sm font-medium">Voice<select className="mt-2 w-full rounded-md border bg-background p-2 font-normal" value={voice.voiceId} onChange={(event) => update((c) => ({ ...c, voiceSettings: { ...c.voiceSettings, voiceId: event.target.value } }))}><option value="alloy">Alloy</option><option value="nova">Nova</option><option value="shimmer">Shimmer</option></select></label>
        <RangeControl label="Voice speed" value={voice.speed} min={0.5} max={2} step={0.05} onChange={(value) => update((c) => ({ ...c, voiceSettings: { ...c.voiceSettings, speed: value } }))} />
        <RangeControl label="Voice volume" value={voice.volume} min={0.2} max={2} step={0.1} onChange={(value) => update((c) => ({ ...c, voiceSettings: { ...c.voiceSettings, volume: value } }))} />
        <div className="space-y-2 text-sm font-medium"><span>Noise cancellation</span><label className="block font-normal"><input className="mr-1 accent-primary" type="radio" checked={!voice.noiseCancellation && !voice.voiceIsolation} onChange={() => update((c) => ({ ...c, voiceSettings: { ...c.voiceSettings, noiseCancellation: false, voiceIsolation: false } }))} />Off</label><label className="block font-normal"><input className="mr-1 accent-primary" type="radio" checked={voice.noiseCancellation && !voice.voiceIsolation} onChange={() => update((c) => ({ ...c, voiceSettings: { ...c.voiceSettings, noiseCancellation: true, voiceIsolation: false } }))} />Remove noise</label><label className="block font-normal"><input className="mr-1 accent-primary" type="radio" checked={voice.voiceIsolation} onChange={() => update((c) => ({ ...c, voiceSettings: { ...c.voiceSettings, noiseCancellation: true, voiceIsolation: true } }))} />Remove noise + background speech</label></div>
        <label className="block text-sm font-medium">Background sound<select className="mt-2 w-full rounded-md border bg-background p-2 font-normal" value={voice.backgroundAudio.ambience} onChange={(event) => update((c) => ({ ...c, voiceSettings: { ...c.voiceSettings, backgroundAudio: { ...c.voiceSettings.backgroundAudio, ambience: event.target.value, enabled: event.target.value !== 'none' } } }))}><option value="none">None</option><option value="office-ambience">Coffee shop / office</option><option value="hold-music">Hold music</option></select></label>
      </fieldset>
    </div>
  </section>;
}

function LiveTranscript({ room }: { room: Room }) {
  const entries = useTranscriptions({ room });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track whether an agent participant has joined
  const [agentJoined, setAgentJoined] = useState(false);
  const [agentState, setAgentState] = useState<string>('initializing');

  useEffect(() => {
    // Check if agent is already in the room
    for (const p of room.remoteParticipants.values()) {
      if (p.identity.startsWith('agent-') || p.metadata?.includes('agent')) {
        setAgentJoined(true);
        break;
      }
    }

    // Watch for participants joining/leaving
    const onJoin = (p: any) => {
      if (p.identity?.startsWith('agent-') || p.kind === 2 /* ParticipantKind.AGENT */) {
        setAgentJoined(true);
        setAgentState('listening');
        console.log('[CLIENT] Agent participant joined room:', p.identity);
      }
    };
    const onLeave = (p: any) => {
      if (p.identity?.startsWith('agent-') || p.kind === 2) {
        setAgentJoined(false);
        setAgentState('disconnected');
        console.warn('[CLIENT] Agent participant left room:', p.identity);
      }
    };
    const onAttributeChanged = (attrs: Record<string, string>, p: any) => {
      if ((p.identity?.startsWith('agent-') || p.kind === 2) && attrs['lk.agent.state']) {
        setAgentState(attrs['lk.agent.state']);
        console.log('[CLIENT] Agent state:', attrs['lk.agent.state']);
      }
    };

    room.on(RoomEvent.ParticipantConnected, onJoin);
    room.on(RoomEvent.ParticipantDisconnected, onLeave);
    room.on(RoomEvent.ParticipantAttributesChanged, onAttributeChanged);
    return () => {
      room.off(RoomEvent.ParticipantConnected, onJoin);
      room.off(RoomEvent.ParticipantDisconnected, onLeave);
      room.off(RoomEvent.ParticipantAttributesChanged, onAttributeChanged);
    };
  }, [room]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [entries]);

  const agentStateColor =
    agentState === 'speaking' ? 'text-green-600' :
    agentState === 'thinking' ? 'text-yellow-600' :
    agentState === 'listening' ? 'text-blue-600' :
    agentState === 'disconnected' ? 'text-red-600' : 'text-muted-foreground';

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="border-b px-5 py-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Live conversation</h2>
          <p className="text-sm text-muted-foreground">Your speech and the agent&apos;s reply appear here as text.</p>
        </div>
        <span className={`text-xs font-medium ${agentStateColor}`}>
          Agent: {agentJoined ? agentState : 'waiting to join…'}
        </span>
      </div>
      <div ref={scrollRef} className="max-h-96 min-h-48 space-y-3 overflow-y-auto p-5">
        {entries.length === 0 ? (
          agentJoined ? (
            <p className="text-sm text-muted-foreground">Listening for speech… speak into your microphone.</p>
          ) : (
            <p className="text-sm text-amber-600">⏳ Waiting for the agent to join. Make sure the agent worker is running (<code>npm run dev:agent</code>).</p>
          )
        ) : (
          entries.map((entry, index) => {
            const isYou = entry.participantInfo.identity === room.localParticipant.identity;
            return (
              <article key={`${entry.streamInfo.id}-${index}`} className={`rounded-lg p-3 text-sm ${isYou ? 'ml-8 bg-primary text-primary-foreground' : 'mr-8 bg-muted'}`}>
                <p className="mb-1 text-xs font-semibold opacity-75">{isYou ? 'You' : 'Agent'}</p>
                <p>{entry.text || '…'}</p>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function KnowledgePanel({ agentId }: { agentId: string }) {
  const [documents, setDocuments] = useState<KnowledgeDocumentDto[]>([]);
  const [uploading, setUploading] = useState(false);

  const refresh = async () => setDocuments(await api.knowledge.list(agentId));
  useEffect(() => { void refresh(); }, [agentId]);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.knowledge.upload(agentId, file);
      await refresh();
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Knowledge documents</h2>
          <p className="text-sm text-muted-foreground">Upload <code>docs/pagani.txt</code>, wait for Ready, then ask the agent about it.</p>
        </div>
        <label className="cursor-pointer rounded-md border px-3 py-2 text-sm font-medium">
          {uploading ? 'Uploading…' : 'Upload document'}
          <input className="hidden" type="file" accept=".txt,.md,.pdf,.docx" disabled={uploading} onChange={(event) => void upload(event)} />
        </label>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        {documents.length === 0 ? <p className="text-muted-foreground">No document uploaded yet.</p> : documents.map((document) => (
          <div key={document.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
            <span>{document.filename}</span>
            <span className={document.status === 'READY' ? 'font-medium text-green-600' : 'text-muted-foreground'}>{document.status}{document.chunkCount ? ` · ${document.chunkCount} chunks` : ''}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function App() {
  const { agent, draft, setDraft, loading, reload, save } = useAgentConfig();
  const { room, phase, error, micPermission, connect, disconnect } = useVoiceLabRoom(agent?.id);
  const isConnected = phase === 'connected';
  const [saving, setSaving] = useState(false);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await save();
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm font-medium text-primary">LiveKit VoiceLab</p>
          <h1 className="text-3xl font-semibold tracking-tight">Talk to your document agent</h1>
          <p className="text-muted-foreground">Speak naturally; your words and the agent&apos;s answer will be shown below.</p>
        </header>

        <section className="rounded-xl border bg-card p-6 shadow-sm">
          {loading ? <p className="text-muted-foreground">Loading agent configuration…</p> : agent ? <div className="space-y-5">
            <div><h2 className="text-lg font-semibold">{agent.name}</h2>{draft && <p className="text-sm text-muted-foreground">Model: {draft.behaviorSettings.llmModel} · Voice: {draft.voiceSettings.voiceId}</p>}</div>
            <div className="flex flex-wrap items-center gap-3">
              {isConnected ? <button className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground" onClick={() => void disconnect()}>End call</button> : <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50" disabled={phase === 'connecting'} onClick={() => void connect()}>{phase === 'connecting' ? 'Connecting…' : 'Start voice call'}</button>}
              <span className="text-sm text-muted-foreground">Status: {phase}</span>
              {micPermission !== 'unknown' && <span className="text-sm text-muted-foreground">Microphone: {micPermission}</span>}
            </div>
            {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          </div> : <div className="space-y-3"><p className="text-muted-foreground">No seeded agent was found. Run <code>npm run db:seed</code>, then retry.</p><button className="rounded-md border px-4 py-2 text-sm" onClick={() => void reload()}>Retry</button></div>}
        </section>

        {room && <><RoomAudioRenderer room={room} /><LiveTranscript room={room} /></>}
        {agent && <KnowledgePanel agentId={agent.id} />}
        {draft && <SettingsPanel config={draft} setConfig={setDraft} onSave={() => void saveSettings()} saving={saving} />}
      </div>
    </main>
  );
}

export default App;
