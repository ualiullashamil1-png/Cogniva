 import { FormEvent, useState } from "react";
import { Badge, Button, Card, Logo, Tabs } from "../../design";
import { ApiError } from "../api";
import { useAuth } from "../auth";

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,50}$/;

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState(9);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setError(null); setBusy(true);
    try { await fn(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Не удалось выполнить запрос"); }
    finally { setBusy(false); }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "login") return void run(() => login(username.trim(), password));
    if (!name.trim()) return setError("Введите ваше имя");
    if (!USERNAME_RE.test(username.trim())) return setError("Логин: от 3 латинских букв, цифр, точки, дефиса или подчёркивания");
    if (password.length < 8) return setError("Пароль должен быть не короче 8 символов");
    void run(() => register({ username: username.trim(), password, display_name: name.trim(), grade_level: grade }));
  };

  return (
    <div className="auth">
      <section className="auth__brand">
        <div style={{ position: "relative", zIndex: 1 }}><Logo height={52} /></div>
        <h1 style={{ position: "relative", zIndex: 1 }}>Среда обучения, созданная вокруг ученика</h1>
        <ul className="auth__points">
          <li><b>1</b><span>Понимает, что вы уже знаете, и не путает оценку в школе с реальным освоением</span></li>
          <li><b>2</b><span>Подбирает способ объяснения под ваши пробелы</span></li>
          <li><b>3</b><span>Показывает физику в интерактивных 3D-сценах</span></li>
        </ul>
      </section>
      <section className="auth__panel">
        <Card className="auth__card">
          <Tabs active={mode} onChange={m => { setMode(m as "login" | "register"); setError(null); }}
                tabs={[{ id: "login", label: "Вход" }, { id: "register", label: "Регистрация" }]} />
          <form onSubmit={submit} style={{ marginTop: 20 }} noValidate>
            {error && <div className="form-error" role="alert">{error}</div>}
            {mode === "register" && (
              <div className="field"><label htmlFor="name">Ваше имя</label>
                <input id="name" className="input" value={name} onChange={e => setName(e.target.value)} autoComplete="given-name" /></div>
            )}
            <div className="field"><label htmlFor="user">Логин</label>
              <input id="user" className="input" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" /></div>
            <div className="field"><label htmlFor="pass">Пароль</label>
              <input id="pass" className="input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                     autoComplete={mode === "login" ? "current-password" : "new-password"} /></div>
            {mode === "register" && (
              <div className="field"><label htmlFor="grade">Класс</label>
                <select id="grade" className="input" value={grade} onChange={e => setGrade(Number(e.target.value))}>
                  {[5, 6, 7, 8, 9, 10, 11].map(g => <option key={g} value={g}>{g} класс</option>)}
                </select></div>
            )}
            <Button type="submit" variant="gradient" size="lg" loading={busy} style={{ width: "100%" }}>
              {mode === "login" ? "Войти" : "Создать аккаунт"}
            </Button>
          </form>
          {mode === "login" && (
            <div style={{ marginTop: 18, textAlign: "center" }}>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run(() => login("alex", "demo12345"))}>
                Войти как демо-ученик <Badge tone="warning">демо</Badge>
              </Button>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}