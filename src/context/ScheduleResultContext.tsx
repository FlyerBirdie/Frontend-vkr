import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ScheduleResponse } from "../types";

type ScheduleResultContextValue = {
  /** Последний успешный ответ POST /api/schedule (или null). */
  schedule: ScheduleResponse | null;
  setScheduleResult: (value: ScheduleResponse | null) => void;
};

const ScheduleResultContext = createContext<ScheduleResultContextValue | null>(null);

/**
 * Хранение последнего результата планирования для страниц «Расписание» и «Анализ».
 *
 * Выбран вариант: React Context (провайдер оборачивает маршруты в App.tsx).
 * Данные живут в памяти SPA до полной перезагрузки вкладки (F5); при навигации
 * между /schedule и /analytics состояние сохраняется. Альтернатива —
 * sessionStorage (ключ вида planning_last_result) для переживания F5, но тогда
 * нужна сериализация/миграция схемы ответа API.
 */
export function ScheduleResultProvider({ children }: { children: ReactNode }) {
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const setScheduleResult = useCallback((value: ScheduleResponse | null) => {
    setSchedule(value);
  }, []);
  const value = useMemo(
    () => ({ schedule, setScheduleResult }),
    [schedule, setScheduleResult],
  );
  return (
    <ScheduleResultContext.Provider value={value}>{children}</ScheduleResultContext.Provider>
  );
}

export function useScheduleResult(): ScheduleResultContextValue {
  const ctx = useContext(ScheduleResultContext);
  if (!ctx) {
    throw new Error("useScheduleResult: оберните дерево в <ScheduleResultProvider>.");
  }
  return ctx;
}
