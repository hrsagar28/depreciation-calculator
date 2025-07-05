import React, { useEffect } from 'react';

const Toast = ({ message, show, onClose, onUndo }) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000); // Increased time to allow for Undo
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    return (
        <div className={`fixed bottom-5 right-5 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out z-50 flex items-center justify-between gap-4 ${show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <span>{message}</span>
            {onUndo && (
                <button onClick={onUndo} className="font-bold uppercase text-sm text-indigo-300 hover:text-indigo-200">Undo</button>
            )}
        </div>
    );
};

export default Toast;