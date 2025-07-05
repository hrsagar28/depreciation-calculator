import React from 'react';
import { formatCurrency } from '../utils/helpers';

const PrintSummaryTable = ({ summaryData, act }) => (
    <>
        <h2 className="print-section-title first">Asset Type Summary Schedule</h2>
        <table className="print-summary-table">
            {act === 'companies' ? (
                <>
                    <thead>
                        <tr>
                            <th>Asset Type</th>
                            <th align="right">Op. Gross Block</th>
                            <th align="right">Additions</th>
                            <th align="right">Disposals</th>
                            <th align="right">Cl. Gross Block</th>
                            <th align="right">Op. Accum. Dep.</th>
                            <th align="right">Dep. for Year</th>
                            <th align="right">Cl. Accum. Dep.</th>
                            <th align="right">Op. Net Block</th>
                            <th align="right">Cl. Net Block</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.values(summaryData.byType).map(typeData => (
                            <tr key={typeData.internalName}>
                                <td>{typeData.name}</td>
                                <td align="right">{formatCurrency(typeData.openingGrossBlock)}</td>
                                <td align="right">{formatCurrency(typeData.additions)}</td>
                                <td align="right">{formatCurrency(typeData.disposalsCost)}</td>
                                <td align="right">{formatCurrency(typeData.closingGrossBlock)}</td>
                                <td align="right">{formatCurrency(typeData.openingAccumulatedDepreciation)}</td>
                                <td align="right">{formatCurrency(typeData.depreciationForYear)}</td>
                                <td align="right">{formatCurrency(typeData.closingAccumulatedDepreciation)}</td>
                                <td align="right">{formatCurrency(typeData.openingNetBlock)}</td>
                                <td align="right">{formatCurrency(typeData.closingNetBlock)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td>TOTAL</td>
                            <td align="right">{formatCurrency(summaryData.totals.openingGrossBlock)}</td>
                            <td align="right">{formatCurrency(summaryData.totals.additions)}</td>
                            <td align="right">{formatCurrency(summaryData.totals.disposalsCost)}</td>
                            <td align="right">{formatCurrency(summaryData.totals.closingGrossBlock)}</td>
                            <td align="right">{formatCurrency(summaryData.totals.openingAccumulatedDepreciation)}</td>
                            <td align="right">{formatCurrency(summaryData.totals.depreciationForYear)}</td>
                            <td align="right">{formatCurrency(summaryData.totals.closingAccumulatedDepreciation)}</td>
                            <td align="right">{formatCurrency(summaryData.totals.openingNetBlock)}</td>
                            <td align="right">{formatCurrency(summaryData.totals.closingNetBlock)}</td>
                        </tr>
                    </tfoot>
                </>
            ) : (
                 <>
                    <thead>
                        <tr>
                            <th>Asset Block</th>
                            <th align="right">Opening WDV</th>
                            <th align="right">Additions</th>
                            <th align="right">Sale Proceeds</th>
                            <th align="right">WDV for Dep.</th>
                            <th align="right">Dep. for Year</th>
                            <th align="right">Closing WDV</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.values(summaryData.byType).map(typeData => (
                            <tr key={typeData.internalName}>
                                <td>{typeData.name}</td>
                                <td align="right">{formatCurrency(typeData.openingWDV)}</td>
                                <td align="right">{formatCurrency(typeData.additions)}</td>
                                <td align="right">{formatCurrency(typeData.saleValue)}</td>
                                <td align="right">{formatCurrency(typeData.wdvForDep)}</td>
                                <td align="right">{formatCurrency(typeData.depreciationForYear)}</td>
                                <td align="right">{formatCurrency(typeData.closingNetBlock)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td>TOTAL</td>
                            <td align="right">{formatCurrency(summaryData.totals.openingWDV)}</td>
                            <td align="right">{formatCurrency(summaryData.totals.additions)}</td>
                            <td align="right">{formatCurrency(summaryData.totals.saleValue)}</td>
                            <td align="right">{formatCurrency(summaryData.totals.wdvForDep)}</td>
                            <td align="right">{formatCurrency(summaryData.totals.depreciationForYear)}</td>
                            <td align="right">{formatCurrency(summaryData.totals.closingNetBlock)}</td>
                        </tr>
                    </tfoot>
                </>
            )}
        </table>
    </>
);

export default PrintSummaryTable;