/**
 * Reusable labelled <select> using DaisyUI.
 * @param {Array<{value:string, label:string}>} options
 */
export default function Select({ label, options = [], className = "", ...rest }) {
  return (
    <div className="form-control w-full">
      {label && (
        <label className="label">
          <span className="label-text font-medium">{label}</span>
        </label>
      )}
      <select className={`select select-bordered w-full ${className}`} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
