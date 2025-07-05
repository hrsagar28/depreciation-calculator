import React from 'react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, children, confirmText = "Confirm" }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md m-4 p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">{title}</h2>
                <div className="text-slate-600 dark:text-slate-300 mb-6">{children}</div>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors">{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;