import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const icons = {
  success: <CheckCircle size={16} className="text-green-400 shrink-0" />,
  error: <XCircle size={16} className="text-red-400 shrink-0" />,
  info: <AlertCircle size={16} className="text-blue-400 shrink-0" />,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ message, type = 'info', duration = 3500 }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 bg-[#111] border border-white/10 text-white text-sm px-4 py-3 rounded-lg shadow-xl max-w-xs backdrop-blur-sm animate-fade-in"
          >
            {icons[t.type]}
            <span className="flex-1 text-xs tracking-wide leading-relaxed">{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="text-white/40 hover:text-white transition-colors ml-1">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
