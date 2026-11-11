import { useEffect, useRef } from "react";
export function useDialog(open, close) {
  const callback = useRef(close);
  callback.current = close;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const dialog = [...document.querySelectorAll('[role="dialog"]')].find(
      (el) => el.getClientRects().length,
    );
    if (!dialog) return;
    const focusable = () =>
      [
        ...dialog.querySelectorAll(
          'button,input,textarea,select,a[href],[tabindex="0"]',
        ),
      ].filter((el) => !el.disabled && el.getClientRects().length);
    (dialog.querySelector("input,textarea,select") || focusable()[0])?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handle(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        callback.current();
      }
      if (e.key === "Tab") {
        const items = focusable(),
          first = items[0],
          last = items.at(-1);
        if (!first) return;
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            !dialog.contains(document.activeElement))
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            !dialog.contains(document.activeElement))
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
}
