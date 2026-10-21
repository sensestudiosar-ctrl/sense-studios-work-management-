import { useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./task-create-dialog.css";

export type TaskCreateVariant = "OWNER" | "LEADER" | "EMPLOYEE" | "SITE";

export interface TaskCreateDialogProps {
  title: string;
  variant: TaskCreateVariant;
  children: ReactNode;
  onRequestClose: () => boolean;
  busy?: boolean;
  footer?: ReactNode;
  ariaDescription?: string;
}

export function TaskCreateDialog({ title, variant, children, onRequestClose, busy = false, footer, ariaDescription }: TaskCreateDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const closeRequestRef = useRef(onRequestClose);
  const suppressCloseRef = useRef(false);
  useLayoutEffect(() => { closeRequestRef.current = onRequestClose; }, [onRequestClose]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const priorFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const body = document.body;
    const oldOverflow = body.style.overflow;
    const oldScrollX = window.scrollX;
    const oldScrollY = window.scrollY;
    suppressCloseRef.current = false;
    body.style.overflow = "hidden";
    if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
    headingRef.current?.focus({ preventScroll: true });
    return () => {
      suppressCloseRef.current = true;
      if (dialog.open) dialog.close();
      body.style.overflow = oldOverflow;
      if (window.scrollX !== oldScrollX || window.scrollY !== oldScrollY) window.scrollTo(oldScrollX, oldScrollY);
      if (priorFocus?.isConnected) priorFocus.focus({ preventScroll: true });
    };
  }, []);

  const requestClose = () => {
    if (busy) return;
    closeRequestRef.current();
  };
  if (typeof document === "undefined") return null;
  const descriptionId = ariaDescription ? "task-create-dialog-description" : undefined;
  return createPortal(
    <dialog
      ref={dialogRef}
      className="task-create-dialog"
      aria-labelledby="task-create-dialog-title"
      aria-describedby={descriptionId}
      aria-modal="true"
      onCancel={(event) => { event.preventDefault(); requestClose(); }}
      onClose={() => { if (!suppressCloseRef.current && !dialogRef.current?.open) requestClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) requestClose(); }}
    >
      <div className="task-create-dialog__frame">
        <header className="task-create-dialog__header">
          <div className="task-create-dialog__heading">
            <span className="task-create-dialog__eyebrow">{variant} · CREATE TASK</span>
            <h2 id="task-create-dialog-title" ref={headingRef} tabIndex={-1}>{title}</h2>
            {ariaDescription && <p id={descriptionId}>{ariaDescription}</p>}
          </div>
          <button ref={closeRef} className="task-create-dialog__close" type="button" aria-label="Close create task" disabled={busy} onClick={requestClose}>×</button>
        </header>
        <section className="task-create-dialog__body">{children}</section>
        {footer && <footer className="task-create-dialog__footer">{footer}</footer>}
      </div>
    </dialog>,
    document.body,
  );
}
