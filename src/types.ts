/** Заказ GET/POST/PATCH /api/orders (OrderResponse в backend). */
export interface OrderResponse {
  id: number;
  name: string;
  profit: number | string;
  planned_start: string;
  planned_end: string;
  tech_process_id: number;
}

/** @deprecated Используйте OrderResponse; оставлено для совместимости имён. */
export type Order = OrderResponse;

export interface OrderCreate {
  name: string;
  profit: number | string;
  planned_start: string;
  planned_end: string;
  tech_process_id: number;
}

export interface OrderUpdate {
  name?: string | null;
  profit?: number | string | null;
  planned_start?: string | null;
  planned_end?: string | null;
  tech_process_id?: number | null;
}

export interface WorkerResponse {
  id: number;
  name: string;
  profession: string;
}

export interface WorkerCreate {
  name: string;
  profession: string;
}

export interface WorkerUpdate {
  name?: string | null;
  profession?: string | null;
}

export interface EquipmentResponse {
  id: number;
  name: string;
  model: string;
}

export interface EquipmentCreate {
  name: string;
  model: string;
}

export interface EquipmentUpdate {
  name?: string | null;
  model?: string | null;
}

export interface TechProcessListItem {
  id: number;
  name: string;
}

export interface TechProcessCreate {
  name: string;
}

export interface TechProcessUpdate {
  name?: string | null;
}

export interface TaskResponse {
  id: number;
  tech_process_id: number;
  sequence_number: number;
  duration_minutes: number;
  profession: string;
  equipment_model: string;
  name: string | null;
}

export interface TaskCreate {
  sequence_number: number;
  duration_minutes: number;
  profession: string;
  equipment_model: string;
  name?: string | null;
}

export interface TaskUpdate {
  sequence_number?: number | null;
  duration_minutes?: number | null;
  profession?: string | null;
  equipment_model?: string | null;
  name?: string | null;
}

export interface TechProcessDetailResponse {
  id: number;
  name: string;
  tasks: TaskResponse[];
}

/**
 * Один элемент расписания — POST /api/schedule → ScheduleResponse.operations
 * (см. backend ScheduledOperationItem).
 */
export interface ScheduledOperation {
  id: number;
  order_id: number;
  order_name: string;
  task_id: number;
  task_name: string | null;
  sequence_number: number;
  worker_id: number;
  worker_name: string;
  worker_profession: string;
  equipment_id: number;
  equipment_name: string;
  equipment_model: string;
  /** Момент начала/конца в ISO-8601 (обычно UTC, Z); в UI расписания — также Europe/Samara. */
  start_time: string;
  /** Момент начала/конца в ISO-8601 (обычно UTC, Z); в UI расписания — также Europe/Samara. */
  end_time: string;
}

/** Заказ, полностью вошедший в расписание (принцип «всё или ничё»). */
export interface IncludedOrderItem {
  id: number;
  name: string;
  /** Decimal из API — в JSON обычно число; строка допускается при сериализации. */
  profit: number | string;
}

/** Заказ, исключённый из расписания. */
export interface ExcludedOrderItem {
  order_id: number;
  order_name: string;
  code: string;
  reason: string;
}

/** Запись issues / блокирующие ошибки 422 (ScheduleIssueItem). */
export interface ScheduleIssueItem {
  level: "error" | "warning";
  code: string;
  message: string;
  tech_process_id?: number | null;
  tech_process_name?: string | null;
  task_id?: number | null;
  order_id?: number | null;
  order_name?: string | null;
}

export interface ResourceUtilizationRow {
  id: number;
  name: string;
  detail: string;
  busy_minutes: number;
  available_minutes: number;
  utilization_percent: number;
  idle_percent: number;
}

export interface AggregateUtilizationMetrics {
  workers_mean_utilization_percent: number;
  equipment_mean_utilization_percent: number;
  total_busy_minutes_sum_workers: number;
  total_busy_minutes_sum_equipment: number;
  pool_worker_load_percent: number;
  pool_equipment_load_percent: number;
}

export interface BottleneckItem {
  resource_kind: "worker" | "equipment";
  id: number;
  name: string;
  utilization_percent: number;
  role: "high_load" | "high_idle";
}

/** Ответ POST /api/auth/login (JWT, как у FastAPI OAuth2 password). */
export interface AuthAccessTokenResponse {
  access_token: string;
  token_type?: string;
}

/** Метрики отчёта; рекомендации — в metrics.recommendations. */
export interface ScheduleReportMetrics {
  period_start: string;
  period_end: string;
  available_minutes_per_resource: number;
  workers: ResourceUtilizationRow[];
  equipment: ResourceUtilizationRow[];
  aggregate: AggregateUtilizationMetrics;
  bottlenecks_highest_load: BottleneckItem[];
  bottlenecks_highest_idle: BottleneckItem[];
  recommendations: string[];
}

/**
 * Результат POST /api/schedule (ScheduleResponse в backend).
 * Поля period_*, included_orders, metrics и т.д. обязательны в актуальном API;
 * помечены optional только для мягкой деградации при старых сборках бэкенда.
 */
export interface ScheduleResponse {
  period_start?: string;
  period_end?: string;
  included_orders?: IncludedOrderItem[];
  excluded_orders?: ExcludedOrderItem[];
  total_profit: number | string;
  /** Основное поле расписания (имя в backend — operations). */
  operations: ScheduledOperation[];
  issues?: ScheduleIssueItem[];
  report_summary?: string;
  metrics?: ScheduleReportMetrics;
  /** Зарезервировано, если бэкенд добавит отдельный статус прогона. */
  status?: string;
}

/** Тело 422 с planning_validation_failed (PlanningValidationErrorContent). */
export interface PlanningValidationErrorContent {
  error: "planning_validation_failed";
  errors: ScheduleIssueItem[];
  warnings: ScheduleIssueItem[];
  report_summary: string;
}

/**
 * POST /api/schedule — границы планового периода: timezone-aware ISO-8601 (UTC или смещение, напр. +04:00);
 * оба поля или ни одного (тогда backend подставит период по умолчанию — полночь Europe/Samara, +14 суток).
 */
export interface ScheduleRequest {
  period_start?: string | null;
  period_end?: string | null;
}
