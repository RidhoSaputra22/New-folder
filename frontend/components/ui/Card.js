export default function Card({ title, value, subtitle, highlight = false, children }) {
  return (
    <div className={`card bg-base-100 border p-4 ${highlight ? "border-success bg-success/5" : "border-base-300"}`}>
      {title && <div className="text-xs opacity-70">{title}</div>}
      {value && <div className={`text-2xl font-bold mt-1 ${highlight ? "text-success" : ""}`}>{value}</div>}
      {subtitle && <div className="text-[11px] opacity-60 mt-1">{subtitle}</div>}
      {children}
    </div>
  );
}
