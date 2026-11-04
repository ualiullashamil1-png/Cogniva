import { formatDate, Summary, timeGreeting } from "./greeting";

/** Приветствие на дашборде: время суток, имя, дата и сводка по реальным данным. */
export function PersonalizedGreeting({ name, summary, now = new Date() }: {
  name?: string | null; summary: Summary; now?: Date;
}) {
  return (
    <header className="cg-greeting cg-rise">
      <div className="cg-eyebrow">{formatDate(now)}</div>
      <h1>{timeGreeting(now)}{name ? <>, <span className="cg-gradient-text">{name}</span></> : ""}.</h1>
      <p className="cg-muted" style={{ margin: 0 }}>
        {summary.kind === "returning" ? "Рады видеть вас снова. Готовы продолжить?" : "Ваши знания растут с каждым шагом."}
      </p>
      <p className="cg-greeting__summary">{summary.text}</p>
    </header>
  );
}