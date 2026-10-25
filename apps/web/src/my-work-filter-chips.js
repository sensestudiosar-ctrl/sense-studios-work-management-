import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import "./my-work-filter-chips.css";
export function MyWorkFilterChips({ items, onRemove, onClear }) {
    if (items.length === 0)
        return null;
    return _jsxs("section", { className: "my-work-filter-chips", "aria-label": "Applied task filters", children: [_jsx("div", { className: "my-work-filter-chips-list", children: items.map((item) => {
                    const description = `${item.label}: ${item.value}`;
                    return _jsxs("span", { className: "my-work-filter-chip", title: description, children: [_jsx("span", { className: "my-work-filter-chip-text", children: description }), _jsx("button", { type: "button", "aria-label": `Remove ${item.label} filter`, onClick: () => onRemove(item.key), children: "\u00D7" })] }, item.key);
                }) }), _jsx("button", { type: "button", className: "my-work-filter-clear", onClick: onClear, children: "Clear all" })] });
}
