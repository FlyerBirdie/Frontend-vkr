import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ApiError,
  createTask,
  deleteTask,
  getTechProcess,
  updateTask,
  updateTechProcess,
} from "../api";
import Modal from "../components/Modal";
import { apiErrorAlertClass, apiErrorTitle } from "../crud/apiErrorUi";
import type { TaskCreate, TaskResponse, TaskUpdate, TechProcessDetailResponse } from "../types";

export default function TechProcessDetailPage() {
  const { id } = useParams();
  const tpId = Number(id);
  const [detail, setDetail] = useState<TechProcessDetailResponse | null>(null);
  const [rename, setRename] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [savingName, setSavingName] = useState(false);

  const [taskModal, setTaskModal] = useState<"add" | "edit" | null>(null);
  const [editingTask, setEditingTask] = useState<TaskResponse | null>(null);
  const [taskForm, setTaskForm] = useState({
    sequence_number: "1",
    duration_minutes: "60",
    profession: "",
    equipment_model: "",
    name: "",
  });
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskClientMsg, setTaskClientMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(tpId)) {
      setError(new ApiError(404, "Некорректная ссылка на техпроцесс."));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const d = await getTechProcess(tpId);
      setDetail(d);
      setRename(d.name);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, String(e)));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [tpId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveRename = async () => {
    if (!rename.trim()) return;
    setSavingName(true);
    setError(null);
    try {
      await updateTechProcess(tpId, { name: rename.trim() });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, String(e)));
    } finally {
      setSavingName(false);
    }
  };

  const openAddTask = () => {
    setEditingTask(null);
    setTaskForm({
      sequence_number: String((detail?.tasks.length ?? 0) + 1),
      duration_minutes: "30",
      profession: "",
      equipment_model: "",
      name: "",
    });
    setTaskModal("add");
  };

  const openEditTask = (t: TaskResponse) => {
    setEditingTask(t);
    setTaskForm({
      sequence_number: String(t.sequence_number),
      duration_minutes: String(t.duration_minutes),
      profession: t.profession,
      equipment_model: t.equipment_model,
      name: t.name ?? "",
    });
    setTaskModal("edit");
  };

  const submitTask = async () => {
    setTaskClientMsg(null);
    const seq = Number(taskForm.sequence_number);
    const dur = Number(taskForm.duration_minutes);
    if (!Number.isFinite(seq) || seq < 1) {
      setTaskClientMsg("Номер шага должен быть ≥ 1.");
      return;
    }
    if (!Number.isFinite(dur) || dur < 1) {
      setTaskClientMsg("Длительность должна быть ≥ 1 мин.");
      return;
    }
    setTaskSaving(true);
    setError(null);
    try {
      if (taskModal === "add") {
        const body: TaskCreate = {
          sequence_number: seq,
          duration_minutes: dur,
          profession: taskForm.profession.trim(),
          equipment_model: taskForm.equipment_model.trim(),
          name: taskForm.name.trim() || null,
        };
        await createTask(tpId, body);
      } else if (editingTask) {
        const body: TaskUpdate = {
          sequence_number: seq,
          duration_minutes: dur,
          profession: taskForm.profession.trim(),
          equipment_model: taskForm.equipment_model.trim(),
          name: taskForm.name.trim() || null,
        };
        await updateTask(editingTask.id, body);
      }
      setTaskModal(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, String(e)));
    } finally {
      setTaskSaving(false);
    }
  };

  const removeTask = async (taskId: number) => {
    if (!window.confirm("Удалить задачу ТП?")) return;
    setError(null);
    try {
      await deleteTask(taskId);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, String(e)));
    }
  };

  if (!Number.isFinite(tpId)) {
    return <p role="alert">Некорректная ссылка на техпроцесс.</p>;
  }

  return (
    <div className="space-y-4">
      <Link
        to="/tech-processes"
        className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
      >
        ← К списку ТП
      </Link>

      {error ? (
        <div
          role="alert"
          className={`rounded-lg border px-4 py-3 text-sm ${apiErrorAlertClass(error)}`}
        >
          <span className="font-medium">{apiErrorTitle(error)}.</span> {error.humanMessage}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Загрузка…</p>
      ) : detail ? (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">
              {rename.trim() || "Технологический процесс"}
            </h1>
            <p className="mt-1 text-xs text-slate-500">Редактирование названия и задач ТП</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="block flex-1 text-xs font-medium text-slate-700">
                Название
                <input
                  className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                  value={rename}
                  onChange={(e) => setRename(e.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={savingName || !rename.trim()}
                onClick={() => void saveRename()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {savingName ? "Сохранение…" : "Сохранить название"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-800">Задачи (операции ТП)</h2>
            <button
              type="button"
              onClick={openAddTask}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
            >
              Добавить задачу
            </button>
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {detail.tasks.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">Задач пока нет.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[38rem] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Шаг</th>
                      <th className="px-3 py-2 font-medium">Мин</th>
                      <th className="px-3 py-2 font-medium">Профессия</th>
                      <th className="px-3 py-2 font-medium">Модель оборуд.</th>
                      <th className="px-3 py-2 font-medium">Имя</th>
                      <th className="px-3 py-2 font-medium text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detail.tasks.map((t) => (
                      <tr key={t.id} className="text-slate-800">
                        <td className="px-3 py-2 tabular-nums">{t.sequence_number}</td>
                        <td className="px-3 py-2 tabular-nums">{t.duration_minutes}</td>
                        <td className="px-3 py-2">{t.profession}</td>
                        <td className="px-3 py-2">
                          <code className="rounded bg-slate-100 px-1 text-xs">{t.equipment_model}</code>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{t.name ?? "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => openEditTask(t)}
                            className="mr-2 text-xs font-medium text-slate-600 underline-offset-2 hover:underline"
                          >
                            Изменить
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeTask(t.id)}
                            className="text-xs font-medium text-red-700 underline-offset-2 hover:underline"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}

      <Modal
        open={taskModal !== null}
        onClose={() => setTaskModal(null)}
        title={taskModal === "add" ? "Новая задача ТП" : "Редактирование задачи"}
        footer={
          <>
            <button
              type="button"
              onClick={() => setTaskModal(null)}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="button"
              disabled={
                taskSaving ||
                !taskForm.profession.trim() ||
                !taskForm.equipment_model.trim()
              }
              onClick={() => void submitTask()}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {taskSaving ? "Сохранение…" : "Сохранить"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {taskClientMsg ? (
            <p className="text-sm text-amber-800" role="alert">
              {taskClientMsg}
            </p>
          ) : null}
          <label className="block text-xs font-medium text-slate-700">
            Номер в последовательности
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              value={taskForm.sequence_number}
              onChange={(e) => setTaskForm((f) => ({ ...f, sequence_number: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            Длительность, мин
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              value={taskForm.duration_minutes}
              onChange={(e) => setTaskForm((f) => ({ ...f, duration_minutes: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            Профессия
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              value={taskForm.profession}
              onChange={(e) => setTaskForm((f) => ({ ...f, profession: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            Модель оборудования
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              value={taskForm.equipment_model}
              onChange={(e) => setTaskForm((f) => ({ ...f, equipment_model: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            Название задачи (опционально)
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              value={taskForm.name}
              onChange={(e) => setTaskForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
