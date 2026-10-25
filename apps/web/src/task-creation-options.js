import { useCallback, useEffect, useState } from "react";
export function useTaskCreationOptions(enabled, projectId, onSessionExpired) {
    const [read, setRead] = useState();
    const [revision, setRevision] = useState(0);
    const retry = useCallback(() => setRevision(value => value + 1), []);
    useEffect(() => {
        if (!enabled)
            return;
        let active = true;
        setRead({ key: projectId, status: "loading" });
        void (async () => {
            try {
                const query = projectId ? `?${new URLSearchParams({ projectId })}` : "";
                const response = await fetch(`/api/v1/tasks/creation-options${query}`, { credentials: "include", cache: "no-store" });
                if (!active)
                    return;
                if (response.status === 401) {
                    if (onSessionExpired)
                        onSessionExpired();
                    else
                        window.dispatchEvent(new Event("sense-session-ended"));
                }
                if (!response.ok)
                    throw Object.assign(new Error("choices-unavailable"), { status: response.status });
                const data = await response.json();
                const validPeople = (value) => Array.isArray(value) && value.every(person => person && typeof person.id === "string" && typeof person.name === "string" && typeof person.homeBranchId === "string");
                if ((data.project?.id ?? "") !== projectId || !validPeople(data.owners) || !validPeople(data.collaborators) || typeof data.canAssign !== "boolean" || typeof data.canCreate !== "boolean" || data.actorEmployeeId !== null && typeof data.actorEmployeeId !== "string" || data.canCreate && data.owners.length === 0)
                    throw new Error("Invalid participant context");
                if (active)
                    setRead({ key: projectId, status: "ready", data });
            }
            catch (cause) {
                if (!active)
                    return;
                const status = cause instanceof Error && "status" in cause ? Number(cause.status) : 0;
                setRead({ key: projectId, status: "error", message: status === 403 || status === 404 ? "You do not have access to create tasks in this context." : status === 409 ? "This project is unavailable for new delivery work. Review its current state." : "Available task participants could not be loaded. Your draft is preserved." });
            }
        })();
        return () => { active = false; };
    }, [enabled, projectId, revision, onSessionExpired]);
    const current = enabled && read?.key === projectId ? read : undefined;
    return { status: current?.status ?? "loading", options: current?.data, error: current?.message, retry };
}
