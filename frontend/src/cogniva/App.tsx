import { useState } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Button, Skeleton, ThemeProvider } from "../design";
import { WelcomeScreen } from "../welcome/WelcomeScreen";
import { buildSummary, firstName } from "../welcome/greeting";
import { AuthProvider, useAuth } from "./auth";
import { DataProvider, useData } from "./data";
import { Shell } from "./Shell";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Learn from "./pages/Learn";
import Profile from "./pages/Profile";
import "./app.css";

const seenKey = (id: number) => `cogniva.welcomed.${id}`;
const hasSeen = (id: number) => { try { return localStorage.getItem(seenKey(id)) === "1"; } catch { return false; } };
const markSeen = (id: number) => { try { localStorage.setItem(seenKey(id), "1"); } catch { /* ignore */ } };

function Loader() {
  return <div className="center-screen"><div style={{ width: 320, display: "grid", gap: 12 }}><Skeleton height={28} width="70%" /><Skeleton height={16} /><Skeleton height={16} width="85%" /></div></div>;
}

/** Решает, что показать вошедшему ученику: приветствие (если новый) или приложение. */
function Authed() {
  const { student } = useAuth();
  const { state, reload } = useData();
  const [welcomed, setWelcomed] = useState(() => (student ? hasSeen(student.id) : true));

  if (state.status === "loading") return <Loader />;
  if (state.status === "error") {
    return <div className="center-screen"><div style={{ textAlign: "center" }}><p>{state.error}</p><Button onClick={() => void reload()}>Повторить</Button></div></div>;
  }
  const isNew = buildSummary(state.overview).kind === "new";
  if (isNew && !welcomed && student) {
    return <WelcomeScreen name={firstName(student.display_name)} onStart={() => { markSeen(student.id); setWelcomed(true); }} />;
  }
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard overview={state.overview} subjects={state.subjects} />} />
        <Route path="/profile" element={<Profile overview={state.overview} subjects={state.subjects} />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/ai" element={<Chat />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}

function Root() {
  const { status } = useAuth();
  if (status === "loading") return <Loader />;
  if (status === "anon") return <Login />;
  return <DataProvider><Authed /></DataProvider>;
}

export default function App() {
  return <ThemeProvider><HashRouter><AuthProvider><Root /></AuthProvider></HashRouter></ThemeProvider>;
}