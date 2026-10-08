import { useCallback, useEffect, useMemo, useState } from "react";

/** Query-state helper for workspace components that are also rendered outside a Router in unit tests. */
export function useWindowSearchParams(): [URLSearchParams, (updater: (current: URLSearchParams) => URLSearchParams, options?: { replace?: boolean }) => void] {
  const [search, setSearch] = useState(() => window.location.search);
  useEffect(() => {
    const sync = (): void => setSearch(window.location.search);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const update = useCallback((updater: (current: URLSearchParams) => URLSearchParams, options: { replace?: boolean } = {}): void => {
    const next = updater(new URLSearchParams(window.location.search));
    const url = new URL(window.location.href);
    url.search = next.toString();
    window.history[options.replace ? "replaceState" : "pushState"](window.history.state, "", url);
    setSearch(url.search);
  }, []);
  return [params, update];
}
