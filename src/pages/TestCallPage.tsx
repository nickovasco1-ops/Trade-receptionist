/**
 * TestCallPage — browser-based agent test harness.
 * Accessible at /test-call (protected, never linked from marketing).
 * Uses Retell's Web SDK to talk to the live agent via browser mic —
 * no phone required, costs a fraction of a real call.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import { Logo } from '../../components/Logo';

type CallState = 'idle' | 'connecting' | 'active' | 'ended' | 'error';

interface TranscriptLine {
  role: 'agent' | 'user';
  text: string;
}

const AGENT_ID = 'agent_b102cf665d4476eabb24764bf8';
const API_BASE = import.meta.env.VITE_API_URL ?? 'https://trade-receptionist-production.up.railway.app';

export default function TestCallPage() {
  const [state, setState] = useState<CallState>('idle');
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const clientRef = useRef<RetellWebClient | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const startCall = useCallback(async () => {
    setError(null);
    setTranscript([]);
    setCallId(null);
    setState('connecting');

    try {
      // Create a web call via our backend proxy (keeps the API key server-side)
      const res = await fetch(`${API_BASE}/calls/create-web-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: AGENT_ID }),
      });
      const data = await res.json() as { access_token?: string; call_id?: string; error?: string };
      if (!data.access_token) throw new Error(data.error ?? 'No access token returned');

      setCallId(data.call_id ?? null);

      const client = new RetellWebClient();
      clientRef.current = client;

      client.on('call_started', () => setState('active'));
      client.on('call_ended', () => { setState('ended'); clientRef.current = null; });
      client.on('error', (e) => { setError(String(e)); setState('error'); clientRef.current = null; });

      client.on('update', (update: { transcript?: Array<{ role: string; content: string }> }) => {
        if (update.transcript) {
          setTranscript(
            update.transcript.map(t => ({
              role: t.role === 'agent' ? 'agent' : 'user',
              text: t.content,
            }))
          );
        }
      });

      await client.startCall({ accessToken: data.access_token });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState('error');
    }
  }, []);

  const endCall = useCallback(() => {
    clientRef.current?.stopCall();
    setState('ended');
    clientRef.current = null;
  }, []);

  const toggleMute = useCallback(() => {
    if (!clientRef.current) return;
    const next = !isMuted;
    clientRef.current.mute(next);
    setIsMuted(next);
  }, [isMuted]);

  const stateColors: Record<CallState, string> = {
    idle: 'bg-white/[0.06]',
    connecting: 'bg-blue-500/20 border-blue-400/40',
    active: 'bg-green-500/15 border-green-400/40',
    ended: 'bg-white/[0.06]',
    error: 'bg-red-500/15 border-red-400/40',
  };

  const stateLabel: Record<CallState, string> = {
    idle: 'Ready to test',
    connecting: 'Connecting…',
    active: '● Live',
    ended: 'Call ended',
    error: 'Error',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020D18', fontFamily: "'Manrope','Helvetica Neue',Arial,sans-serif" }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Logo height={36} />
        <span style={{ color: 'rgba(240,244,248,0.40)', fontSize: 13, marginLeft: 8 }}>Agent Test Console</span>
        <span style={{
          marginLeft: 'auto', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase' as const, padding: '4px 10px', borderRadius: 6,
          background: state === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
          color: state === 'active' ? '#86efac' : 'rgba(240,244,248,0.40)',
          border: `1px solid ${state === 'active' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
        }}>
          {stateLabel[state]}
        </span>
      </header>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>

        {/* Title */}
        <h1 style={{ fontFamily: "'Space Grotesk',Arial,sans-serif", fontSize: 28, fontWeight: 700, color: '#F0F4F8', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
          Test your AI receptionist
        </h1>
        <p style={{ color: 'rgba(240,244,248,0.55)', fontSize: 15, margin: '0 0 32px', lineHeight: 1.6 }}>
          Talk to the agent live in your browser — no phone needed. The full calendar booking flow runs exactly as it would on a real call.
        </p>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' as const }}>
          {state === 'idle' || state === 'ended' || state === 'error' ? (
            <button onClick={startCall} style={{
              padding: '14px 32px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#FF6B2B,#FF8C55)',
              boxShadow: '0 8px 24px rgba(255,107,43,0.3)',
              color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: 'inherit',
            }}>
              {state === 'error' ? 'Retry call' : '▶ Start test call'}
            </button>
          ) : state === 'connecting' ? (
            <button disabled style={{
              padding: '14px 32px', borderRadius: 12, border: 'none',
              background: 'rgba(255,255,255,0.08)', color: 'rgba(240,244,248,0.4)',
              fontWeight: 700, fontSize: 15, fontFamily: 'inherit',
            }}>
              Connecting…
            </button>
          ) : (
            <>
              <button onClick={endCall} style={{
                padding: '14px 32px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.4)',
                cursor: 'pointer', background: 'rgba(239,68,68,0.1)',
                color: '#fca5a5', fontWeight: 700, fontSize: 15, fontFamily: 'inherit',
              }}>
                ■ End call
              </button>
              <button onClick={toggleMute} style={{
                padding: '14px 24px', borderRadius: 12, cursor: 'pointer',
                border: `1px solid ${isMuted ? 'rgba(255,107,43,0.4)' : 'rgba(255,255,255,0.12)'}`,
                background: isMuted ? 'rgba(255,107,43,0.1)' : 'rgba(255,255,255,0.06)',
                color: isMuted ? '#ffb59a' : 'rgba(240,244,248,0.7)',
                fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
              }}>
                {isMuted ? '🔇 Unmute' : '🎤 Mute'}
              </button>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, color: '#fca5a5', fontSize: 14 }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Call ID */}
        {callId && (
          <div style={{ marginBottom: 16, fontSize: 12, color: 'rgba(240,244,248,0.35)', fontFamily: 'monospace' }}>
            call_id: {callId}
          </div>
        )}

        {/* Transcript */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: '20px 24px', minHeight: 320, maxHeight: 520, overflowY: 'auto' as const,
        }}>
          {transcript.length === 0 ? (
            <p style={{ color: 'rgba(240,244,248,0.25)', fontSize: 14, textAlign: 'center' as const, marginTop: 80 }}>
              {state === 'idle' ? 'Start a call to see the live transcript here.' :
               state === 'connecting' ? 'Waiting for connection…' : 'Transcript will appear here.'}
            </p>
          ) : (
            transcript.map((line, i) => (
              <div key={i} style={{
                marginBottom: 14,
                textAlign: line.role === 'user' ? 'right' as const : 'left' as const,
              }}>
                <span style={{
                  display: 'inline-block', maxWidth: '78%',
                  background: line.role === 'agent' ? 'rgba(255,107,43,0.10)' : 'rgba(153,203,255,0.10)',
                  border: `1px solid ${line.role === 'agent' ? 'rgba(255,107,43,0.2)' : 'rgba(153,203,255,0.2)'}`,
                  borderRadius: 12, padding: '8px 14px',
                  color: line.role === 'agent' ? '#ffb59a' : 'rgba(240,244,248,0.85)',
                  fontSize: 14, lineHeight: 1.5,
                }}>
                  <span style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, opacity: 0.55, marginBottom: 3 }}>
                    {line.role === 'agent' ? 'Receptionist' : 'You'}
                  </span>
                  {line.text}
                </span>
              </div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Tip */}
        <p style={{ marginTop: 20, color: 'rgba(240,244,248,0.30)', fontSize: 12, lineHeight: 1.6 }}>
          💡 <strong style={{ color: 'rgba(240,244,248,0.45)' }}>Tips:</strong> Try asking to book a job — the agent will check your calendar and create a real booking. After the call ends, check the dashboard for the lead record. Allow microphone access when your browser prompts.
        </p>
      </div>
    </div>
  );
}
