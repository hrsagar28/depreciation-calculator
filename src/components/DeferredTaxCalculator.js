import React, { useState } from 'react';
import { formatCurrency } from '../utils/helpers';

const DeferredTaxCalculator = ({ companiesActDepreciation, incomeTaxDepreciation }) => {
    const [taxRate, setTaxRate] = useState(30); // Default tax rate of 30%

    const difference = (companiesActDepreciation || 0) - (incomeTaxDepreciation || 0);
    const deferredTax = (difference * (parseFloat(taxRate) / 100)) || 0;

    const resultType = deferredTax >= 0 ? 'Liability' : 'Asset';
    const resultColorClass = deferredTax >= 0 ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500';

    return (
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-white/30 dark:border-slate-700/50 rounded-2xl shadow-lg overflow-hidden mb-8 p-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Deferred Tax Calculator</h2>
            <div className="space-y-4">
                {/* Data Display Table */}
                <div className="text-sm">
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

                {/* Tax Rate Input */}
                <div className="flex items-center gap-4 pt-4">
                    <label htmlFor="taxRate" className="font-medium text-slate-700 dark:text-slate-300">Applicable Tax Rate (%):</label>
                    <input
                        type="number"
                        id="taxRate"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        className="w-24 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Final Result */}
                <div className="mt-4 flex justify-between items-center text-lg font-bold bg-slate-200/50 dark:bg-slate-800/50 p-4 rounded-lg">
                    <span className="text-slate-800 dark:text-slate-100">Deferred Tax {resultType}</span>
                    <span className={resultColorClass}>{formatCurrency(Math.abs(deferredTax))}</span>
                </div>
            </div>
        </div>
    );
};

export default DeferredTaxCalculator;