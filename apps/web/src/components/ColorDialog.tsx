import * as Dialog from '@radix-ui/react-dialog';
import React from 'react';

export default function ColorDialog({
  open,
  onClose,
  onSelect
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (color: 'blue' | 'green' | 'split') => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            background: 'rgba(0,0,0,0.2)',
            position: 'fixed',
            inset: 0
          }}
        />
        <Dialog.Content
          style={{
            position: 'fixed',
            zIndex: 1000,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#fff',
            borderRadius: 16,
            padding: 20,
            width: 360,
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)'
          }}
        >
          <Dialog.Title
            style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}
          >
            Виберіть колір мітки
          </Dialog.Title>
          <div className="color-btns">
            <button
              className="color-btn color-blue"
              onClick={() => onSelect('blue')}
            >
              Синя
            </button>
            <button
              className="color-btn color-green"
              onClick={() => onSelect('green')}
            >
              Зелена
            </button>
            <button
              className="color-btn color-split"
              onClick={() => onSelect('split')}
            >
              Половина
            </button>
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>
              Скасувати
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
