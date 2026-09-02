import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endpoints, type FindingQuery } from "../api/endpoints";
import type { FindingsPage } from "../types";

export interface FindingsFilters {
  status: string;
  severity: string;
  category: string;
  column: string;
  q: string;
  sort: "severity" | "status" | "category" | "title" | "check_id";
  order: "asc" | "desc";
}

export const DEFAULT_FILTERS: FindingsFilters = {
  status: "",
  severity: "",
  category: "",
  column: "",
  q: "",
  sort: "severity",
  order: "desc",
};

/** Small debounce for the free-text search box. */
function useDebounce(value: string, ms = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

export function useFindings(runId: string | undefined, filters: FindingsFilters) {
  const query = useDebounce(filters.q.trim());
  const params = useMemo<FindingQuery>(
    () => ({
      status: filters.status || undefined,
      severity: filters.severity || undefined,
      category: filters.category || undefined,
      column: filters.column || undefined,
      q: query || undefined,
      sort: filters.sort,
      order: filters.order,
      limit: 500,
    }),
    [filters.status, filters.severity, filters.category, filters.column, query, filters.sort, filters.order],
  );

  return useQuery<FindingsPage>({
    queryKey: ["findings", runId, params],
    queryFn: () => endpoints.getFindings(runId!, params),
    enabled: Boolean(runId),
    retry: false,
  });
}
