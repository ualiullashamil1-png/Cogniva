import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Button, Logo, ThemeToggle } from "../design";
import { useAuth } from "./auth";
import { Icon } from "./Icon";

const NAV = [
  { to: "/", label: "Главная", icon: "home", end: true },
  { to: "/learn", label: "Учёба", icon: "learn", end: false },
  { to: "/ai", label: "ИИ", icon: "chat", end: false },
  { to: "/profile", label: "Профиль", icon: "user", end: false },
] as const;

const initial = (name: string) => (name.trim()[0] ?? "?").toUpperCase();

function Links() {
  return <>{NAV.map(n => (
    <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
      <Icon name={n.icon} />{n.label}
    </NavLink>
  ))}</>;
}

/** Общий каркас: боковое меню на компьютере, верхняя панель и нижние вкладки на телефоне. */
export function Shell({ children }: { children: ReactNode }) {
  const { student, logout } = useAuth();
  const name = student?.display_name ?? "";
  return (
    <div className="app">
      <aside className="app__side">
        <Logo height={40} />
        <nav className="app__nav" aria-label="Основная навигация"><Links /></nav>
        <div className="app__foot">
          <div className="user-chip">
            <span className="avatar" aria-hidden>{initial(name)}</span>
            <div style={{ minWidth: 0 }}>
              <div className="user-chip__name">{name}</div>
              <div className="cg-muted" style={{ fontSize: "var(--fs-xs)" }}>{student ? `${student.grade_level} класс` : ""}</div>
            </div>
          </div>
          <div className="cg-row" style={{ justifyContent: "space-between" }}>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={logout}>Выйти</Button>
          </div>
        </div>
      </aside>
      <div className="app__body">
        <header className="app__top">
          <Logo height={36} />
          <div className="cg-row" style={{ gap: 4 }}>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={logout}>Выйти</Button>
          </div>
        </header>
        <main className="app__main">{children}</main>
      </div>
      <nav className="app__tabs" aria-label="Навигация"><Links /></nav>
    </div>
  );
}