// src/components/funds/FundSearchField.jsx
import { useEffect, useRef, useState } from "react";
import api from "../../utils/api";
import useDebounce from "../../hooks/useDebounce";

/**
 * FundSearchField Component
 *
 * Props:
 *   - onSelect(fund) : callback when fund is selected (optional)
 *   - onChange(fund) : callback when fund selection changes (optional) — used in AddSipModal
 *   - initial        : optional pre-filled selected fund object
 *   - placeholder    : optional input placeholder
 *   - preload        : boolean (default true) -> fetch /funds on mount
 *   - maxResults     : number (default 10)
 */
export default function FundSearchField({
  onSelect = null,
  onChange = null,
  initial = null,
  placeholder = "Search funds...",
  preload = true,
  maxResults = 10,
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(initial);
  const [funds, setFunds] = useState(null); // null -> not loaded yet
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => (mounted.current = false);
  }, []);

  // initialize from `initial` prop (if provided/updated)
  useEffect(() => {
    if (initial) {
      setSelected(initial);
      setQuery(initial.fund_name ?? initial.name ?? initial.scheme_code ?? "");
    }
  }, [initial]);

  // Preload full funds list (if requested)
  useEffect(() => {
    if (!preload) return;
    let cancelled = false;
    setLoading(true);
    api
      .get("/funds")
      .then((r) => {
        if (cancelled || !mounted.current) return;
        const arr = r.data?.data ?? r.data ?? [];
        setFunds(Array.isArray(arr) ? arr : []);
      })
      .catch((e) => {
        console.error("Failed to preload funds:", e);
        if (cancelled || !mounted.current) return;
        setFunds([]);
      })
      .finally(() => {
        if (!cancelled && mounted.current) setLoading(false);
      });
    return () => (cancelled = true);
  }, [preload]);

  // Local filtering or fallback server search when debounced query changes
  useEffect(() => {
    const q = (debouncedQuery || "").trim().toLowerCase();
    if (!q) {
      setResults([]);
      return;
    }

    // If we have a local funds array, filter locally
    if (Array.isArray(funds)) {
      const filtered = funds
        .filter((f) => {
          const name = (f.fund_name ?? f.name ?? "").toString().toLowerCase();
          const code = (f.scheme_code ?? f.fund_id ?? "")
            .toString()
            .toLowerCase();
          return name.includes(q) || code.includes(q);
        })
        .slice(0, maxResults);
      setResults(filtered);
      return;
    }

    // Fallback: call server-side search endpoint once
    let cancelled = false;
    setLoading(true);
    api
      .get(`/funds/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => {
        if (cancelled || !mounted.current) return;
        const arr = r.data?.data ?? r.data ?? [];
        setResults(Array.isArray(arr) ? arr.slice(0, maxResults) : []);
      })
      .catch((e) => {
        if (cancelled || !mounted.current) return;
        console.error("Search fallback failed", e);
        setResults([]);
      })
      .finally(() => {
        if (!cancelled && mounted.current) setLoading(false);
      });

    return () => (cancelled = true);
  }, [debouncedQuery, funds, maxResults]);

  const handleSelect = (f) => {
    setSelected(f);
    const label = f.fund_name ?? f.name ?? f.scheme_code ?? "";
    setQuery(label);
    setResults([]);
    if (typeof onSelect === "function") onSelect(f);
    if (typeof onChange === "function") onChange(f);
  };

  function clearSelection() {
    setSelected(null);
    setQuery("");
    setResults([]);
    if (typeof onSelect === "function") onSelect?.(null);
    if (typeof onChange === "function") onChange?.(null);
  }

  return (
    <div className="w-full relative">
      {selected ? (
        <div className="p-2 border rounded bg-slate-50 flex justify-between items-start gap-3">
          <div>
            <div className="font-medium text-sm">
              {selected.fund_name ?? selected.name}
            </div>
            <div className="text-xs text-slate-500">
              {selected.scheme_code ?? selected.fund_id} • {selected.category}
            </div>

            {selected.expected_return != null && (
              <div className="text-xs text-slate-500 mt-1">
                Expected return:{" "}
                {(Number(selected.expected_return) * 100).toFixed(2)}%
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 ml-4">
            <button
              type="button"
              onClick={() => {
                // allow changing selection: remove selected but keep query so user can search again
                setSelected(null);
                setResults([]);
                setQuery("");
                if (typeof onChange === "function") onChange?.(null);
              }}
              className="px-2 py-1 border rounded text-xs"
            >
              Change
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="px-2 py-1 bg-red-600 text-white rounded text-xs"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full border p-2 rounded"
          />

          {loading && (
            <div className="text-xs text-slate-500 mt-1">Searching…</div>
          )}

          {results.length > 0 && (
            <div className="mt-1 border rounded max-h-52 overflow-auto bg-white shadow z-30 absolute w-full">
              {results.map((f) => {
                const key = f.scheme_code ?? f.fund_id ?? JSON.stringify(f);
                return (
                  <div
                    key={key}
                    className="p-2 hover:bg-slate-100 cursor-pointer"
                    onClick={() => handleSelect(f)}
                  >
                    <div className="font-medium text-sm">
                      {f.fund_name ?? f.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {f.scheme_code ?? f.fund_id} • {f.category}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
