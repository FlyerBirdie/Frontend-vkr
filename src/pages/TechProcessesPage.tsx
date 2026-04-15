import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, createTechProcess, listTechProcesses } from "../api";
import Modal from "../components/Modal";
import { apiErrorAlertClass, apiErrorTitle } from "../crud/apiErrorUi";
import type { TechProcessListItem } from "../types";

export default function TechProcessesPage() {
  const [rows, setRows] = useState<TechProcessListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listTechProcesses());
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await createTechProcess({ name: name.trim() });
      setModalOpen(false);
      setName("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, String(e)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Технологические процессы</h1>
        <button
          type="button"
          onClick={() => {
            setName("");
            setModalOpen(true);
          }}
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
            <table className="w-full min-w-[20rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">ID</th>
                  <th className="px-4 py-2 font-medium">Название</th>
                  <th className="px-4 py-2 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="text-slate-800">
                    <td className="px-4 py-2 tabular-nums text-slate-600">{r.id}</td>
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        to={`/tech-processes/${r.id}`}
                        className="text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
                      >
                        Задачи и детали
                      </Link>
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
        title="Новый технологический процесс"
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
              disabled={saving || !name.trim()}
              onClick={() => void submit()}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Создание…" : "Создать"}
            </button>
          </>
        }
      >
        <label className="block text-xs font-medium text-slate-700">
          Название ТП
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      </Modal>
    </div>
  );
}
