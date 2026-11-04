import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import type { Overview } from "../welcome/types";
import { api, ApiError, SubjectTree } from "./api";

type State =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; overview: Overview; subjects: SubjectTree[] };
interface DataValue { state: State; reload: () => Promise<void> }
const DataContext = createContext<DataValue | null>(null);

/** Данные ученика загружаются один раз и общие для всех страниц. reload() — после изменений. */
export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const reload = useCallback(async () => {
    try {
      const [overview, subjects] = await Promise.all([api.overview(), api.subjects()]);
      setState({ status: "ready", overview, subjects });
    } catch (e) {
      setState({ status: "error", error: e instanceof ApiError ? e.message : "Не удалось загрузить данные" });
    }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  return <DataContext.Provider value={{ state, reload }}>{children}</DataContext.Provider>;
}

export function useData(): DataValue {
  const v = useContext(DataContext);
  if (!v) throw new Error("useData нужно вызывать внутри DataProvider");
  return v;
}