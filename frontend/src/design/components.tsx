import {
  ButtonHTMLAttributes, createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState,
} from "react";
import { LEVEL_LABELS, MasteryLevel, confidenceLabel, levelColor, masteryLevel } from "./mastery";

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(" ");

/* ---------- Button ---------- */
export function Button({
  variant = "primary", size = "md", loading = false, className, children, disabled, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
 variant?: "primary" | "secondary" | "ghost" | "danger" | "gradient"; size? : "sm" | "md" | "lg"; loading?: boolean;
}) {
  return (
    <button type="button" className={cx("cg-btn", `cg-btn--${variant}`, `cg-btn--${size}`, className)}
            disabled={disabled || loading} aria-busy={loading} {...rest}>
      {loading && <span className="cg-spinner" aria-hidden />}
      {children}
    </button>
  );
}

/* ---------- Card ---------- */
export function Card({ title, action, children, className, onClick }: {
  title?: ReactNode; action?: ReactNode; children?: ReactNode; className?: string; onClick?: () => void;
}) {
  const interactive = !!onClick;
  return (
    <section className={cx("cg-card", interactive && "cg-card--interactive", className)} onClick={onClick}
             role={interactive ? "button" : undefined} tabIndex={interactive ? 0 : undefined}
             onKeyDown={interactive ? e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } } : undefined}>
      {(title || action) && (
        <div className="cg-card__head">
          <h3 className="cg-card__title">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------- Badge ---------- */
export type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";
export function Badge({ tone = "neutral", dot = false, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return <span className={cx("cg-badge", tone !== "neutral" && `cg-badge--${tone}`)}>{dot && <span className="cg-badge__dot" />}{children}</span>;
}

/** Бейдж уровня освоения подтемы (цвет и подпись по правилам из mastery.ts). */
export function MasteryBadge({ mastery, tasksDone }: { mastery: number | null | undefined; tasksDone: number }) {
  const level = masteryLevel(mastery, tasksDone);
  return (
    <span className="cg-badge" style={{ color: levelColor(level), background: "var(--surface-2)" }}
          title={level === "none" ? "Ещё нет результатов тестов" : `Достоверность оценки: ${confidenceLabel(tasksDone)} (заданий: ${tasksDone})`}>
      <span className="cg-badge__dot" />{LEVEL_LABELS[level]}
    </span>
  );
}

/* ---------- ProgressBar / ProgressRing ---------- */
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function ProgressBar({ value, label, level, showValue = true }: {
  value: number | null; label?: ReactNode; level?: MasteryLevel; showValue?: boolean;
}) {
  const v = value == null ? 0 : clamp01(value);
  return (
    <div className="cg-progress">
      {(label || showValue) && (
        <div className="cg-progress__head"><span>{label}</span>{showValue && <span>{value == null ? "—" : `${Math.round(v * 100)}%`}</span>}</div>
      )}
      <div className="cg-progress__track" role="progressbar" aria-valuemin={0} aria-valuemax={100}
           aria-valuenow={value == null ? undefined : Math.round(v * 100)}>
        <div className="cg-progress__bar" style={{ width: `${v * 100}%`, ["--bar" as string]: level ? levelColor(level) : undefined }} />
      </div>
    </div>
  );
}

export function ProgressRing({ value, size = 88, stroke = 8, level, children }: {
  value: number | null; size?: number; stroke?: number; level?: MasteryLevel; children?: ReactNode;
}) {
  const v = value == null ? 0 : clamp01(value);
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="cg-ring" style={{ width: size, height: size, ["--bar" as string]: level ? levelColor(level) : undefined }}>
      <svg width={size} height={size} role="img" aria-label={value == null ? "Нет данных" : `${Math.round(v * 100)}%`}>
        <circle className="cg-ring__track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle className="cg-ring__bar" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="cg-ring__center">{children ?? (value == null ? "—" : `${Math.round(v * 100)}%`)}</div>
    </div>
  );
}

/* ---------- Tabs ---------- */
export function Tabs({ tabs, active, onChange }: {
  tabs: { id: string; label: ReactNode }[]; active: string; onChange: (id: string) => void;
}) {
  const move = (e: React.KeyboardEvent, i: number) => {
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[(next + tabs.length) % tabs.length].id);
  };
  return (
    <div className="cg-tabs" role="tablist">
      {tabs.map((t, i) => (
        <button key={t.id} className="cg-tab" role="tab" type="button" aria-selected={t.id === active}
                tabIndex={t.id === active ? 0 : -1} onClick={() => onChange(t.id)} onKeyDown={e => move(e, i)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="cg-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cg-modal" role="dialog" aria-modal="true" tabIndex={-1} ref={ref}>
        <h3>{title}</h3>
        {children}
        {footer && <div className="cg-modal__foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Toast ---------- */
type ToastTone = "info" | "success" | "warning" | "danger";
type ToastItem = { id: number; message: ReactNode; tone: ToastTone };
const ToastContext = createContext<{ show: (message: ReactNode, tone?: ToastTone) => void }>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const show = useCallback((message: ReactNode, tone: ToastTone = "info") => {
    const id = nextId.current++;
    setItems(list => [...list, { id, message, tone }]);
    window.setTimeout(() => setItems(list => list.filter(t => t.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="cg-toasts" role="status" aria-live="polite">
        {items.map(t => <div key={t.id} className={cx("cg-toast", t.tone !== "info" && `cg-toast--${t.tone}`)}>{t.message}</div>)}
      </div>
    </ToastContext.Provider>
  );
}

/* ---------- EmptyState / Skeleton ---------- */
export function EmptyState({ icon = "📭", title, description, action }: {
  icon?: string; title: ReactNode; description?: ReactNode; action?: ReactNode;
}) {
  return (
    <div className="cg-empty">
      <div className="cg-empty__icon" aria-hidden>{icon}</div>
      <div className="cg-empty__title">{title}</div>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ width = "100%", height = 16, radius = 8 }: { width?: number | string; height?: number | string; radius?: number }) {
  return <div className="cg-skeleton" style={{ width, height, borderRadius: radius }} aria-hidden />;
}