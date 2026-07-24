"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  BUDGET_RANGE_LABELS,
  LEADS_PAGE_SIZE,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type BudgetRangeValue,
  type LeadStatusValue,
} from "@/lib/validation/lead";

/** A row as returned by GET /api/leads (dates arrive JSON-serialised). */
type Lead = {
  id: string;
  name: string;
  email: string;
  budgetRange: BudgetRangeValue;
  message: string;
  status: LeadStatusValue;
  createdAt: string;
};

type ListResponse = {
  leads: Lead[];
  total: number;
  hasMore: boolean;
};

const SEARCH_DEBOUNCE_MS = 350;
const MESSAGE_PREVIEW_CHARS = 110;

export function LeadsTable() {
  // --- Filters -------------------------------------------------------------
  // `searchInput` is what the user is typing; `search` is the debounced value
  // that actually triggers a request. Keeping them separate is what stops a
  // fetch firing on every keystroke.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatusValue | "">("");

  // --- Data ----------------------------------------------------------------
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // --- UI state ------------------------------------------------------------
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Ids whose status PATCH is still in flight, so the control can be disabled.
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  /**
   * Monotonically increasing id for the "first page" request. A slow response
   * for "ac" must not overwrite a fast response for "acme" — comparing this
   * counter on arrival discards anything that is no longer the newest request.
   */
  const requestIdRef = useRef(0);

  // Debounce the search box.
  useEffect(() => {
    const timer = setTimeout(
      () => setSearch(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [searchInput]);

  const buildQuery = useCallback(
    (skip: number) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      params.set("skip", String(skip));
      params.set("take", String(LEADS_PAGE_SIZE));
      return params.toString();
    },
    [search, statusFilter],
  );

  // Fetch the first page whenever the filters change.
  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    fetch(`/api/leads?${buildQuery(0)}`, { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          // The session expired while the tab was open. A full navigation
          // (rather than router.push) lets the proxy issue the login redirect.
          window.location.href = "/admin/login";
          return null;
        }
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        return (await response.json()) as ListResponse;
      })
      .then((data) => {
        // Ignore stale responses.
        if (!data || requestId !== requestIdRef.current) return;
        setLeads(data.leads);
        setTotal(data.total);
        setHasMore(data.hasMore);
        setExpandedIds(new Set());
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (requestId !== requestIdRef.current) return;
        setError("Could not load leads. Check your connection and retry.");
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setIsLoading(false);
      });

    return () => controller.abort();
  }, [buildQuery]);

  async function loadMore() {
    setIsLoadingMore(true);
    setError(null);

    try {
      const response = await fetch(`/api/leads?${buildQuery(leads.length)}`);
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!response.ok) throw new Error(`Request failed (${response.status})`);

      const data = (await response.json()) as ListResponse;
      // Append, de-duplicating by id in case a new lead shifted the offset
      // window between the two requests.
      setLeads((current) => {
        const seen = new Set(current.map((lead) => lead.id));
        return [...current, ...data.leads.filter((lead) => !seen.has(lead.id))];
      });
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch {
      setError("Could not load more leads. Please try again.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  /**
   * Optimistic status change: paint the new value immediately, then reconcile
   * with the server's response — or roll back to the previous value if the
   * request fails, so the UI never quietly lies about what was saved.
   */
  async function updateStatus(lead: Lead, nextStatus: LeadStatusValue) {
    if (nextStatus === lead.status) return;

    const previousStatus = lead.status;
    setLeads((current) =>
      current.map((row) =>
        row.id === lead.id ? { ...row, status: nextStatus } : row,
      ),
    );
    setSavingIds((current) => new Set(current).add(lead.id));
    setError(null);

    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!response.ok) throw new Error(`Request failed (${response.status})`);

      // Trust the server's copy of the row over the optimistic guess.
      const updated = (await response.json()) as Lead;
      setLeads((current) =>
        current.map((row) => (row.id === lead.id ? updated : row)),
      );
    } catch {
      setLeads((current) =>
        current.map((row) =>
          row.id === lead.id ? { ...row, status: previousStatus } : row,
        ),
      );
      setError(`Could not update ${lead.name}. The change was rolled back.`);
    } finally {
      setSavingIds((current) => {
        const next = new Set(current);
        next.delete(lead.id);
        return next;
      });
    }
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const isFiltered = Boolean(search || statusFilter);

  return (
    <div className="space-y-5">
      {/* --- Controls -------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <label htmlFor="lead-search" className="sr-only">
            Search leads by name or email
          </label>
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 3.4 9.8l3.4 3.4a1 1 0 0 0 1.4-1.4l-3.4-3.4A5.5 5.5 0 0 0 9 3.5Zm-3.5 5.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z"
              clipRule="evenodd"
            />
          </svg>
          <input
            id="lead-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-slate-400 hover:border-slate-400"
          />
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="status-filter" className="sr-only">
            Filter by status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as LeadStatusValue | "")
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm hover:border-slate-400"
          >
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {LEAD_STATUS_LABELS[status]}
              </option>
            ))}
          </select>

          <p className="whitespace-nowrap text-sm text-slate-500 tabular-nums">
            {isLoading ? "…" : `${total} lead${total === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {/* --- Error banner ---------------------------------------------- */}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {/* --- Table ------------------------------------------------------ */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Name
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Email
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Budget
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Message
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Received
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <SkeletonRows />
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <p className="font-medium text-slate-900">
                      {isFiltered ? "No matching leads" : "No leads yet"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {isFiltered
                        ? "Try a different name, email or status filter."
                        : "Submissions from the landing page will appear here."}
                    </p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isExpanded = expandedIds.has(lead.id);
                  const isLong = lead.message.length > MESSAGE_PREVIEW_CHARS;

                  return (
                    <tr key={lead.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {lead.name}
                      </td>
                      <td className="px-5 py-4">
                        <a
                          href={`mailto:${lead.email}`}
                          className="text-brand-600 hover:underline"
                        >
                          {lead.email}
                        </a>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {BUDGET_RANGE_LABELS[lead.budgetRange]}
                      </td>
                      <td className="max-w-sm px-5 py-4 text-slate-600">
                        <p className={isExpanded ? "whitespace-pre-wrap" : ""}>
                          {isExpanded || !isLong
                            ? lead.message
                            : `${lead.message.slice(0, MESSAGE_PREVIEW_CHARS).trimEnd()}…`}
                        </p>
                        {isLong && (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(lead.id)}
                            aria-expanded={isExpanded}
                            className="mt-1 text-xs font-semibold text-brand-600 hover:underline"
                          >
                            {isExpanded ? "Show less" : "Show more"}
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusSelect
                          lead={lead}
                          isSaving={savingIds.has(lead.id)}
                          onChange={(next) => updateStatus(lead, next)}
                        />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                        {formatDate(lead.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Load more --------------------------------------------------- */}
      {hasMore && !isLoading && (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
          <p className="text-xs text-slate-500 tabular-nums">
            Showing {leads.length} of {total}
          </p>
        </div>
      )}
    </div>
  );
}

/** Status dropdown, colour-coded so the inbox is scannable at a glance. */
function StatusSelect({
  lead,
  isSaving,
  onChange,
}: {
  lead: Lead;
  isSaving: boolean;
  onChange: (status: LeadStatusValue) => void;
}) {
  const tone: Record<LeadStatusValue, string> = {
    NEW: "border-blue-300 bg-blue-50 text-blue-800",
    CONTACTED: "border-amber-300 bg-amber-50 text-amber-900",
    CLOSED: "border-slate-300 bg-slate-100 text-slate-600",
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={`status-${lead.id}`} className="sr-only">
        Status for {lead.name}
      </label>
      <select
        id={`status-${lead.id}`}
        value={lead.status}
        disabled={isSaving}
        onChange={(event) => onChange(event.target.value as LeadStatusValue)}
        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${tone[lead.status]}`}
      >
        {LEAD_STATUSES.map((status) => (
          <option key={status} value={status}>
            {LEAD_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      {isSaving && (
        <span className="text-xs text-slate-400" aria-live="polite">
          Saving…
        </span>
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: 6 }).map((__, cellIndex) => (
            <td key={cellIndex} className="px-5 py-4">
              <div className="h-4 animate-pulse rounded bg-slate-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Rendered client-side only after hydration would risk a mismatch, so this is
 * kept to a fixed, locale-independent format that the server and browser
 * produce identically.
 */
function formatDate(iso: string) {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-GB", { month: "short" });
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
  return `${day} ${month} ${date.getFullYear()}, ${time}`;
}
