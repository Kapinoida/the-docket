'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
    dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [mounted, setMounted] = useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const dismissToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = ++toastIdCounter;
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            dismissToast(id);
        }, 4000);
    }, [dismissToast]);

    const iconFor = (type: ToastType) => {
        switch (type) {
            case 'success': return '✓';
            case 'error': return '✕';
            case 'info': return 'i';
        }
    };

    const colorFor = (type: ToastType) => {
        switch (type) {
            case 'success': return 'border-green-500/50 bg-green-500/10 text-green-400';
            case 'error': return 'border-red-500/50 bg-red-500/10 text-red-400';
            case 'info': return 'border-blue-500/50 bg-blue-500/10 text-blue-400';
        }
    };

    const toastContainer = mounted ? createPortal(
        <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2 max-w-sm">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm text-sm animate-in slide-in-from-bottom-2 duration-200 ${colorFor(toast.type)}`}
                >
                    <span className="flex items-center justify-center w-5 h-5 rounded-full border border-current text-xs font-bold flex-shrink-0">
                        {iconFor(toast.type)}
                    </span>
                    <span className="flex-1 text-text-primary">{toast.message}</span>
                    <button
                        onClick={() => dismissToast(toast.id)}
                        className="text-text-muted hover:text-text-primary flex-shrink-0"
                    >
                        <span className="text-lg leading-none">×</span>
                    </button>
                </div>
            ))}
        </div>,
        document.body
    ) : null;

    return (
        <ToastContext.Provider value={{ showToast, dismissToast }}>
            {children}
            {toastContainer}
        </ToastContext.Provider>
    );
}