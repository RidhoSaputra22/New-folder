const variantMap = {
  error: "alert-error",
  success: "alert-success",
  warning: "alert-warning",
  info: "alert-info",
};

/**
 * Reusable alert using DaisyUI.
 * @param {"error"|"success"|"warning"|"info"} variant
 */
export default function Alert({ children, variant = "info" }) {
  if (!children) return null;
  return (
    <div className={`alert ${variantMap[variant] || "alert-info"} my-2`}>
      <div>{children}</div>
    </div>
  );
}
