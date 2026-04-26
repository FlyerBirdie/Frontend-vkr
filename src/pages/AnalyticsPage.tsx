import { Link } from "react-router-dom";
import ScheduleAnalysisDashboard from "../components/ScheduleAnalysisDashboard";
import { useScheduleResult } from "../context/ScheduleResultContext";

export default function AnalyticsPage() {
  const { schedule } = useScheduleResult();

  if (!schedule) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-slate-900">Отчёт по загрузке ресурсов</h1>
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-700">
            Сначала выполните планирование на странице{" "}
            <Link to="/schedule" className="font-medium text-slate-900 underline-offset-2 hover:underline">
              Расписание
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return <ScheduleAnalysisDashboard schedule={schedule} />;
}
