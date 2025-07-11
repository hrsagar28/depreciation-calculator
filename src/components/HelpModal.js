import React, { useState, useEffect } from 'react';

const HelpModal = ({ isOpen, onClose, topic }) => {
    const [isShowing, setIsShowing] = useState(false);

    const helpContent = {
        introduction: {
            title: "Welcome to the Depreciation Calculator!",
            content: (
                <>
                    <p className="mb-4">This application helps you calculate asset depreciation according to two different standards: the <strong>Companies Act, 2013</strong> and the <strong>Income Tax Act, 1961</strong>.</p>
                    <p className="mb-2"><strong>Getting Started:</strong></p>
                    <ol className="list-decimal list-inside space-y-2 mb-4 pl-4">
                        <li>Choose the calculation standard (Companies Act or Income Tax Act) or the Deferred Tax tool on the main screen.</li>
                        <li>Add your assets or asset blocks using the "+" button.</li>
                        <li>Fill in the required details for each asset/block.</li>
                        <li>The app will automatically calculate the depreciation and update the summaries.</li>
                    </ol>
                    <p>Click the <strong>?</strong> icon next to section titles for more specific help.</p>
                </>
            )
        },
        companiesAct: {
            title: "Help: Companies Act, 2013",
            content: (
                <>
                    <p className="mb-4">This section calculates depreciation for financial reporting purposes, as required by the Companies Act.</p>
                    <ul className="list-disc list-inside space-y-2 mb-4 pl-4">
                        <li><strong>Individual Assets:</strong> Depreciation is calculated for each asset individually.</li>
                        <li><strong>Methods:</strong> You can choose between the Straight-Line Method (SLM) and the Written Down Value (WDV) method.</li>
                        <li><strong>Useful Life:</strong> The calculation is based on the useful life of an asset as prescribed in Schedule II of the Companies Act.</li>
                    </ul>
                </>
            )
        },
        incomeTaxAct: {
            title: "Help: Income Tax Act, 1961",
            content: (
                 <>
                    <p className="mb-4">This section calculates depreciation for income tax purposes, which determines your tax liability.</p>
                    <ul className="list-disc list-inside space-y-2 mb-4 pl-4">
                        <li><strong>Block of Assets:</strong> Depreciation is calculated on a "block" of similar assets, not individual ones.</li>
                        <li><strong>Method:</strong> The Income Tax Act mandates the Written Down Value (WDV) method for tax purposes.</li>
                        <li><strong>180-Day Rule:</strong> If an asset is purchased and put to use for less than 180 days, only half of the normal depreciation is allowed for that year.</li>
                     </ul>
                </>
            )
        },
        deferredTax: {
            title: "Help: Deferred Tax (AS 22 / Ind AS 12)",
            content: (
                 <>
                    <p className="mb-4">Deferred tax arises due to <strong>timing differences</strong> between the profit calculated for accounting purposes (Book Profit) and the profit calculated for tax purposes (Taxable Profit).</p>
                    <ul className="list-disc list-inside space-y-2 mb-4 pl-4">
                        <li><strong>Deferred Tax Asset (DTA):</strong> Represents a future tax benefit. It is created when the Written Down Value (WDV) for tax purposes is <strong>higher</strong> than the WDV for book purposes.</li>
                        <li><strong>Deferred Tax Liability (DTL):</strong> Represents a future tax obligation. It is created when the WDV for book purposes is <strong>higher</strong> than the WDV for tax purposes.</li>
                        <li><strong>Movement:</strong> The change in the DTA/DTL balance during the year is charged or credited to the Profit & Loss statement as "Deferred Tax Expense/Income".</li>
                     </ul>
                </>
            )
        },
        generalTerms: {
            title: "Glossary of Terms",
            content: (
                 <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100">Depreciation</h4>
                        <p>The reduction in the value of an asset over time, due to use, wear and tear, or obsolescence.</p>
                     </div>
                    <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100">Written Down Value (WDV)</h4>
                        <p>The value of an asset after deducting the depreciation charged in previous years. It's also known as Book Value or Net Block.</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100">Straight-Line Method (SLM)</h4>
                        <p>A method where the depreciation amount is the same for every year of the asset's useful life.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100">Gross Block</h4>
                         <p>The original purchase cost of an asset.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100">Accumulated Depreciation</h4>
                         <p>The total depreciation charged on an asset from the date of purchase until the beginning of the current financial year.</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100">Residual Value</h4>
                        <p>The estimated scrap value of an asset at the end of its useful life.</p>
                    </div>
                </div>
            )
        }
    };
    
    const activeContent = helpContent[topic] || helpContent.introduction;

    useEffect(() => {
        // This effect triggers the animation when the modal is opened
        if (isOpen) {
            // A tiny delay ensures the component is in the DOM before the animation classes are applied
            const timer = setTimeout(() => setIsShowing(true), 10);
            return () => clearTimeout(timer);
        } else {
            setIsShowing(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (event) => {
            if (event.keyCode === 27) handleClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const handleClose = () => {
        setIsShowing(false);
        // Wait for the exit animation to finish before calling the parent's onClose function
        setTimeout(() => {
            onClose();
        }, 300); // This duration should match the transition duration
    };

    if (!isOpen) return null;

    return (
        <div 
            className={`fixed inset-0 z-50 flex justify-center items-center p-4 transition-opacity duration-300 ease-in-out ${isShowing ? 'opacity-100' : 'opacity-0'}`} 
            onClick={handleClose}
        >
            <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm`}></div>
            <div 
                className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl m-4 transition-all duration-300 ease-in-out ${isShowing ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} 
                onClick={e => e.stopPropagation()}
            >
                <header className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{activeContent.title}</h2>
                     <button onClick={handleClose} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label="Close help">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                 </header>
                <div className="p-6 text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-h-[60vh] overflow-y-auto">
                    {activeContent.content}
                </div>
                 <footer className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl text-center">
                     <button onClick={handleClose} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors">Got it!</button>
                 </footer>
            </div>
        </div>
    );
};

export default HelpModal;
