import React, { useState, useEffect } from "react";

// Global toast listeners
let toastListeners = [];
let toastIdCounter = 1;

export const toast = {
  success: (msg, duration = 4000) => addToast(msg, "success", duration),
  error: (msg, duration = 5000) => addToast(msg, "danger", duration),
  warning: (msg, duration = 4500) => addToast(msg, "warning", duration),
  info: (msg, duration = 4000) => addToast(msg, "info", duration),
};

// Compatible alias for antd 'message'
export const message = toast;

function addToast(text, variant = "success", duration = 4000) {
  const id = toastIdCounter++;
  const newToast = { id, text, variant };
  toastListeners.forEach(listener => listener(newToast));

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }
}

let removeToastHandler = null;
function removeToast(id) {
  if (removeToastHandler) {
    removeToastHandler(id);
  }
}

/**
 * Global Bootstrap Floating Toast Container Component
 */
export function GlobalToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleNewToast = (toastItem) => {
      setToasts(prev => [...prev, toastItem]);
    };
    removeToastHandler = (id) => {
      setToasts(prev => prev.filter(t => t.id !== id));
    };

    toastListeners.push(handleNewToast);
    return () => {
      toastListeners = toastListeners.filter(l => l !== handleNewToast);
      removeToastHandler = null;
    };
  }, []);

  if (toasts.length === 0) return null;

  const getIcon = (variant) => {
    switch (variant) {
      case "success": return "bi-check-circle-fill";
      case "danger": return "bi-exclamation-triangle-fill";
      case "warning": return "bi-exclamation-circle-fill";
      default: return "bi-info-circle-fill";
    }
  };

  return (
    <div 
      className="toast-container position-fixed top-0 end-0 p-3" 
      style={{ zIndex: 9999, maxWidth: 380 }}
    >
      {toasts.map(t => (
        <div 
          key={t.id} 
          className={`toast show align-items-center text-white bg-${t.variant} border-0 shadow-lg mb-2`}
          role="alert" 
          aria-live="assertive" 
          aria-atomic="true"
          style={{ borderRadius: 10 }}
        >
          <div className="d-flex">
            <div className="toast-body d-flex align-items-center gap-2 py-2 px-3 fs-7">
              <i className={`bi ${getIcon(t.variant)} fs-6`}></i>
              <div style={{ wordBreak: "break-word" }}>{t.text}</div>
            </div>
            <button 
              type="button" 
              className="btn-close btn-close-white me-2 m-auto" 
              aria-label="Close"
              onClick={() => removeToast(t.id)}
            ></button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default toast;
