'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SparkleAvatar } from '@/components/ai/SparkleAvatar';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  ts?: string;
}

// 데이터 기반 답변 가능한 질문만 노출.
// (시간대별·메뉴별처럼 데이터 없는 질문은 의도적으로 제외)
// 페이지 컴포넌트가 매장 데이터 상황별로 동적 추천을 넘기지 않으면 이 기본값 사용.
const DEFAULT_SUGGESTIONS = [
  '이번 달 매출 요약',
  '결제수단별 매출 알려줘',
  '전월 대비 매출 변화',
  '최근 6개월 월별 추이',
  '인건비 비중 분석',
];

function nowTime(): string {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 || 12;
  return `${ampm} ${h12}:${m}`;
}

export function ChatClient({
  ownerInitial,
  ownerAvatarUrl,
  suggestions,
}: {
  ownerInitial: string;
  ownerAvatarUrl?: string | null;
  /** 페이지에서 동적으로 넘기는 추천 질문. 없으면 기본값. */
  suggestions?: string[];
}) {
  const chips = suggestions && suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages]);

  async function send(text: string) {
    if (streaming || !text.trim()) return;
    setError(null);

    const next: Message[] = [
      ...messages,
      { role: 'user', content: text, ts: nowTime() },
    ];
    setMessages(next);
    setInput('');
    setStreaming(true);

    setMessages((m) => [...m, { role: 'assistant', content: '', ts: nowTime() }]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map((x) => ({ role: x.role, content: x.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? `AI 응답 실패 (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        acc += chunk;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: 'assistant',
            content: acc,
            ts: copy[copy.length - 1].ts,
          };
          return copy;
        });
      }
    } catch (e) {
      setError((e as Error).message);
      setMessages((m) => m.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col bg-gradient-to-b from-slate-50 to-white lg:h-[calc(100dvh-7rem)]">
      {/* 메시지 영역 */}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {isEmpty && (
            <div className="flex flex-col items-center py-8 text-center lg:py-12">
              {/* AI orb — glow pulse + 별 + 외곽 보라 그라데이션 후광 */}
              <div className="relative">
                <span
                  aria-hidden
                  className="absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.18)_0%,transparent_70%)] blur-md"
                />
                <span aria-hidden className="rm-ai-icon-pulse absolute inset-0 rounded-full" />
                <SparkleAvatar size={88} withGlow className="relative" />
              </div>
              <h2 className="mt-5 text-[20px] font-bold text-slate-900 lg:text-2xl">
                무엇을 도와드릴까요?
              </h2>
              <p className="mt-1.5 text-[13px] text-slate-500 lg:text-sm">
                매장 데이터를 바탕으로 답변드릴게요.
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className="rm-enter">
              <Bubble
                message={m}
                ownerInitial={ownerInitial}
                ownerAvatarUrl={ownerAvatarUrl}
                streaming={
                  streaming && i === messages.length - 1 && m.role === 'assistant'
                }
              />
            </div>
          ))}

          {error && (
            <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* 추천 질문 chip + 입력 — safe-area 반영 */}
      <div
        className="border-t border-[#EAECF5] bg-white/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* 추천 칩 — 가로 스크롤, 1줄 truncate, 우측 페이드 힌트 */}
        <div className="relative">
          <div className="overflow-x-auto px-4 pt-3 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="mx-auto flex max-w-3xl gap-2 pb-1">
              {chips.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={streaming}
                  title={s}
                  className="max-w-[180px] shrink-0 truncate rounded-full border border-[#EAECF5] bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {/* 우측 페이드 — 가로 스크롤 힌트 (모바일에서만) */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-white to-transparent lg:hidden"
          />
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-3 lg:px-8">
          <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-[#E3E5F0] bg-white px-3 py-2 shadow-sm transition focus-within:border-indigo-400 focus-within:shadow-md">
            <SparkleAvatar size={24} />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="궁금한 점을 물어보세요"
              disabled={streaming}
              enterKeyHint="send"
              autoComplete="off"
              autoCorrect="off"
              className="h-9 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              aria-label="전송"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 active:scale-95 disabled:opacity-40"
            >
              <SendIcon />
            </button>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-slate-400">
            AI는 실수를 할 수 있어요. 중요한 숫자는 다시 확인해 주세요.
          </p>
        </form>
      </div>
    </div>
  );
}

function Bubble({
  message,
  ownerInitial,
  ownerAvatarUrl,
  streaming,
}: {
  message: Message;
  ownerInitial: string;
  ownerAvatarUrl?: string | null;
  streaming?: boolean;
}) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[85%] items-end gap-2">
          <div className="flex flex-col items-end">
            <div className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-sm">
              {message.content}
            </div>
            {message.ts && (
              <span className="mt-1 text-[10px] text-slate-400">{message.ts}</span>
            )}
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xs font-bold text-white">
            {ownerAvatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={ownerAvatarUrl} alt={ownerInitial} className="h-full w-full object-cover" />
            ) : (
              ownerInitial
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="flex max-w-[90%] items-start gap-2">
        <SparkleAvatar size={36} withGlow />
        <div className="flex flex-col">
          <div className="rounded-2xl border border-[#EAECF5] bg-white px-4 py-3 text-sm text-slate-900 shadow-sm">
            {message.content ? (
              <MarkdownBody text={message.content} />
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-400">
                <Dot delay={0} />
                <Dot delay={0.15} />
                <Dot delay={0.3} />
              </span>
            )}
            {streaming && message.content && (
              <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500 align-middle" />
            )}
          </div>
          {message.ts && !streaming && (
            <span className="mt-1 text-[10px] text-slate-400">{message.ts}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MarkdownBody({ text }: { text: string }) {
  return (
    <div className="prose-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="my-1.5 list-disc space-y-0.5 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-0.5 pl-5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-bold text-slate-900">{children}</h3>,
          h2: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-bold text-slate-900">{children}</h3>,
          h3: ({ children }) => <h4 className="mb-1 mt-2 text-sm font-semibold text-slate-900">{children}</h4>,
          strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] text-slate-800">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[12px] text-slate-100">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
          th: ({ children }) => (
            <th className="whitespace-nowrap border border-[#EAECF5] px-2 py-1 text-left font-semibold text-slate-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="whitespace-nowrap border border-[#EAECF5] px-2 py-1 tabular-nums">{children}</td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 underline-offset-2 hover:underline"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-[#E3E5F0] pl-3 text-slate-600">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-[#EAECF5]" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

function SendIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 2 L11 13" />
      <path d="M22 2 L15 22 L11 13 L2 9 Z" />
    </svg>
  );
}
