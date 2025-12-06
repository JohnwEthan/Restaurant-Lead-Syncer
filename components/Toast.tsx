import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor = type === 'success' ? 'bg-slate-800' : 'bg-red-600';
  const icon = type === 'success' ? <CheckCircle className="text-emerald-400" size={20} /> : <AlertCircle className="text-white" size={20} />;

  return (
    <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl text-white ${bgColor} animate-in slide-in-from-bottom-5 fade-in duration-300 min-w-[300px]`}>
      {icon}
      <p className="flex-1 font-medium">{message}</p>
      <button onClick={onClose} className="opacity-70 hover:opacity-100">
        <X size={18} />
      </button>
    </div>
  );
};

export default Toast;