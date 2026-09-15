'use client';

import { useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Remove Photo',
  cancelLabel = 'Cancel',
  onCancel,
  onConfirm,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dh-confirm-title"
        aria-describedby="dh-confirm-desc"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 50px rgba(15,23,42,0.25)',
          padding: '22px',
        }}
      >
        <h2
          id="dh-confirm-title"
          style={{ margin: '0 0 10px', fontSize: '1.15rem', color: '#0f172a' }}
        >
          {title}
        </h2>
        <p
          id="dh-confirm-desc"
          style={{ margin: '0 0 20px', color: '#475569', lineHeight: 1.45 }}
        >
          {message}
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#dc2626',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}