const variantMap = {
  primary: "btn-success",
  secondary: "btn-info",
  danger: "btn-error",
  success: "btn-success",
};

/**
 * Reusable button using DaisyUI btn classes.
 * @param {object}  props
 * @param {"primary"|"danger"|"secondary"|"success"} props.variant
 * @param {boolean} props.loading
 */
export default function Button({
  children,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  ...rest
}) {
  return (
    <button
      className={`btn ${variantMap[variant] || "btn-success"} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="loading loading-spinner loading-sm" />}
      {loading ? "Loading..." : children}
    </button>
  );
}
