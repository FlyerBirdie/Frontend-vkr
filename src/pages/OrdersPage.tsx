import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ApiError,
  createOrder,
  deleteOrder,
  listOrdersCrud,
  listTechProcesses,
} from "../api";
import Modal from "../components/Modal";
import { apiErrorAlertClass, apiErrorTitle } from "../crud/apiErrorUi";
import { datetimeLocalToIsoUtc, validatePeriodOrder } from "../planningPeriod";
import { formatInSamara, TIME_ZONE_UI_LABEL } from "../samaraTime";
import type { OrderCreate, OrderResponse, TechProcessListItem } from "../types";

function formatOrderPlannedShort(iso: string): string {
  try {
    return formatInSamara(iso, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function OrdersPage() {
  const [rows, setRows] = useState<OrderResponse[]>([]);
  const [tech, setTech] = useState<TechProcessListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    profit: "",
    planned_start_local: "",
    planned_end_local: "",
    tech_process_id: "" as string | number,
  });
  const [clientErr, setClientErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orders, tp] = await Promise.all([listOrdersCrud(), listTechProcesses()]);
      setRows(orders);
      setTech(tp);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, String(e)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setClientErr(null);
    setForm({
      name: "",
      profit: "",
      planned_start_local: "",
      planned_end_local: "",
      tech_process_id: tech[0]?.id ?? "",
    });
    setModalOpen(true);
  };

  const submitCreate = async () => {
    setClientErr(null);
    let startIso: string;
    let endIso: string;
    try {
      startIso = datetimeLocalToIsoUtc(form.planned_start_local);
      endIso = datetimeLocalToIsoUtc(form.planned_end_local);
    } catch {
      setClientErr("Некорректные дата/время планового окна заказа.");
      return;
    }
    const v = validatePeriodOrder(startIso, endIso);
    if (v) {
      setClientErr(v);
      return;
    }
    const tid = Number(form.tech_process_id);
    if (!Number.isFinite(tid)) {
      setClientErr("Выберите технологический процесс.");
      return;
    }
    const profitNum = Number(String(form.profit).replace(",", "."));
    if (!Number.isFinite(profitNum)) {
      setClientErr("Укажите числовую прибыль.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body: OrderCreate = {
        name: form.name.trim(),
        profit: profitNum,
        planned_start: startIso,
        planned_end: endIso,
        tech_process_id: tid,
      };
      await createOrder(body);
      setModalOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, String(e)));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Удалить заказ?")) return;
    setError(null);
    try {
      await deleteOrder(id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, String(e)));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Заказы</h1>
        <button
          type="button"
          onClick={openCreate}
          disabled={tech.length === 0 && !loading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
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
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">ID</th>
                  <th className="px-3 py-2 font-medium">Название</th>
                  <th className="px-3 py-2 font-medium">Прибыль</th>
                  <th className="px-3 py-2 font-medium">План: начало (Самара)</th>
                  <th className="px-3 py-2 font-medium">План: конец (Самара)</th>
                  <th className="px-3 py-2 font-medium">ТП</th>
                  <th className="px-3 py-2 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((o) => (
                  <tr key={o.id} className="text-slate-800">
                    <td className="px-3 py-2 tabular-nums text-slate-600">{o.id}</td>
                    <td className="px-3 py-2 font-medium">{o.name}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {typeof o.profit === "number"
                        ? o.profit.toLocaleString("ru-RU")
                        : String(o.profit)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-slate-600">{formatOrderPlannedShort(o.planned_start)}</td>
                    <td className="px-3 py-2 tabular-nums text-slate-600">{formatOrderPlannedShort(o.planned_end)}</td>
                    <td className="px-3 py-2 tabular-nums">{o.tech_process_id}</td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        to={`/orders/${o.id}/edit`}
                        className="mr-2 text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
                      >
                        Изменить
                      </Link>
                      <button
                        type="button"
                        onClick={() => void remove(o.id)}
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
        title="Новый заказ"
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
              disabled={saving || !form.name.trim()}
              onClick={() => void submitCreate()}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Создание…" : "Создать"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {clientErr ? (
            <p className="text-sm text-amber-800" role="alert">
              {clientErr}
            </p>
          ) : null}
          <label className="block text-xs font-medium text-slate-700">
            Название
            <input
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            Прибыль (число)
            <input
              type="text"
              inputMode="decimal"
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              value={form.profit}
              onChange={(e) => setForm((f) => ({ ...f, profit: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            План: начало ({TIME_ZONE_UI_LABEL})
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              value={form.planned_start_local}
              onChange={(e) => setForm((f) => ({ ...f, planned_start_local: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            План: конец ({TIME_ZONE_UI_LABEL})
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              value={form.planned_end_local}
              onChange={(e) => setForm((f) => ({ ...f, planned_end_local: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            Техпроцесс
            <select
              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              value={form.tech_process_id === "" ? "" : String(form.tech_process_id)}
              onChange={(e) =>
                setForm((f) => ({ ...f, tech_process_id: e.target.value ? Number(e.target.value) : "" }))
              }
            >
              <option value="">— выберите —</option>
              {tech.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id}: {t.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[11px] text-slate-500">
            Поля как {TIME_ZONE_UI_LABEL}; в API — ISO UTC (как период на странице «Расписание»).
          </p>
        </div>
      </Modal>
    </div>
  );
}
