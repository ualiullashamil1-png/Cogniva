import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { api, Student, tokenStore } from "./api";

type Status = "loading" | "anon" | "authed";
interface AuthValue {
  status: Status; student: Student | null;
  login: (username: string, password: string) => Promise<void>;
  register: (data: { username: string; password: string; display_name: string; grade_level: number }) => Promise<void>;
  logout: () => void;
}
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [student, setStudent] = useState<Student | null>(null);

  const logout = useCallback(() => { tokenStore.clear(); setStudent(null); setStatus("anon"); }, []);

  useEffect(() => {
    if (!tokenStore.get()) { setStatus("anon"); return; }
    api.me().then(s => { setStudent(s); setStatus("authed"); }).catch(() => { tokenStore.clear(); setStatus("anon"); });
  }, []);

  useEffect(() => {                                       // токен устарел — вернуться на экран входа
    window.addEventListener("cogniva:unauthorized", logout);
    return () => window.removeEventListener("cogniva:unauthorized", logout);
  }, [logout]);

  const accept = (r: { access_token: string; student: Student }) => {
    tokenStore.set(r.access_token); setStudent(r.student); setStatus("authed");
  };
  const login = async (u: string, p: string) => accept(await api.login(u, p));
  const register: AuthValue["register"] = async d => accept(await api.register(d));

  return <AuthContext.Provider value={{ status, student, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth нужно вызывать внутри AuthProvider");
  return v;
}