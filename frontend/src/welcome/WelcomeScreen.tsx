import type { CSSProperties } from "react";
import { Button, Logo } from "../design";

const delay = (ms: number) => ({ ["--d" as string]: `${ms}ms` }) as CSSProperties;

/** Экран для нового ученика: появление логотипа, приветствие, главная кнопка. */
export function WelcomeScreen({ name, onStart, onExplore }: {
  name?: string | null; onStart: () => void; onExplore?: () => void;
}) {
  return (
    <main className="cg-welcome">
      <div className="cg-welcome__inner">
        <div className="cg-welcome__logo"><Logo height={104} /></div>
        <h1 className="cg-rise" style={delay(250)}>
          {name ? <>Добро пожаловать, <span className="cg-gradient-text">{name}</span>!</> : "Добро пожаловать в Cogniva."}
        </h1>
        <p className="cg-welcome__lead cg-rise" style={delay(420)}>Ваше обучение начинается здесь.</p>
        <p className="cg-welcome__idea cg-rise" style={delay(620)}>Интеллектуальная среда обучения, созданная вокруг ВАС.</p>
        <p className="cg-muted cg-rise" style={delay(760)}>
          Понимайте темы, исследуйте интерактивные 3D-эксперименты и узнайте, как вам удобнее всего учиться.
        </p>
        <div className="cg-welcome__actions cg-rise" style={delay(960)}>
          <Button variant="gradient" size="lg" onClick={onStart}>Начать обучение</Button>
          {onExplore && <Button variant="secondary" size="lg" onClick={onExplore}>Узнать о Cogniva</Button>}
        </div>
      </div>
    </main>
  );
}