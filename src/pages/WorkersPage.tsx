import { useCallback, useEffect, useState } from "react";
import { ApiError, createWorker, deleteWorker, listWorkers, updateWorker } from "../api";
import Modal from "../components/Modal";
import { apiErrorAlertClass, apiErrorTitle } from "../crud/apiErrorUi";
import type { WorkerCreate, WorkerResponse, WorkerUpdate } from "../types";

export default function WorkersPage() {
  const [rows, setRows] = useState<WorkerResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WorkerResponse | null>(null);
  const [form, setForm] = useState({ name: "", profession: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listWorkers());
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", profession: "" });
    setModalOpen(true);
  };

  const openEdit = (w: WorkerResponse) => {
    setEditing(w);
    setForm({ name: w.name, profession: w.profession });
    setModalOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const body: WorkerUpdate = { name: form.name.trim(), profession: form.profession.trim() };
        await updateWorker(editing.id, body);
      } else {
        const body: WorkerCreate = {
          name: form.name.trim(),
          profession: form.profession.trim(),
        };
        await createWorker(body);
      }
      setModalOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, String(e)));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Удалить рабочего?")) return;
    setError(null);
    try {
      await deleteWorker(id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, String(e)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Справочник: рабочие</h1>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
        >
          Добавить
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          className={`rounded-lg border px-4 py-3 text-sm ${apiErrorAlertClass(error)}`}
        >
          <span className="font-medium">{apiErrorTitle(error)}.</span> {error.humanMessage}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-5 text-sm text-slate-500">Загрузка…</p>
        ) : rows.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Список пуст.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[22rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Имя</th>
                  <th className="px-4 py-2 font-medium">Профессия</th>
                  <th className="px-4 py-2 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((w) => (
                  <tr key={w.id} className="text-slate-800">
                    <td className="px-4 py-2 font-medium">{w.name}</td>
                    <td className="px-4 py-2">{w.profession}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(w)}
                        className="mr-2 text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(w.id)}
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Редактирование рабочего" : "Новый рабочий"}
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="button"
              disabled={saving || !form.name.trim() || !form.profession.trim()}
              onClick={() => void submit()}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-xs font-medium text-slate-700">
            Имя
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            Профессия
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              value={form.profession}
              onChange={(e) => setForm((f) => ({ ...f, profession: e.target.value }))}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
