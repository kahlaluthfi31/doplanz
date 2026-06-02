'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { TbExclamationMark } from "react-icons/tb";
const ModalContext = createContext(null);

const toneStyles = {
  info: {
    badge: 'bg-indigo-500 text-white',
    button: 'bg-indigo-600 hover:bg-indigo-700',
    outline: 'border-indigo-100'
  },
  success: {
    badge: 'bg-indigo-500 text-white',
    button: 'bg-indigo-600 hover:bg-indigo-700',
    outline: 'border-indigo-100'
  },
  danger: {
    badge: 'bg-indigo-500 text-white',
    button: 'bg-indigo-600 hover:bg-indigo-700',
    outline: 'border-indigo-100'
  },
  warning: {
    badge: 'bg-indigo-500 text-white',
    button: 'bg-indigo-600 hover:bg-indigo-700',
    outline: 'border-indigo-100'
  }
};

export const ModalProvider = ({ children }) => {
  const [modal, setModal] = useState(null);

  const closeModal = useCallback(() => setModal(null), []);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setModal({ type: 'confirm', resolve, ...options });
    });
  }, []);

  const alert = useCallback((options) => {
    return new Promise((resolve) => {
      setModal({ type: 'alert', resolve, ...options });
    });
  }, []);

  const actions = useMemo(() => ({ confirm, alert }), [confirm, alert]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (modal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modal]);

  useEffect(() => {
    if (!modal) return;
    const handler = (event) => {
      if (event.key === 'Escape') {
        modal.resolve?.(false);
        closeModal();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [modal, closeModal]);

  const handleConfirm = (value) => {
    modal?.resolve?.(value);
    closeModal();
  };

  const style = toneStyles[modal?.tone || 'info'] || toneStyles.info;
  const confirmLabel = modal?.confirmLabel || (modal?.type === 'confirm' ? 'Confirm' : 'OK');
  const cancelLabel = modal?.cancelLabel || 'Cancel';

  return (
    <ModalContext.Provider value={actions}>
      {children}
      {modal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div
            className="modal-shell w-full max-w-md overflow-hidden rounded-3xl border bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className={`modal-header px-6 py-4 border-b ${style.outline} bg-white/90 dark:bg-slate-900 dark:border-slate-700`}>
              <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.badge}`}>
                  <TbExclamationMark className="h-5 w-5 text-current" />
                </span>
                <div>
                  <p className="modal-title text-sm font-bold text-gray-800 dark:text-white">{modal.title}</p>
                  {modal.subtitle && <p className="modal-subtitle text-xs text-gray-400 dark:text-slate-400">{modal.subtitle}</p>}
                </div>
              </div>
            </div>
            <div className="modal-body px-6 py-5 text-sm text-gray-600 whitespace-pre-line dark:text-slate-200">
              {modal.message}
            </div>
            <div className="modal-footer flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
              {modal.type === 'confirm' && (
                <button
                  onClick={() => handleConfirm(false)}
                  className="modal-cancel rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {cancelLabel}
                </button>
              )}
              <button
                onClick={() => handleConfirm(true)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition ${style.button}`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
};
