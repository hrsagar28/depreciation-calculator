import React, { useState, useEffect } from 'react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, children, confirmText = "Confirm" }) => {
    const [isShowing, setIsShowing] = useState(false);

    useEffect(() => {
        // This effect triggers the animation when the modal is opened
        if (isOpen) {
            const timer = setTimeout(() => setIsShowing(true), 10);
            return () => clearTimeout(timer);
        } else {
            setIsShowing(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsShowing(false);
        // Wait for the exit animation to finish before calling the parent's onClose function
        setTimeout(() => {
            onClose();
        }, 300); // This duration should match the transition duration
    };

    const handleConfirm = () => {
        // No exit animation needed when confirming, it can be instant
        onConfirm();
    };

    if (!isOpen) return null;

    return (
        <div 
            className={`fixed inset-0 z-50 flex justify-center items-center p-4 transition-opacity duration-300 ease-in-out ${isShowing ? 'opacity-100' : 'opacity-0'}`} 
            onClick={handleClose}
            aria-modal="true" 
            role="dialog"
        >
            <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm`}></div>
            <div 
                className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md m-4 p-6 transition-all duration-300 ease-in-out ${isShowing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">{title}</h2>
                <div className="text-slate-600 dark:text-slate-300 mb-6">{children}</div>
                <div className="flex justify-end gap-4">
                    <button onClick={handleClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                    <button onClick={handleConfirm} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors">{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
