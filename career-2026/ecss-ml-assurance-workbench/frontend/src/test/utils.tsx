import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../components/ui/Toast";

type Handler = { match: (url: string) => boolean; status?: number; body: unknown };

export function createFetchMock(handlers: Handler[]): () => void {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    for (const handler of handlers) {
      if (handler.match(url)) {
        return new Response(JSON.stringify(handler.body), {
          status: handler.status ?? 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    // Unhandled endpoints fail loudly in tests instead of passing silently.
    throw new Error(`Unhandled fetch in test: ${url} ${init?.method ?? "GET"}`);
  }) as typeof fetch;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

export function route(url: string) {
  return { match: (u: string) => u.startsWith(url) };
}

export function anyOf(match: (url: string) => boolean) {
  return { match };
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  { path, initialEntry }: { path: string; initialEntry: string },
  children?: ReactElement,
) {
  const client = createQueryClient();
  const routeElement = children ?? ui;
  return {
    ...render(
      <QueryClientProvider client={client}>
        <ToastProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route path={path} element={routeElement} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>,
    ),
    client,
  };
}
