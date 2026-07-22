// @ts-check
/** Small uppercase heading used above each sidebar section. */
export default function SectionLabel({ children }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
      {children}
    </div>
  );
}
 