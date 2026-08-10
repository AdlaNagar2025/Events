import classes from "./appDialog.module.css";

/**
 * Content panel modal (profile, report details, event details).
 * For confirm/prompt use AppDialog instead.
 */
export default function AppModal({
  open,
  title,
  subtitle,
  onClose,
  children,
  size = "md",
}) {
  if (!open) return null;

  const sizeClass =
    size === "lg"
      ? classes.contentLg
      : size === "sm"
        ? classes.contentSm
        : classes.contentMd;

  return (
    <div className={classes.overlay} onClick={onClose} role="presentation">
      <div
        className={`${classes.content} ${classes.panel} ${sizeClass}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className={classes.closeBtn}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {(title || subtitle) && (
          <header className={classes.panelHeader}>
            {title && <h3>{title}</h3>}
            {subtitle && <p className={classes.message}>{subtitle}</p>}
          </header>
        )}

        <div className={classes.panelBody}>{children}</div>
      </div>
    </div>
  );
}
