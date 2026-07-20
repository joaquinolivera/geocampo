'use client';

/**
 * ChatPanel — Phase J AI/RAG assistant
 *
 * Streams responses from /api/chat, which does pgvector similarity search
 * against farm_embeddings and calls gpt-4o-mini with the retrieved context.
 *
 * In demo mode the API returns a canned explanation.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { apiPath } from '@/lib/api';

interface Message {
  id:      string;
  role:    'user' | 'assistant';
  content: string;
  loading?: boolean;
}

const SUGGESTIONS = [
  '¿Qué potrero tiene mayor carga animal?',
  '¿Qué lotes necesitan sanidad esta semana?',
  '¿Cuál es el promedio de peso de mis lotes?',
  '¿Cuántas hectáreas tengo en total?',
];

function nanoid() { return Math.random().toString(36).slice(2, 8); }

interface ChatPanelProps {
  farmId?: string;
  onClose: () => void;
}

export default function ChatPanel({ farmId, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id:      'welcome',
      role:    'assistant',
      content: '¡Hola! Soy el asistente de GeoCampo. Preguntame sobre tus potreros, hacienda o sanidad. 🐄',
    },
  ]);
  const [input, setInput]     = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setInput('');
    setSending(true);

    const userMsg: Message = { id: nanoid(), role: 'user', content: trimmed };
    const assistantId = nanoid();
    const placeholderMsg: Message = { id: assistantId, role: 'assistant', content: '', loading: true };

    setMessages((prev) => [...prev, userMsg, placeholderMsg]);

    try {
      const res = await fetch(apiPath('/api/chat'), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: trimmed, farmId }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Error ${res.status}`);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const snapshot = accumulated;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: snapshot, loading: false } : m
          )
        );
      }
    } catch (err) {
      const errMsg = (err as Error).message ?? 'Error desconocido';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `⚠️ ${errMsg}`, loading: false }
            : m
        )
      );
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [farmId, sending]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div
      className="absolute top-0 right-0 bottom-0 w-80 flex flex-col border-l border-surface2 shadow-2xl z-10"
      style={{ backgroundColor: 'rgba(10,10,11,0.97)', backdropFilter: 'blur(12px)' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-surface2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
            style={{ backgroundColor: '#DEFF9A20' }}
          >
            🤖
          </div>
          <div>
            <p className="text-white text-sm font-bold leading-tight">Asistente IA</p>
            <p className="text-muted text-[10px]">Powered by pgvector + GPT-4o mini</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted hover:text-white transition-colors text-xl leading-none p-1"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'
              }`}
              style={{
                backgroundColor: msg.role === 'user' ? '#DEFF9A' : '#1A1A1B',
                color:           msg.role === 'user' ? '#0A0A0B' : '#FFFFFF',
                border:          msg.role === 'assistant' ? '1px solid #2A2A2B' : 'none',
              }}
            >
              {msg.loading ? (
                <span className="inline-flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions (only shown before user sends anything) */}
      {messages.length === 1 && (
        <div className="px-4 pb-3 flex flex-col gap-1.5">
          <p className="text-muted text-[10px] uppercase tracking-wider font-semibold mb-1">
            Sugerencias
          </p>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-left text-xs text-white/60 hover:text-white border border-surface2 hover:border-lime/30 rounded-xl px-3 py-2 transition-colors"
              style={{ backgroundColor: '#1A1A1B' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex-shrink-0 flex gap-2 px-4 pb-4 pt-2 border-t border-surface2"
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Preguntá sobre tu campo…"
          disabled={sending}
          className="flex-1 bg-surface border border-surface2 rounded-xl px-4 py-2.5 text-white text-sm placeholder-muted focus:outline-none focus:border-lime transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all disabled:opacity-30 flex-shrink-0"
          style={{ backgroundColor: '#DEFF9A', color: '#0A0A0B' }}
        >
          ↑
        </button>
      </form>
    </div>
  );
}
