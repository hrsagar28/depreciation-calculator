import React, { useState } from 'react';
import { formatCurrency } from '../utils/helpers';

const InfoCard = ({ title, children, className = '' }) => (
    <div className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border border-white/30 dark:border-slate-700/50 rounded-2xl shadow-lg overflow-hidden ${className}`}>
        <header className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{title}</h3>
        </header>
        <div className="p-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {children}
        </div>
    </div>
);


const DeferredTaxCalculator = ({
    companiesActDepreciation,
    incomeTaxDepreciation,
    openingCompaniesActWdv,
    openingIncomeTaxWdv,
    setAct
}) => {
    const [taxRate, setTaxRate] = useState(25); // Common corporate tax rate
    const [accountingProfit, setAccountingProfit] = useState('');

    // --- CORRECTED DEFERRED TAX LOGIC ---
    const parsedAccountingProfit = parseFloat(accountingProfit) || 0;

    // Difference in WDV creates the DTA/DTL balance
    const openingWdvDifference = (openingCompaniesActWdv || 0) - (openingIncomeTaxWdv || 0);
    const openingDeferredTax = openingWdvDifference * (taxRate / 100);

    // Difference in current year's depreciation creates the movement
    const movementDifference = (companiesActDepreciation || 0) - (incomeTaxDepreciation || 0);
    const movementDeferredTax = movementDifference * (taxRate / 100);

    const closingDeferredTax = openingDeferredTax + movementDeferredTax;

    // A positive difference (Book Dep > Tax Dep) leads to a DTA.
    // A negative difference (Book Dep < Tax Dep) leads to a DTL.
    const isClosingLiability = closingDeferredTax <= 0;
    const resultType = isClosingLiability ? 'Liability' : 'Asset';
    const resultColorClass = isClosingLiability ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500';

    // --- JOURNAL ENTRY LOGIC (based on the movement) ---
    const journalEntry = {
        title: `Journal Entry for Movement in Deferred Tax`,
        debit: movementDeferredTax >= 0 ? 'Deferred Tax Asset (B/S)' : 'Deferred Tax Expense (P&L)',
        credit: movementDeferredTax >= 0 ? 'Deferred Tax Expense (P&L)' : 'Deferred Tax Liability (B/S)',
        amount: Math.abs(movementDeferredTax),
        narration: `Being the movement in deferred tax for the year recognized on timing differences in depreciation.`
    };

    return (
        <div className="w-full max-w-5xl mx-auto">
            <header className="mb-8 flex justify-between items-center">
                {/* The main header is now in App.js */}
            </header>

            <div className="space-y-8">
                {/* Section 1: Inputs and Summary */}
                <InfoCard title="1. Calculation Inputs & Summary">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Input Fields */}
                        <div className="space-y-4">
                             <div>
                                <label htmlFor="taxRate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Applicable Tax Rate (%):</label>
                                <input
                                    type="number"
                                    id="taxRate"
                                    value={taxRate}
                                    onChange={(e) => setTaxRate(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="accountingProfit" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Accounting Profit before Tax (PBT):</label>
                                <input
                                    type="number"
                                    id="accountingProfit"
                                    value={accountingProfit}
                                    placeholder="Enter profit for P&L disclosure"
                                    onChange={(e) => setAccountingProfit(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Summary Table */}
                        <div className="space-y-2">
                            <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                                <span className="text-slate-600 dark:text-slate-400">Opening Deferred Tax {openingDeferredTax >= 0 ? 'Asset' : 'Liability'}</span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(Math.abs(openingDeferredTax))}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                                <span className="text-slate-600 dark:text-slate-400">Movement during the year</span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(movementDeferredTax)}</span>
                            </div>
                            <div className="flex justify-between items-center text-lg font-bold pt-2">
                                <span className="text-slate-800 dark:text-slate-100">Closing Deferred Tax {resultType}</span>
                                <span className={resultColorClass}>{formatCurrency(Math.abs(closingDeferredTax))}</span>
                            </div>
                        </div>
                    </div>
                </InfoCard>

                {/* Section 2: Journal Entry */}
                <InfoCard title="2. Journal Entry (for Movement during the year)">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-300 dark:border-slate-600">
                                <th className="pb-2">Particulars</th>
                                <th className="pb-2 text-right">Debit (₹)</th>
                                <th className="pb-2 text-right">Credit (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <td className="py-2">{journalEntry.debit}</td>
                                <td className="py-2 text-right font-mono">{formatCurrency(journalEntry.amount)}</td>
                                <td className="py-2 text-right"></td>
                            </tr>
                            <tr>
                                <td className="py-2 pl-4">To {journalEntry.credit}</td>
                                <td className="py-2 text-right"></td>
                                <td className="py-2 text-right font-mono">{formatCurrency(journalEntry.amount)}</td>
                            </tr>
                        </tbody>
                    </table>
                    <p className="mt-4 text-xs italic text-slate-500 dark:text-slate-400">({journalEntry.narration})</p>
                </InfoCard>

                {/* Section 3: Financial Statement Disclosures */}
                <InfoCard title="3. Notes to Accounts & Disclosures">
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">A. Deferred Tax {resultType} (Balance Sheet Note)</h4>
                            <p>The closing balance is presented under <strong>{isClosingLiability ? 'Non-Current Liabilities' : 'Non-Current Assets'}</strong>. The movement is reconciled as follows:</p>
                            <table className="w-full max-w-md mt-2 text-left text-sm">
                                <tbody>
                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <td className="py-1">Opening Balance</td>
                                        <td className="py-1 text-right">{formatCurrency(openingDeferredTax)}</td>
                                    </tr>
                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <td className="py-1">Charge/(Credit) to P&L for the year</td>
                                        <td className="py-1 text-right">{formatCurrency(movementDeferredTax)}</td>
                                    </tr>
                                    <tr className="font-bold border-t-2 border-slate-300 dark:border-slate-600">
                                        <td className="py-1">Closing Balance</td>
                                        <td className="py-1 text-right">{formatCurrency(closingDeferredTax)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">B. Tax Expense (Profit & Loss Note)</h4>
                            <p>The total tax expense is reconciled as follows:</p>
                             <table className="w-full max-w-md mt-2 text-left text-sm">
                                <tbody>
                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <td className="py-1">Accounting Profit before Tax</td>
                                        <td className="py-1 text-right">{formatCurrency(parsedAccountingProfit)}</td>
                                    </tr>
                                    <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <td className="py-1">Tax at applicable rate ({taxRate}%)</td>
                                        <td className="py-1 text-right">{formatCurrency(parsedAccountingProfit * (taxRate / 100))}</td>
                                    </tr>
                                     <tr className="border-b border-slate-200 dark:border-slate-700">
                                        <td className="py-1">Tax effect of timing differences</td>
                                        <td className="py-1 text-right">{formatCurrency(movementDeferredTax)}</td>
                                    </tr>
                                    <tr className="font-bold border-t-2 border-slate-300 dark:border-slate-600">
                                        <td className="py-1">Total Tax Expense for the year</td>
                                        <td className="py-1 text-right">{formatCurrency((parsedAccountingProfit * (taxRate / 100)) + movementDeferredTax)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </InfoCard>
            </div>
        </div>
    );
};

export default DeferredTaxCalculator;
