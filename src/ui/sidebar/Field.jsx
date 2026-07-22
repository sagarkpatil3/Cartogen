// @ts-check
/**
 * FIELD — a labelled control row used throughout the inspector.
 * @param {{ label: string, children: React.ReactNode }} props
 */
export default function Field({ label, children }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-[11px] text-slate-400">{label}</span>
      {children}
    </label>
  );
}