import { forceRelogin, getAccessToken } from "./authSession";
import { defaultPlanningPeriodSamara } from "./samaraTime";
import { parseFastApiErrorMessageFromJsonBody } from "./fastApiError";
import type {
  AuthAccessTokenResponse,
  EquipmentCreate,
  EquipmentResponse,
  EquipmentUpdate,
  OrderCreate,
  OrderResponse,
  OrderUpdate,
  ScheduleRequest,
  ScheduleResponse,
  ScheduledOperation,
  TaskCreate,
  TaskResponse,
  TaskUpdate,
  TechProcessCreate,
  TechProcessDetailResponse,
  TechProcessListItem,
  TechProcessUpdate,
  WorkerCreate,
  WorkerResponse,
  WorkerUpdate,
} from "./types";

/** Базовый префикс API (Vite proxy: /api → backend). */
export const API_BASE = "/api";

/** Ошибка HTTP API с человекочитаемым текстом (422/409/404/сеть). */
export class ApiError extends Error {
  readonly status: number;
  readonly humanMessage: string;

  constructor(status: number, humanMessage: string) {
    super(humanMessage);
    this.name = "ApiError";
    this.status = status;
    this.humanMessage = humanMessage;
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }

  get isValidation(): boolean {
    return this.status === 400 || this.status === 422;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }
}

async function readHttpErrorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  return parseFastApiErrorMessageFromJsonBody(text);
}

type ApiRequestInit = RequestInit & { skipAuth?: boolean };

async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { skipAuth, ...reqInit } = init;
  const url = `${API_BASE}${path}`;
  const hasBody = reqInit.body != null && String(reqInit.body).length > 0;
  const headers = new Headers(reqInit.headers as HeadersInit | undefined);
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let res: Response;
  try {
    res = await fetch(url, { ...reqInit, headers });
  } catch {
    throw new ApiError(
      0,
      "API недоступен: не удалось связаться с сервером (проверьте сеть и прокси Vite → backend).",
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    const human = await readHttpErrorMessage(res);
    if (res.status === 401 && !skipAuth) {
      forceRelogin();
      throw new ApiError(401, human || `HTTP ${res.status}`);
    }
    throw new ApiError(res.status, human || `HTTP ${res.status}`);
  }

  const text = await res.text();
  if (!text.trim()) {
    return undefined as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(res.status, "Ответ сервера не является JSON");
  }
}

/**
 * Период по умолчанию — как backend `default_planning_period`:
 * полночь календарных суток Europe/Samara, +14 суток; в JSON — UTC (Z).
 */
export function defaultPlanningPeriod(): ScheduleRequest {
  const p = defaultPlanningPeriodSamara();
  return { period_start: p.period_start, period_end: p.period_end };
}

type ScheduleResponseInput = Omit<ScheduleResponse, "operations" | "total_profit"> & {
  operations?: ScheduledOperation[];
  scheduled_operations?: ScheduledOperation[];
  total_profit?: number | string;
};

function normalizeScheduleResponse(raw: ScheduleResponseInput): ScheduleResponse {
  const operations = Array.isArray(raw.operations)
    ? raw.operations
    : Array.isArray(raw.scheduled_operations)
      ? raw.scheduled_operations
      : [];
  const total_profit = raw.total_profit ?? 0;
  const { scheduled_operations: _drop, ...rest } = raw;
  return {
    ...rest,
    operations,
    total_profit,
  };
}

export async function fetchOrders(): Promise<OrderResponse[]> {
  const data = await apiRequest<unknown>("/orders");
  if (!Array.isArray(data)) {
    throw new ApiError(500, "Некорректный формат списка заказов");
  }
  return data as OrderResponse[];
}

/** Вход планировщика: JSON `POST /api/auth/login` (явный Content-Type, чтобы не уехать в form). */
export function loginPlanner(username: string, password: string): Promise<AuthAccessTokenResponse> {
  return apiRequest<AuthAccessTokenResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: username.trim(), password }),
    skipAuth: true,
  });
}

export async function runScheduling(body?: ScheduleRequest): Promise<ScheduleResponse> {
  const raw = await apiRequest<ScheduleResponseInput>("/schedule", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
  return normalizeScheduleResponse(raw);
}

// --- Workers ---

export function listWorkers(): Promise<WorkerResponse[]> {
  return apiRequest<WorkerResponse[]>("/workers");
}

export function createWorker(body: WorkerCreate): Promise<WorkerResponse> {
  return apiRequest<WorkerResponse>("/workers", { method: "POST", body: JSON.stringify(body) });
}

export function getWorker(id: number): Promise<WorkerResponse> {
  return apiRequest<WorkerResponse>(`/workers/${id}`);
}

export function updateWorker(id: number, body: WorkerUpdate): Promise<WorkerResponse> {
  return apiRequest<WorkerResponse>(`/workers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteWorker(id: number): Promise<void> {
  return apiRequest<void>(`/workers/${id}`, { method: "DELETE" });
}

// --- Equipment ---

export function listEquipment(): Promise<EquipmentResponse[]> {
  return apiRequest<EquipmentResponse[]>("/equipment");
}

export function createEquipment(body: EquipmentCreate): Promise<EquipmentResponse> {
  return apiRequest<EquipmentResponse>("/equipment", { method: "POST", body: JSON.stringify(body) });
}

export function getEquipment(id: number): Promise<EquipmentResponse> {
  return apiRequest<EquipmentResponse>(`/equipment/${id}`);
}

export function updateEquipment(id: number, body: EquipmentUpdate): Promise<EquipmentResponse> {
  return apiRequest<EquipmentResponse>(`/equipment/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteEquipment(id: number): Promise<void> {
  return apiRequest<void>(`/equipment/${id}`, { method: "DELETE" });
}

// --- Orders ---

export function listOrdersCrud(): Promise<OrderResponse[]> {
  return apiRequest<OrderResponse[]>("/orders");
}

export function createOrder(body: OrderCreate): Promise<OrderResponse> {
  return apiRequest<OrderResponse>("/orders", { method: "POST", body: JSON.stringify(body) });
}

export function getOrder(id: number): Promise<OrderResponse> {
  return apiRequest<OrderResponse>(`/orders/${id}`);
}

export function updateOrder(id: number, body: OrderUpdate): Promise<OrderResponse> {
  return apiRequest<OrderResponse>(`/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteOrder(id: number): Promise<void> {
  return apiRequest<void>(`/orders/${id}`, { method: "DELETE" });
}

// --- Tech processes & tasks ---

export function listTechProcesses(): Promise<TechProcessListItem[]> {
  return apiRequest<TechProcessListItem[]>("/tech-processes");
}

export function createTechProcess(body: TechProcessCreate): Promise<TechProcessListItem> {
  return apiRequest<TechProcessListItem>("/tech-processes", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getTechProcess(id: number): Promise<TechProcessDetailResponse> {
  return apiRequest<TechProcessDetailResponse>(`/tech-processes/${id}`);
}

export function updateTechProcess(id: number, body: TechProcessUpdate): Promise<TechProcessListItem> {
  return apiRequest<TechProcessListItem>(`/tech-processes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function createTask(techProcessId: number, body: TaskCreate): Promise<TaskResponse> {
  return apiRequest<TaskResponse>(`/tech-processes/${techProcessId}/tasks`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateTask(taskId: number, body: TaskUpdate): Promise<TaskResponse> {
  return apiRequest<TaskResponse>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteTask(taskId: number): Promise<void> {
  return apiRequest<void>(`/tasks/${taskId}`, { method: "DELETE" });
}

// --- Operations (read-only) ---

export function listOperations(orderId?: number | null): Promise<ScheduledOperation[]> {
  const q =
    orderId != null && Number.isFinite(orderId) ? `?order_id=${encodeURIComponent(String(orderId))}` : "";
  return apiRequest<ScheduledOperation[]>(`/operations${q}`);
}
