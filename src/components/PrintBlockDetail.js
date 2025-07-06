import React from 'react';
import { formatCurrency } from '../utils/helpers';

const PrintBlockDetail = ({ block, details }) => (
    <div className="print-asset-detail">
        <h4>{block.name || 'Unnamed Block'}</h4>
        <div className="print-asset-header-grid">
            <div><strong>Block Rate:</strong> {block.rate * 100}%</div>
            <div><strong>Opening WDV:</strong> {formatCurrency(details.openingWDV)}</div>
            <div><strong>Additions:</strong> {formatCurrency(details.additions)}</div>
            <div><strong>Sale Proceeds:</strong> {formatCurrency(details.saleValue)}</div>
        </div>
        
        <div>
            <strong style={{fontSize: '10pt'}}>Calculation Workings:</strong>
            <table className="print-workings-table">
                <tbody>
                    {details.workings.map((item, index) => (
                    <tr key={index}>
                        <td>
                            <div className="calc-desc">{item.description}</div>
                            <div className="calc-string">{item.calculation}</div>
                        </td>
                        <td className="calc-amount">{formatCurrency(item.amount)}</td>
                    </tr>
                    ))}
                     {details.workings.length === 0 && (
                         <tr><td>No depreciation calculated for the year.</td><td></td></tr>
                     )}
                </tbody>
            </table>
        </div>
        <div className="print-final-summary">
            <div className="summary-row">
                <span>Depreciation For The Year</span>
                <span>{formatCurrency(details.depreciationForYear)}</span>
            </div>
             {details.shortTermCapitalGainLoss !== 0 && (
                 <div className={`summary-row ${details.shortTermCapitalGainLoss > 0 ? 'profit' : 'loss'}`}>
                    <span>{details.shortTermCapitalGainLoss > 0 ? 'Short Term Capital Gain' : 'Short Term Capital Loss'}</span>
                    <span>{formatCurrency(Math.abs(details.shortTermCapitalGainLoss))}</span>
                 </div>
             )}
            <div className="summary-row net-block">
                <span>Closing WDV</span>
                <span>{formatCurrency(details.closingWDV)}</span>
            </div>
        </div>
    </div>
);

export default PrintBlockDetail;
