import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import '../../styles/ActionDialog.css';
export default function ActionDialog({ title, description, children, onClose, busy = false }: { title: string; description: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const element = useRef<HTMLDialogElement>(null);
  const titleId = useId(); const descriptionId = useId();
  useEffect(() => {
    const dialog = element.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    if (dialog && !dialog.open) dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = overflow; if (trigger?.isConnected) trigger.focus({ preventScroll: true }); };
  }, []);
  return createPortal(<dialog className="action-dialog" ref={element} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => { if (!busy && event.target === event.currentTarget) onClose(); }}><div className="action-dialog__inner"><button className="action-dialog__close" type="button" onClick={onClose} disabled={busy} aria-label="Close dialog"><X size={20} aria-hidden="true" /></button><p className="action-dialog__eyebrow">THE TABLE / REVIEW & CONFIRM</p><h2 id={titleId}>{title}</h2><p id={descriptionId} className="action-dialog__description">{description}</p>{children}</div></dialog>, document.body);
}
