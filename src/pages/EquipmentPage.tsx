import { useCallback, useEffect, useState } from "react";
import { ApiError, createEquipment, deleteEquipment, listEquipment, updateEquipment } from "../api";
import Modal from "../components/Modal";
import { apiErrorAlertClass, apiErrorTitle } from "../crud/apiErrorUi";
import type { EquipmentCreate, EquipmentResponse, EquipmentUpdate } from "../types";

function isEquipmentActive(row: EquipmentResponse): boolean {
  return row.is_active !== false;
}

export default function EquipmentPage() {
  const [rows, setRows] = useState<EquipmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentResponse | null>(null);
  const [form, setForm] = useState({ name: "", model: "" });
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listEquipment());
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
    setForm({ name: "", model: "" });
    setModalOpen(true);
  };

  const openEdit = (row: EquipmentResponse) => {
    setEditing(row);
    setForm({ name: row.name, model: row.model });
    setModalOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const body: EquipmentUpdate = {
          name: form.name.trim(),
          model: form.model.trim(),
          is_active: isEquipmentActive(editing),
        };
        await updateEquipment(editing.id, body);
      } else {
        const body: EquipmentCreate = { name: form.name.trim(), model: form.model.trim() };
        await createEquipment(body);
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
    if (!window.confirm("Удалить единицу оборудования?")) return;
    setError(null);
    try {
      await deleteEquipment(id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, String(e)));
    }
  };

  const toggleActive = async (row: EquipmentResponse) => {
    const next = !isEquipmentActive(row);
    setTogglingId(row.id);
    setError(null);
    try {
      const body: EquipmentUpdate = { is_active: next };
      await updateEquipment(row.id, body);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, String(e)));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Справочник: оборудование</h1>
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
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">ID</th>
                  <th className="px-4 py-2 font-medium">Название</th>
                  <th className="px-4 py-2 font-medium">Модель</th>
                  <th className="px-4 py-2 font-medium">Активен</th>
                  <th className="px-4 py-2 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((e) => {
                  const active = isEquipmentActive(e);
                  return (
                  <tr
                    key={e.id}
                    className={`text-slate-800 ${active ? "" : "bg-slate-50/80 opacity-70"}`}
                  >
                    <td className="px-4 py-2 tabular-nums text-slate-600">{e.id}</td>
                    <td className="px-4 py-2 font-medium">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {e.name}
                        {!active ? (
                          <span className="rounded border border-slate-300 bg-white px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            не в планировании
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{e.model}</code>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={active}
                        disabled={togglingId != null}
                        aria-busy={togglingId === e.id}
                        aria-label={
                          active
                            ? `Выключить оборудование «${e.name}» из планирования`
                            : `Включить оборудование «${e.name}» в планирование`
                        }
                        onClick={() => void toggleActive(e)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
                          active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                            : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {togglingId === e.id ? "…" : active ? "Включено" : "Выключено"}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(e)}
                        className="mr-2 text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(e.id)}
                        className="text-xs font-medium text-red-700 underline-offset-2 hover:underline"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Редактирование оборудования" : "Новая единица оборудования"}
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
              disabled={saving || !form.name.trim() || !form.model.trim()}
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
            Название
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              value={form.name}
              onChange={(ev) => setForm((f) => ({ ...f, name: ev.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            Модель (сопоставление с задачей ТП)
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              value={form.model}
              onChange={(ev) => setForm((f) => ({ ...f, model: ev.target.value }))}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
