import "./my-work-filter-chips.css";

export type AppliedTaskFilter = { key: string; label: string; value: string };
type Props = {
  items: readonly AppliedTaskFilter[];
  onRemove: (key: string) => void;
  onClear: () => void;
};

export function MyWorkFilterChips({ items, onRemove, onClear }: Props): React.JSX.Element | null {
  if (items.length === 0) return null;
  return <section className="my-work-filter-chips" aria-label="Applied task filters">
    <div className="my-work-filter-chips-list">
      {items.map((item) => {
        const description = `${item.label}: ${item.value}`;
        return <span className="my-work-filter-chip" key={item.key} title={description}>
          <span className="my-work-filter-chip-text">{description}</span>
          <button type="button" aria-label={`Remove ${item.label} filter`} onClick={() => onRemove(item.key)}>×</button>
        </span>;
      })}
    </div>
    <button type="button" className="my-work-filter-clear" onClick={onClear}>Clear all</button>
  </section>;
}
