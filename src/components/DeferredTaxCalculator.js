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

const DeferredTaxCalculator = ({
    companiesActDepreciation,
    incomeTaxDepreciation,
    openingCompaniesActWdv,
    openingIncomeTaxWdv,
    setAct
}) => {
    const [taxRate, setTaxRate] = useState(25); // Common corporate tax rate
    const [taxableIncome, setTaxableIncome] = useState('');

    // --- CALCULATIONS ---
    const parsedTaxableIncome = parseFloat(taxableIncome) || 0;
    const openingDifference = (openingCompaniesActWdv || 0) - (openingIncomeTaxWdv || 0);
    const movementDifference = (companiesActDepreciation || 0) - (incomeTaxDepreciation || 0);

    const openingDeferredTax = openingDifference * (taxRate / 100);
    const movementDeferredTax = movementDifference * (taxRate / 100);
    const closingDeferredTax = openingDeferredTax + movementDeferredTax;

    const isClosingLiability = closingDeferredTax >= 0;
    const resultType = isClosingLiability ? 'Liability' : 'Asset';
    const resultColorClass = isClosingLiability ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500';

    // --- JOURNAL ENTRY LOGIC ---
    const journalEntry = {
        title: `Journal Entry for Movement in Deferred Tax`,
        debit: movementDeferredTax >= 0 ? 'Deferred Tax Expense (P&L)' : 'Deferred Tax Asset (B/S)',
        credit: movementDeferredTax >= 0 ? 'Deferred Tax Liability (B/S)' : 'Deferred Tax Expense (P&L)',
        amount: Math.abs(movementDeferredTax),
        narration: `Being the movement in deferred tax for the year recognized on timing differences in depreciation.`
    };

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side: Calculation */}
                <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-white/30 dark:border-slate-700/50 rounded-2xl shadow-lg p-6 space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">1. Calculation Inputs</h2>
                        <div className="space-y-4 pt-2">
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
                                <label htmlFor="taxableIncome" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Estimated Annual Taxable Income (for disclosure context):</label>
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
                    </div>
                </div>

                {/* Right Side: Results & Disclosures */}
                <div className="space-y-6">
                    <DisclosureCard title="2. Deferred Tax Movement Summary">
                        <table className="w-full text-left text-sm">
                             <tbody>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <td className="py-2 text-slate-600 dark:text-slate-400">Opening Deferred Tax {openingDeferredTax >= 0 ? 'Liability' : 'Asset'}</td>
                                    <td className="py-2 text-right font-medium text-slate-800 dark:text-slate-200">{formatCurrency(Math.abs(openingDeferredTax))}</td>
                                </tr>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <td className="py-2 text-slate-600 dark:text-slate-400">Movement during the year (Charge to P&L)</td>
                                    <td className="py-2 text-right font-medium text-slate-800 dark:text-slate-200">{formatCurrency(movementDeferredTax)}</td>
                                </tr>
                                <tr className="font-bold border-t-2 border-slate-300 dark:border-slate-600">
                                    <td className="py-2 text-slate-700 dark:text-slate-200">Closing Deferred Tax {resultType}</td>
                                    <td className={`py-2 text-right ${resultColorClass}`}>{formatCurrency(Math.abs(closingDeferredTax))}</td>
                                </tr>
                            </tbody>
                        </table>
                    </DisclosureCard>
                    
                    <DisclosureCard title="3. Journal Entry (for Movement)">
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

                    <DisclosureCard title="4. Financial Statement Disclosures">
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Balance Sheet Extract</h4>
                                <p>The **Closing Deferred Tax {resultType}** of <strong className={resultColorClass}>{formatCurrency(Math.abs(closingDeferredTax))}</strong> will be presented under {isClosingLiability ? '"Non-Current Liabilities"' : '"Non-Current Assets"'}.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Profit & Loss Statement Extract</h4>
                                <p>The "Tax Expense" for the year will include a charge for **Deferred Tax of {formatCurrency(movementDeferredTax)}**.</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Notes to Accounts - Movement of DTA/DTL</h4>
                                <p>The note for Deferred Tax will show a reconciliation of the opening and closing balances, reflecting the movement charged to the P&L during the year.</p>
                            </div>
                        </div>
                    </DisclosureCard>
                </div>
            </div>
        </div>
    );
};

export default DeferredTaxCalculator;
