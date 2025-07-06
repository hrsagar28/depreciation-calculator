import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip as ChartTooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '../utils/helpers';
import { FY_LABEL } from '../config';

const SummaryReport = ({ summaryData, onFilterChange, showToast, filterType, theme, act, setAct }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isShowing, setIsShowing] = useState(false);

    useEffect(() => {
        // This effect triggers the animation when the component mounts
        const timer = setTimeout(() => setIsShowing(true), 100); // A small delay ensures a smooth start
        return () => clearTimeout(timer);
    }, []);


    const chartData = useMemo(() => {
        const colors = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#f43f5e', '#64748b', '#d946ef', '#22c55e', '#f97316', '#84cc16'];
        return Object.values(summaryData.byType).map((typeData, index) => ({
            name: typeData.name,
            internalName: typeData.internalName,
            value: typeData.depreciationForYear,
            fill: colors[index % colors.length]
        })).filter(item => item.value > 0);
    }, [summaryData.byType]);

    const handleExport = () => {
       if (!window.Papa) {
           showToast("Export feature unavailable. Please check your internet connection and refresh.");
           return;
       }

       let header, rows, totalsRow;

       if (act === 'companies') {
           header = ["Asset Type", "Op. Gross Block", "Additions", "Disposals", "Cl. Gross Block", "Op. Accum. Dep.", "Dep. for Year", "Cl. Accum. Dep.", "Op. Net Block", "Cl. Net Block"];
           rows = Object.values(summaryData.byType).map(item => ([
                item.name, item.openingGrossBlock, item.additions, item.disposalsCost, item.closingGrossBlock,
                item.openingAccumulatedDepreciation, item.depreciationForYear, item.closingAccumulatedDepreciation,
                item.openingNetBlock, item.closingNetBlock
           ]));
           totalsRow = ["TOTAL", summaryData.totals.openingGrossBlock, summaryData.totals.additions, summaryData.totals.disposalsCost, summaryData.totals.closingGrossBlock, summaryData.totals.openingAccumulatedDepreciation, summaryData.totals.depreciationForYear, summaryData.totals.closingAccumulatedDepreciation, summaryData.totals.openingNetBlock, summaryData.totals.closingNetBlock];
       } else { // Income Tax
           header = ["Asset Block", "Opening WDV", "Additions", "Sale Proceeds", "WDV for Dep.", "Dep. for Year", "Closing WDV", "STCG/L"];
           rows = Object.values(summaryData.byType).map(item => ([
                item.name, item.openingWDV, item.additions, item.saleValue, item.wdvForDep, item.depreciationForYear, item.closingNetBlock, item.shortTermCapitalGainLoss
           ]));
           totalsRow = ["TOTAL", summaryData.totals.openingWDV, summaryData.totals.additions, summaryData.totals.saleValue, summaryData.totals.wdvForDep, summaryData.totals.depreciationForYear, summaryData.totals.closingNetBlock, summaryData.totals.shortTermCapitalGainLoss];
       }


       const csv = window.Papa.unparse({ fields: header, data: [...rows, totalsRow] });

       const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
       const link = document.createElement("a");
       const url = URL.createObjectURL(blob);
       link.setAttribute("href", url);
       link.setAttribute("download", `Depreciation_Summary_${act}_FY${FY_LABEL}.csv`);
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
       showToast("CSV export started successfully!");
    };

    const handlePieClick = (data) => {
        if (data && data.internalName) {
            onFilterChange(data.internalName);
        }
    };

    const hasChartData = chartData.length > 0;
    const legendColor = theme === 'dark' ? '#f1f5f9' : '#334155';
    const tooltipStyle = {
        contentStyle: {
            backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
            borderColor: theme === 'dark' ? '#334155' : '#cccccc',
            borderRadius: '0.75rem'
        },
        itemStyle: { color: legendColor },
        labelStyle: { color: legendColor }
    };

    return (
      <div className={`bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-white/30 dark:border-slate-700/50 rounded-2xl shadow-lg overflow-hidden mb-8 transition-all duration-700 ease-in-out transform ${isShowing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="p-4 md:p-6 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 flex justify-between items-center" onClick={() => setIsExpanded(!isExpanded)}>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Summary & Reporting</h2>
              <div className="flex items-center gap-4">
                  <button onClick={(e) => {e.stopPropagation(); window.print()}} className="px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-sm hover:bg-slate-700 transition-colors text-sm">Print</button>
                  <button onClick={(e) => {e.stopPropagation(); handleExport()}} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm">Export CSV</button>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 text-slate-400 dark:text-slate-500 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
          </div>
          {isExpanded && (
              <div id="summary-section-printable-content" className="p-4 md:p-6 border-t border-slate-200 dark:border-slate-700/50">
                  <div className={`grid grid-cols-1 ${hasChartData ? 'xl:grid-cols-3' : ''} gap-8`}>
                      <div className="xl:col-span-2">
                          <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200 mb-4">
                            {act === 'companies' ? 'Asset Type Summary Schedule' : 'Asset Block Summary (Income Tax)'}
                          </h3>
                          <div className="overflow-x-auto">
                            {act === 'companies' ? (
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-200/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 uppercase">
                                        <tr>
                                            <th className="p-2 rounded-tl-lg">Asset Type</th>
                                            <th className="p-2 text-right">Op. Gross Block</th>
                                            <th className="p-2 text-right">Additions</th>
                                            <th className="p-2 text-right">Disposals</th>
                                            <th className="p-2 text-right">Cl. Gross Block</th>
                                            <th className="p-2 text-right">Op. Accum. Dep.</th>
                                            <th className="p-2 text-right">Dep. for Year</th>
                                            <th className="p-2 text-right">Cl. Accum. Dep.</th>
                                            <th className="p-2 text-right">Op. Net Block</th>
                                            <th className="p-2 text-right rounded-tr-lg">Cl. Net Block</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.values(summaryData.byType).map(typeData => (
                                            <tr key={typeData.name} className={`border-b border-slate-200 dark:border-slate-700 transition-colors ${filterType && filterType === typeData.internalName ? 'bg-indigo-100/50 dark:bg-indigo-900/30' : ''}`}>
                                                <td className="p-2 font-medium text-slate-800 dark:text-slate-100">{typeData.name}</td>
                                                <td className="p-2 text-right text-slate-600 dark:text-slate-400">{formatCurrency(typeData.openingGrossBlock)}</td>
                                                <td className="p-2 text-right text-slate-600 dark:text-slate-400">{formatCurrency(typeData.additions)}</td>
                                                <td className="p-2 text-right text-slate-600 dark:text-slate-400">{formatCurrency(typeData.disposalsCost)}</td>
                                                <td className="p-2 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(typeData.closingGrossBlock)}</td>
                                                <td className="p-2 text-right text-slate-600 dark:text-slate-400">{formatCurrency(typeData.openingAccumulatedDepreciation)}</td>
                                                <td className="p-2 text-right text-blue-600 dark:text-blue-400 font-semibold">{formatCurrency(typeData.depreciationForYear)}</td>
                                                <td className="p-2 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(typeData.closingAccumulatedDepreciation)}</td>
                                                <td className="p-2 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(typeData.openingNetBlock)}</td>
                                                <td className="p-2 text-right font-semibold text-green-700 dark:text-green-500">{formatCurrency(typeData.closingNetBlock)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="font-bold bg-slate-200/50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100">
                                        <tr className="border-t-2 border-slate-400 dark:border-slate-500">
                                            <td className="p-2 rounded-bl-lg">TOTAL</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.openingGrossBlock)}</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.additions)}</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.disposalsCost)}</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.closingGrossBlock)}</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.openingAccumulatedDepreciation)}</td>
                                            <td className="p-2 text-right text-blue-700 dark:text-blue-400">{formatCurrency(summaryData.totals.depreciationForYear)}</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.closingAccumulatedDepreciation)}</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.openingNetBlock)}</td>
                                            <td className="p-2 text-right text-green-800 dark:text-green-400 rounded-br-lg">{formatCurrency(summaryData.totals.closingNetBlock)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            ) : (
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-200/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 uppercase">
                                        <tr>
                                            <th className="p-2 rounded-tl-lg">Asset Block</th>
                                            <th className="p-2 text-right">Opening WDV</th>
                                            <th className="p-2 text-right">Additions</th>
                                            <th className="p-2 text-right">Sale Proceeds</th>
                                            <th className="p-2 text-right">WDV for Dep.</th>
                                            <th className="p-2 text-right">Dep. for Year</th>
                                            <th className="p-2 text-right">Closing WDV</th>
                                            <th className="p-2 text-right rounded-tr-lg">STCG/(STCL)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.values(summaryData.byType).map(typeData => (
                                            <tr key={typeData.name} className={`border-b border-slate-200 dark:border-slate-700 transition-colors ${filterType && filterType === typeData.internalName ? 'bg-indigo-100/50 dark:bg-indigo-900/30' : ''}`}>
                                                <td className="p-2 font-medium text-slate-800 dark:text-slate-100">{typeData.name}</td>
                                                <td className="p-2 text-right text-slate-600 dark:text-slate-400">{formatCurrency(typeData.openingWDV)}</td>
                                                <td className="p-2 text-right text-slate-600 dark:text-slate-400">{formatCurrency(typeData.additions)}</td>
                                                <td className="p-2 text-right text-slate-600 dark:text-slate-400">{formatCurrency(typeData.saleValue)}</td>
                                                <td className="p-2 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(typeData.wdvForDep)}</td>
                                                <td className="p-2 text-right text-blue-600 dark:text-blue-400 font-semibold">{formatCurrency(typeData.depreciationForYear)}</td>
                                                <td className="p-2 text-right font-semibold text-green-700 dark:text-green-500">{formatCurrency(typeData.closingNetBlock)}</td>
                                                <td className={`p-2 text-right font-semibold ${typeData.shortTermCapitalGainLoss > 0 ? 'text-green-700 dark:text-green-500' : 'text-red-700 dark:text-red-500'}`}>{formatCurrency(typeData.shortTermCapitalGainLoss)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="font-bold bg-slate-200/50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100">
                                        <tr className="border-t-2 border-slate-400 dark:border-slate-500">
                                            <td className="p-2 rounded-bl-lg">TOTAL</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.openingWDV)}</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.additions)}</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.saleValue)}</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.wdvForDep)}</td>
                                            <td className="p-2 text-right text-blue-700 dark:text-blue-400">{formatCurrency(summaryData.totals.depreciationForYear)}</td>
                                            <td className="p-2 text-right text-green-800 dark:text-green-400">{formatCurrency(summaryData.totals.closingNetBlock)}</td>
                                            <td className={`p-2 text-right font-bold ${summaryData.totals.shortTermCapitalGainLoss > 0 ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}`}>{formatCurrency(summaryData.totals.shortTermCapitalGainLoss)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                          </div>
                           <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-900/30 border-l-4 border-blue-500 rounded-r-lg">
                               <p className="text-xs text-blue-800 dark:text-blue-200">
                                   <strong>Note:</strong> {act === 'companies'
                                       ? "The calculations above are based on a single-asset accounting model as per Ind AS 16."
                                       : "The calculations are based on Income Tax rules, following the block of assets concept. Depreciation for additions is calculated at a half rate if used for less than 180 days."
                                   }
                               </p>
                           </div>
                      </div>
                       {hasChartData && (
                           <div className="min-h-[300px] chart-container flex flex-col items-center">
                              <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200 mb-4 text-center">Depreciation by Asset Type</h3>
                               <ResponsiveContainer width="100%" height={300}>
                                  <PieChart>
                                    <Pie
                                      data={chartData}
                                      dataKey="value"
                                      nameKey="name"
                                      cx="50%"
                                      cy="50%"
                                      outerRadius={90}
                                      labelLine={false}
                                      onClick={handlePieClick}
                                      label={({ name, percent, x, y, fill }) => percent > 0.05 ? <text x={x} y={y} fill={"#fff"} textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">{`${(percent * 100).toFixed(0)}%`}</text> : null }
                                    >
                                       {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} stroke={filterType === entry.internalName ? '#fff' : entry.fill} strokeWidth={filterType === entry.internalName ? 3 : 1} className="cursor-pointer" />)}
                                    </Pie>
                                    <ChartTooltip {...tooltipStyle} />
                                    <Legend wrapperStyle={{fontSize: "12px", paddingTop: "20px", color: legendColor}}/>
                                  </PieChart>
                               </ResponsiveContainer>
                           </div>
                       )}
                  </div>
              </div>
          )}
      </div>
    );

};

export default SummaryReport;
