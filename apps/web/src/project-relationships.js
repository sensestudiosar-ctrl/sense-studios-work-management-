import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
/** Existing CRM reads remain the authority; no raw identifier entry or new grant. */
export function ProjectRelationships({ branchId, clientId, wonLeadId, onClient, onLead, disabled }) {
    const [read, setRead] = useState();
    const [revision, setRevision] = useState(0);
    const [clientSearch, setClientSearch] = useState("");
    const [leadSearch, setLeadSearch] = useState("");
    const [moreBusy, setMoreBusy] = useState(false);
    const generation = useRef(0);
    const previousBranch = useRef(branchId);
    useEffect(() => {
        if (previousBranch.current !== branchId) {
            onClient("");
            onLead("");
            setClientSearch("");
            setLeadSearch("");
            previousBranch.current = branchId;
        }
    }, [branchId, onClient, onLead]);
    useEffect(() => {
        const current = ++generation.current;
        setMoreBusy(false);
        if (!branchId) {
            setRead(undefined);
            return;
        }
        let live = true;
        setRead({ branchId, clients: [], leads: [], total: 0, clientError: "", leadError: "", loading: true });
        const get = async (path) => {
            const response = await fetch(path, { credentials: "include", cache: "no-store" });
            if (response.status === 401 && live)
                window.dispatchEvent(new Event("sense-session-ended"));
            if (!response.ok)
                throw new Error(response.status === 403 ? "This account cannot read these CRM choices." : "Choices could not be loaded. Try again.");
            const result = await response.json();
            if (!Array.isArray(result.items) || !result.items.every(item => item && typeof item === "object" && typeof item.id === "string" && typeof (path.includes("/clients?") ? item.name : item.title) === "string") || (path.includes("/leads?") && (typeof result.total !== "number" || !Number.isFinite(result.total) || result.total < 0)))
                throw new Error("Choices could not be loaded. Try again.");
            return result;
        };
        void Promise.allSettled([
            get(`/api/v1/crm/clients?branchId=${encodeURIComponent(branchId)}`),
            get(`/api/v1/crm/leads?branchId=${encodeURIComponent(branchId)}&stage=WON&offset=0&limit=100`)
        ]).then(([clients, leads]) => {
            if (!live || generation.current !== current)
                return;
            setRead({ branchId, clients: clients.status === "fulfilled" ? clients.value.items : [], leads: leads.status === "fulfilled" ? leads.value.items : [], total: leads.status === "fulfilled" ? leads.value.total : 0,
                clientError: clients.status === "rejected" ? String(clients.reason instanceof Error ? clients.reason.message : "Client choices unavailable.") : "",
                leadError: leads.status === "rejected" ? String(leads.reason instanceof Error ? leads.reason.message : "Lead choices unavailable.") : "", loading: false });
        });
        return () => { live = false; generation.current++; };
    }, [branchId, revision]);
    const current = read?.branchId === branchId ? read : undefined;
    const more = async () => {
        if (!current || moreBusy || current.leads.length >= current.total)
            return;
        const request = generation.current;
        setMoreBusy(true);
        try {
            const response = await fetch(`/api/v1/crm/leads?branchId=${encodeURIComponent(branchId)}&stage=WON&offset=${current.leads.length}&limit=100`, { credentials: "include", cache: "no-store" });
            if (response.status === 401 && request === generation.current)
                window.dispatchEvent(new Event("sense-session-ended"));
            if (!response.ok)
                throw new Error("More won leads could not be loaded.");
            const result = await response.json();
            if (!Array.isArray(result.items) || !result.items.every(item => item && typeof item === "object" && typeof item.id === "string" && typeof item.title === "string") || !Number.isFinite(result.total) || result.total < 0)
                throw new Error("Invalid choices");
            if (request === generation.current)
                setRead(value => value?.branchId === branchId ? { ...value, leads: [...value.leads, ...result.items], total: result.total, leadError: "" } : value);
        }
        catch {
            if (request === generation.current)
                setRead(value => value ? { ...value, leadError: "More won leads could not be loaded. Try again." } : value);
        }
        finally {
            if (request === generation.current)
                setMoreBusy(false);
        }
    };
    return _jsxs("section", { className: "project-relationships", "aria-label": "Client and lead links", children: [_jsx("p", { children: "Link an existing client or won lead, or leave both blank for a direct project." }), !branchId ? _jsx("p", { children: "Choose a project branch to find clients and won leads." }) : !current || current.loading ? _jsx("p", { role: "status", children: "Loading client and lead choices\u2026" }) : _jsxs(_Fragment, { children: [_jsxs("label", { className: "relationship-search", children: ["Search clients", _jsx("input", { type: "search", value: clientSearch, onChange: event => setClientSearch(event.target.value), disabled: disabled })] }), _jsxs("label", { children: ["Client (optional)", _jsxs("select", { "aria-label": "Client", value: clientId, onChange: event => onClient(event.target.value), disabled: disabled || !!current.clientError, children: [_jsx("option", { value: "", children: "No linked client" }), current.clients.filter(client => client.id === clientId || client.name.toLowerCase().includes(clientSearch.toLowerCase())).map(client => _jsx("option", { value: client.id, children: client.name }, client.id))] })] }), current.clientError ? _jsx("p", { role: "alert", children: current.clientError }) : !current.clients.some(client => client.name.toLowerCase().includes(clientSearch.toLowerCase())) && _jsx("p", { role: "status", children: "No clients match this search." }), _jsxs("label", { className: "relationship-search", children: ["Search won leads", _jsx("input", { type: "search", value: leadSearch, onChange: event => setLeadSearch(event.target.value), disabled: disabled })] }), _jsxs("label", { children: ["Won lead (optional)", _jsxs("select", { "aria-label": "Won lead", value: wonLeadId, onChange: event => onLead(event.target.value), disabled: disabled || !!current.leadError, children: [_jsx("option", { value: "", children: "Direct project \u2014 no won lead" }), current.leads.filter(lead => lead.id === wonLeadId || lead.title.toLowerCase().includes(leadSearch.toLowerCase())).map(lead => _jsx("option", { value: lead.id, children: lead.title }, lead.id))] })] }), current.leadError && _jsx("p", { role: "alert", children: current.leadError }), !current.leadError && !current.leads.some(lead => lead.title.toLowerCase().includes(leadSearch.toLowerCase())) && _jsx("p", { role: "status", children: "No loaded won leads match this search." }), current.leads.length < current.total && _jsx("button", { type: "button", disabled: disabled || moreBusy, onClick: () => void more(), children: moreBusy ? "Loading…" : `Load more won leads (${current.leads.length} of ${current.total})` }), (current.clientError || current.leadError) && _jsx("button", { type: "button", disabled: disabled, onClick: () => setRevision(value => value + 1), children: "Retry client and lead choices" })] })] });
}
