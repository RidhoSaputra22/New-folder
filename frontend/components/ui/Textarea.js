/**
 * Reusable labelled <textarea> using DaisyUI.
 */
export default function Textarea({ label, className = "", ...rest }) {
  return (
    <div className="form-control w-full">
      {label && (
        <label className="label">
          <span className="label-text font-medium">{label}</span>
        </label>
      )}
      <textarea className={`textarea textarea-bordered w-full font-mono ${className}`} {...rest} />
    </div>
  );
}
