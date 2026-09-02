import type { ApiErrorBody } from "../types";

export class ApiRequestError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown> | null;

  constructor(status: number, body: Partial<ApiErrorBody> | string) {
    const parsed = typeof body === "string" ? { message: body } : body;
    super(parsed.message || `Request failed (${status})`);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = parsed.code || "HTTP_ERROR";
    this.details = parsed.details ?? null;
  }
}

export const API_BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: init?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...init,
  });
  if (!response.ok) {
    let body: Partial<ApiErrorBody> = {};
    try {
      body = (await response.json()) as Partial<ApiErrorBody>;
    } catch {
      body = { message: response.statusText };
    }
    throw new ApiRequestError(response.status, body);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, isForm = false) =>
    request<T>(path, { method: "POST", body: isForm ? (body as FormData) : JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
