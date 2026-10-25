import { useCallback, useEffect, useMemo, useState } from "react";
/** Query-state helper for workspace components that are also rendered outside a Router in unit tests. */
export function useWindowSearchParams() {
    const [search, setSearch] = useState(() => window.location.search);
    useEffect(() => {
        const sync = () => setSearch(window.location.search);
        window.addEventListener("popstate", sync);
        return () => window.removeEventListener("popstate", sync);
    }, []);
    const params = useMemo(() => new URLSearchParams(search), [search]);
    const update = useCallback((updater, options = {}) => {
        const next = updater(new URLSearchParams(window.location.search));
        const url = new URL(window.location.href);
        url.search = next.toString();
        window.history[options.replace ? "replaceState" : "pushState"](window.history.state, "", url);
        setSearch(url.search);
    }, []);
    return [params, update];
}
