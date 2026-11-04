import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api";
import { AiStatus, chatApi, ChatConversation, ChatMemory, ChatMessage } from "../chatApi";
import "./chat.css";
import "./chatMemory.css";

const SUGGESTIONS = [
  "Где у меня пробелы? Что повторить в первую очередь?",
  "Я люблю «Симпсонов». Объясни скорость на примере с Гомером",
  "Объясни разницу между скоростью и ускорением",
];

const errText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

export default function Chat() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [convs, setConvs] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memories, setMemories] = useState<ChatMemory[]>([]);
  const [proposals, setProposals] = useState<string[]>([]);
  const [showMemory, setShowMemory] = useState(false);
  const [memInput, setMemInput] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const open = useCallback(async (id: number) => {
    setError(null);
    setProposals([]);
    try {
      const c = await chatApi.get(id);
      setActiveId(c.id);
      setMessages(c.messages);
    } catch (e) {
      setError(errText(e, "Не удалось открыть разговор"));
    }
  }, []);

  useEffect(() => {
    let alive = true;
    chatApi.status().then(s => { if (alive) setStatus(s); }).catch(() => undefined);
    chatApi.memoryList().then(m => { if (alive) setMemories(m); }).catch(() => undefined);
    chatApi.list()
      .then(async list => {
        if (!alive) return;
        setConvs(list);
        if (list.length) await open(list[0].id);
      })
      .catch(e => { if (alive) setError(errText(e, "Не удалось загрузить разговоры")); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages, sending, proposals]);

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setProposals([]);
    setError(null);
  }

  async function send(text: string) {
    const t = text.trim();
    if (!t || sending) return;
    setError(null);
    setProposals([]);
    setSending(true);
    setInput("");
    setMessages(m => [...m, { role: "user", content: t }]);
    try {
      let id = activeId;
      if (id === null) {
        const c = await chatApi.create();
        id = c.id;
        setActiveId(id);
        setConvs(cs => [c, ...cs]);
      }
      const r = await chatApi.send(id, t);
      setMessages(m => [...m, { role: "assistant", content: r.reply, mode: r.mode }]);
      setConvs(cs => cs.map(c => (c.id === id ? { ...c, title: r.title } : c)));
      setProposals(r.proposals ?? []);
    } catch (e) {
      setMessages(m => m.slice(0, -1));
      setInput(t);
      setError(errText(e, "Не удалось отправить сообщение"));
    } finally {
      setSending(false);
    }
  }

  async function remove(c: ChatConversation) {
    if (!window.confirm(`Удалить разговор «${c.title}»?`)) return;
    try {
      await chatApi.remove(c.id);
      setConvs(cs => cs.filter(x => x.id !== c.id));
      if (activeId === c.id) newChat();
    } catch (e) {
      setError(errText(e, "Не удалось удалить разговор"));
    }
  }

  async function remember(text: string) {
    try {
      const m = await chatApi.memoryAdd(text);
      setMemories(ms => [...ms, m]);
    } catch (e) {
      setError(errText(e, "Не удалось запомнить"));
    }
    setProposals(ps => ps.filter(x => x !== text));
  }

  async function addMemory() {
    const t = memInput.trim();
    if (!t) return;
    try {
      const m = await chatApi.memoryAdd(t);
      setMemories(ms => [...ms, m]);
      setMemInput("");
      setError(null);
    } catch (e) {
      setError(errText(e, "Не удалось запомнить"));
    }
  }

  async function forget(m: ChatMemory) {
    try {
      await chatApi.memoryRemove(m.id);
      setMemories(ms => ms.filter(x => x.id !== m.id));
    } catch (e) {
      setError(errText(e, "Не удалось удалить запись"));
    }
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const demo = status?.mode === "demo";

  return (
    <div className="chat">
      <header className="chat__head">
        <div>
          <h1>ИИ-репетитор</h1>
          <p className="cg-muted">Спросите, что повторить, или расскажите о себе: я предложу это запомнить.</p>
        </div>
        <div className="chat__tools">
          <button type="button" className="chat__badge chat__memory-toggle" onClick={() => setShowMemory(v => !v)}>
            Память ИИ ({memories.length})
          </button>
          {status && (
            <span className={`chat__badge${demo ? " chat__badge--demo" : ""}`}>
              {demo ? "ДЕМО-РЕЖИМ" : `ИИ · ${status.model ?? status.provider ?? ""}`}
            </span>
          )}
        </div>
      </header>

      {showMemory && (
        <section className="chat__memory" aria-label="Память ИИ">
          <p className="cg-muted">Это факты о вас, которые вы подтвердили. ИИ использует их в примерах. Здесь их можно добавить и удалить.</p>
          {memories.length === 0 && <p className="cg-muted">Пока пусто.</p>}
          <ul>
            {memories.map(m => (
              <li key={m.id}>
                <span>{m.text}</span>
                <button type="button" className="chat__item-del" aria-label="Удалить из памяти" onClick={() => void forget(m)}>×</button>
              </li>
            ))}
          </ul>
          <div className="chat__memory-add">
            <input
              className="input"
              maxLength={200}
              placeholder="Например: люблю футбол, хочу поступить в КБТУ"
              value={memInput}
              onChange={e => setMemInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void addMemory(); } }}
            />
            <button type="button" className="chat__send" onClick={() => void addMemory()} disabled={!memInput.trim()}>Добавить</button>
          </div>
        </section>
      )}

      <div className="chat__layout">
        <aside className="chat__list" aria-label="Разговоры">
          <button type="button" className="chat__new" onClick={newChat} disabled={sending}>+ Новый разговор</button>
          <ul>
            {convs.map(c => (
              <li key={c.id} className={`chat__item${c.id === activeId ? " is-active" : ""}`}>
                <button type="button" className="chat__item-main" disabled={sending} onClick={() => void open(c.id)}>{c.title}</button>
                <button type="button" className="chat__item-del" aria-label="Удалить разговор" disabled={sending} onClick={() => void remove(c)}>×</button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="chat__panel">
          <div className="chat__messages" aria-live="polite">
            {loading && <p className="cg-muted">Загрузка…</p>}
            {!loading && messages.length === 0 && (
              <div className="chat__empty">
                <p>Здравствуйте! Я вижу ваши оценки и результаты тестов и помогу понять, что учить дальше.</p>
                <div className="chat__chips">
                  {SUGGESTIONS.map(s => (
                    <button key={s} type="button" className="chat__chip" disabled={sending} onClick={() => void send(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat__msg chat__msg--${m.role}`}>{m.content}</div>
            ))}
            {proposals.map(p => (
              <div key={p} className="chat__proposal">
                <span>Запомнить о вас: <b>{p}</b></span>
                <button type="button" className="chat__prop-yes" onClick={() => void remember(p)}>Запомнить</button>
                <button type="button" className="chat__prop-no" onClick={() => setProposals(ps => ps.filter(x => x !== p))}>Не надо</button>
              </div>
            ))}
            {sending && <div className="chat__msg chat__msg--assistant chat__msg--typing">ИИ думает…</div>}
            <div ref={endRef} />
          </div>

          {error && <div className="form-error" role="alert" style={{ margin: "0 var(--space-4)" }}>{error}</div>}

          <div className="chat__composer">
            <textarea
              className="input chat__input"
              rows={2}
              maxLength={1000}
              placeholder="Напишите сообщение… (Enter — отправить, Shift+Enter — новая строка)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={sending}
            />
            <button type="button" className="chat__send" onClick={() => void send(input)} disabled={sending || !input.trim()}>
              Отправить
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}