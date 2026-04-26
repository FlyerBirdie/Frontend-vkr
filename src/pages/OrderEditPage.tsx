import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, getOrder, listTechProcesses, updateOrder } from "../api";
import { apiErrorAlertClass, apiErrorTitle } from "../crud/apiErrorUi";
import {
  canonicalOrderStatus,
  isOrderStatus,
  orderStatusLabel,
  orderStatusPlanningHint,
} from "../orderStatus";
import { dateToDatetimeLocalValue, datetimeLocalToIsoUtc, validatePeriodOrder } from "../planningPeriod";
import type { OrderUpdate, TechProcessListItem } from "../types";
import { ORDER_STATUS_VALUES } from "../types";

export default function OrderEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orderId = Number(id);
  const [tech, setTech] = useState<TechProcessListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [clientErr, setClientErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({
    name: "",
    profit: "",
    planned_start_local: "",
    planned_end_local: "",
    tech_process_id: "" as string | number,
    /** Пустая строка — статус не пришёл с сервера; иначе код статуса (в т.ч. нестандартный). */
    status: "",
  });

  const load = useCallback(async () => {
    if (!Number.isFinite(orderId)) {
      setError(new ApiError(404, "Некорректная ссылка на заказ."));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setLoaded(false);
    try {
      const [o, tp] = await Promise.all([getOrder(orderId), listTechProcesses()]);
      setTech(tp);
      setForm({
        name: o.name,
        profit: String(o.profit),
        planned_start_local: dateToDatetimeLocalValue(new Date(o.planned_start)),
        planned_end_local: dateToDatetimeLocalValue(new Date(o.planned_end)),
        tech_process_id: o.tech_process_id,
        status:
          o.status != null && o.status !== ""
            ? (() => {
                const c = canonicalOrderStatus(o.status);
                return c === "unknown" ? o.status : c;
              })()
            : "",
      });
      setLoaded(true);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, String(e)));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
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
      const body: OrderUpdate = {
        name: form.name.trim(),
        profit: profitNum,
        planned_start: startIso,
        planned_end: endIso,
        tech_process_id: tid,
        status: form.status === "" ? null : form.status,
      };
      await updateOrder(orderId, body);
      void navigate("/orders");
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(500, String(e)));
    } finally {
      setSaving(false);
    }
  };

  if (!Number.isFinite(orderId)) {
    return (
      <p className="text-sm text-red-700" role="alert">
        Некорректная ссылка на заказ.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link to="/orders" className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline">
        ← К списку заказов
      </Link>
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Редактирование заказа</h1>
        {loaded ? (
          <p className="text-sm text-slate-600">{form.name.trim() || "Без названия"}</p>
        ) : null}
      </header>

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
      ) : loaded ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {clientErr ? (
            <p className="mb-3 text-sm text-amber-800" role="alert">
              {clientErr}
            </p>
          ) : null}
          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-700">
              Название
              <input
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Прибыль
              <input
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                value={form.profit}
                onChange={(e) => setForm((f) => ({ ...f, profit: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              План: начало
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                value={form.planned_start_local}
                onChange={(e) => setForm((f) => ({ ...f, planned_start_local: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-medium text-slate-700">
              План: конец
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
                value={String(form.tech_process_id)}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tech_process_id: e.target.value ? Number(e.target.value) : "" }))
                }
              >
                {tech.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-700">
              Статус
              <select
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                aria-label="Статус заказа"
              >
                <option value="">Не указан (как «неизвестно» в списке)</option>
                {ORDER_STATUS_VALUES.map((s) => (
                  <option key={s} value={s}>
                    {orderStatusLabel(s)}
                  </option>
                ))}
                {form.status !== "" && !isOrderStatus(form.status) ? (
                  <option value={form.status}>
                    {form.status} (как пришло с сервера)
                  </option>
                ) : null}
              </select>
            </label>
            <p className="text-[11px] leading-snug text-slate-600">
              {form.status === ""
                ? "Статус не задан. Если оставить пустым и сохранить, планировщик может не учитывать заказ — уточните у администратора."
                : isOrderStatus(form.status)
                  ? orderStatusPlanningHint(form.status)
                  : `Нестандартное значение с сервера. Для предсказуемого планирования выберите один из типовых статусов.`}
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
            <Link
              to="/orders"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Отмена
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
