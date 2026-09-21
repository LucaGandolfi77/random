import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRoutes } from "./App";
import { ToastProvider } from "./components/ui/Toast";
import { OfflineIndicator } from "./components/features/OfflineIndicator";
import { registerSW } from "virtual:pwa-register";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const updateSW = registerSW({
  onNeedRefresh() {
    updateSW();
  },
  onOfflineReady() {
    console.log("PWA ready for offline use");
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <OfflineIndicator />
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
