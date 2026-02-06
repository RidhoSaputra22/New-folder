/**
 * Reusable labelled input using DaisyUI.
 */
export default function Input({ label, className = "", ...rest }) {
  return (
    <div className="form-control w-full">
      {label && (
        <label className="label">
          <span className="label-text font-medium">{label}</span>
        </label>
      )}
      <input className={`input input-bordered w-full ${className}`} {...rest} />
    </div>
  );
}
