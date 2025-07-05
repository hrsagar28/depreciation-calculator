import React, { useState } from 'react';
import { formatCurrency } from '../utils/helpers';

const DisclosureCard = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800/50 rounded-xl shadow-md border border-slate-200 dark:border-slate-700/50">
        <header className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200">{title}</h3>
        </header>
        <div className="p-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {children}
        </div>
    </div>
);

const DeferredTaxCalculator = ({ companiesActDepreciation, incomeTaxDepreciation, setAct }) => {
    const [taxRate, setTaxRate] = useState(25); // Common corporate tax rate
    const [taxableIncome, setTaxableIncome] = useState('');

    const parsedTaxableIncome = parseFloat(taxableIncome) || 0;
    const difference = (companiesActDepreciation || 0) - (incomeTaxDepreciation || 0);
    const deferredTaxAmount = (difference * (parseFloat(taxRate) / 100)) || 0;

    const isLiability = deferredTaxAmount >= 0;
    const resultType = isLiability ? 'Liability' : 'Asset';
    const resultColorClass = isLiability ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500';

    // Journal Entry Logic
    const journalEntry = {
        title: `Journal Entry to Record Deferred Tax ${resultType}`,
        debit: isLiability ? 'Deferred Tax Expense (P&L)' : 'Deferred Tax Asset (B/S)',
        credit: isLiability ? 'Deferred Tax Liability (B/S)' : 'Deferred Tax Expense (P&L)',
        amount: Math.abs(deferredTaxAmount),
        narration: `Being the deferred tax ${resultType.toLowerCase()} for the year calculated on timing differences in depreciation.`
    };

    // Disclosure Logic
    const taxAsPerBooks = parsedTaxableIncome * (taxRate / 100);
    const taxAsPerIT = (parsedTaxableIncome - difference) * (taxRate / 100);

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
            <header className="mb-8 flex justify-between items-center">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100">Deferred Tax Calculator</h1>
                <button onClick={() => setAct(null)} className="px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-sm hover:bg-slate-700 transition-colors text-sm">
                    &larr; Back to Home
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side: Calculation */}
                <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-white/30 dark:border-slate-700/50 rounded-2xl shadow-lg p-6 space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">1. Calculation</h2>
                        <div className="text-sm space-y-2">
                            <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                                <span className="text-slate-600 dark:text-slate-400">Depreciation as per Companies Act</span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(companiesActDepreciation)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
                                <span className="text-slate-600 dark:text-slate-400">Depreciation as per Income Tax Act</span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(incomeTaxDepreciation)}</span>
                            </div>
                            <div className="flex justify-between py-2 font-bold border-b-2 border-slate-300 dark:border-slate-600">
                                <span className="text-slate-700 dark:text-slate-200">Difference (Timing Difference)</span>
                                <span className="text-slate-800 dark:text-slate-100">{formatCurrency(difference)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4">
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
                            <label htmlFor="taxableIncome" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Estimated Annual Taxable Income (Pre-Tax):</label>
                            <input
                                type="number"
                                id="taxableIncome"
                                value={taxableIncome}
                                placeholder="e.g. 5000000"
                                onChange={(e) => setTaxableIncome(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center text-lg font-bold bg-slate-200/50 dark:bg-slate-800/50 p-4 rounded-lg">
                        <span className="text-slate-800 dark:text-slate-100">Deferred Tax {resultType}</span>
                        <span className={resultColorClass}>{formatCurrency(Math.abs(deferredTaxAmount))}</span>
                    </div>
                </div>

                {/* Right Side: Disclosures */}
                <div className="space-y-6">
                    <DisclosureCard title="2. Journal Entry">
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
                    </DisclosureCard>

                    <DisclosureCard title="3. Financial Statement Disclosures">
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Balance Sheet Extract</h4>
                                <p>The Deferred Tax {resultType} of <strong className={resultColorClass}>{formatCurrency(Math.abs(deferredTaxAmount))}</strong> will be shown under {isLiability ? '"Non-Current Liabilities"' : '"Non-Current Assets"'}.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Profit & Loss Statement Extract</h4>
                                <p>The "Tax Expense" section will include a charge for Deferred Tax of <strong className={resultColorClass}>{formatCurrency(deferredTaxAmount)}</strong>.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Notes to Accounts - Tax Reconciliation</h4>
                                <p>A reconciliation between the tax expense as per the books and as per the Income Tax Act would be shown:</p>
                                <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
                                    <li>Tax on Book Profit @ {taxRate}%: <strong>{formatCurrency(taxAsPerBooks)}</strong></li>
                                    <li>Effect of timing difference in depreciation: <strong>{formatCurrency(taxAsPerBooks - taxAsPerIT)}</strong></li>
                                    <li>Tax as per Income Tax Act: <strong>{formatCurrency(taxAsPerIT)}</strong></li>
                                </ul>
                            </div>
                        </div>
                    </DisclosureCard>
                </div>
            </div>
        </div>
    );
};

export default DeferredTaxCalculator;
