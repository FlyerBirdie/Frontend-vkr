import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ResourceUtilizationRow } from "../types";

const TOP_N = 8;
const CHART_HEIGHT = 320;
const BAR_FILL = "#334155";

type ChartRow = {
  id: number;
  label: string;
  utilization: number;
};

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function toChartRows(rows: ResourceUtilizationRow[]): ChartRow[] {
  return [...rows]
    .sort((a, b) => b.utilization_percent - a.utilization_percent)
    .slice(0, TOP_N)
    .map((r) => ({
      id: r.id,
      label: `${r.name} · ${r.detail}`,
      utilization: clampPct(r.utilization_percent),
    }));
}

function UtilizationBarChart({
  title,
  emptyHint,
  data,
}: {
  title: string;
  emptyHint: string;
  data: ChartRow[];
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
        <h4 className="text-xs font-semibold text-slate-700">{title}</h4>
        <p className="mt-3 text-xs text-slate-500">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
      <h4 className="text-xs font-semibold text-slate-700">{title}</h4>
      <div className="mt-2 w-full" style={{ height: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            barCategoryGap="12%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={{ stroke: "#cbd5e1" }}
              tickLine={{ stroke: "#cbd5e1" }}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={200}
              tick={{ fontSize: 11, fill: "#475569" }}
              interval={0}
              axisLine={{ stroke: "#cbd5e1" }}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const raw = payload[0]?.value;
                const pct = clampPct(typeof raw === "number" ? raw : Number(raw));
                return (
                  <div
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs shadow-sm"
                    style={{ maxWidth: 280 }}
                  >
                    <div className="font-medium leading-snug text-slate-800">{String(label ?? "")}</div>
                    <div className="mt-1 tabular-nums text-slate-600">
                      Загрузка: <span className="font-medium text-slate-900">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="utilization" fill={BAR_FILL} radius={[0, 4, 4, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type Props = {
  workers: ResourceUtilizationRow[];
  equipment: ResourceUtilizationRow[];
};

export default function MetricsUtilizationBarCharts({ workers, equipment }: Props) {
  const workersData = useMemo(() => toChartRows(workers), [workers]);
  const equipmentData = useMemo(() => toChartRows(equipment), [equipment]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <UtilizationBarChart
        title={`Рабочие (топ ${TOP_N} по загрузке)`}
        emptyHint="Нет строк метрик."
        data={workersData}
      />
      <UtilizationBarChart
        title={`Оборудование (топ ${TOP_N} по загрузке)`}
        emptyHint="Нет строк метрик."
        data={equipmentData}
      />
    </div>
  );
}
