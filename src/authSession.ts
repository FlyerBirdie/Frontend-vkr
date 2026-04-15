/** Ключ хранения JWT планировщика (только sessionStorage — вкладка закрыта → сессия сброшена). */
const ACCESS_TOKEN_KEY = "planner_access_token";

export function getAccessToken(): string | null {
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function loginHref(): string {
  const base = import.meta.env.BASE_URL;
  if (!base || base === "/") return "/login";
  return `${base.replace(/\/$/, "")}/login`;
}

/**
 * Полный переход на /login после 401: сбрасывает токен и перезагружает маршрутизацию
 * (очищается и React-состояние вроде контекста расписания).
 */
export function forceRelogin(): void {
  clearAccessToken();
  window.location.assign(loginHref());
}
