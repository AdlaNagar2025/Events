import { useEffect, useState } from "react";
import classes from "./appDialog.module.css";

/**
 * Reusable dialog replacing window.confirm / window.prompt.
 * withInput=true → acts like prompt (textarea); otherwise confirm only.
 */
export default function AppDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  withInput = false,
  inputPlaceholder = "",
  inputDefault = "",
  onConfirm,
  onCancel,
}) {
  const [inputValue, setInputValue] = useState(inputDefault);

  useEffect(() => {
    if (open) setInputValue(inputDefault);
  }, [open, inputDefault]);

  if (!open) return null;

  const handleConfirm = () => {
    if (withInput) onConfirm?.(inputValue);
    else onConfirm?.();
  };

  return (
    <div className={classes.overlay} onClick={onCancel} role="presentation">
      <div
        className={classes.content}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title && <h3>{title}</h3>}
        {message && <p className={classes.message}>{message}</p>}

        {withInput && (
          <textarea
            className={classes.textarea}
            rows="4"
            placeholder={inputPlaceholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
        )}

        <div className={classes.actions}>
          <button type="button" className={classes.cancelBtn} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? classes.dangerBtn : classes.confirmBtn}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
