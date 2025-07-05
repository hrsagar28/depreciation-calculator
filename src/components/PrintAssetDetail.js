import React from 'react';
import { formatCurrency } from '../utils/helpers';

const PrintAssetDetail = ({ asset, details, method, act }) => (
    <div className="print-asset-detail">
        <h4>{asset.name || 'Unnamed Asset'}</h4>
        <div className="print-asset-header-grid">
            <div><strong>Asset Type:</strong> {asset.assetType ? asset.assetType.replace(/_/g, ' ') : 'N/A'}</div>
            <div><strong>Method:</strong> {act === 'companies' ? method : 'WDV'}</div>
            <div><strong>Orig. Purchase Date:</strong> {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('en-GB') : 'N/A'}</div>
            {asset.disposalDate && <div><strong>Disposal Date:</strong> {new Date(asset.disposalDate).toLocaleDateString('en-GB')}</div>}
            {act === 'companies' ? (
                <>
                    <div><strong>Opening Gross Block:</strong> {formatCurrency(details.openingGrossBlock)}</div>
                    <div><strong>Opening Accum. Dep:</strong> {formatCurrency(details.openingAccumulatedDepreciation)}</div>
                </>
            ) : (
                 <div><strong>Opening WDV:</strong> {formatCurrency(details.openingWDV)}</div>
            )}
            {asset.disposalDate && <div><strong>Sale Value:</strong> {formatCurrency(asset.saleValue)}</div>}
        </div>
        {asset.additions.length > 0 && (
            <div style={{marginBottom: '1rem'}}>
                <strong style={{fontSize: '9pt'}}>Additions:</strong>
                <ul style={{listStyle: 'disc', paddingLeft: '20px', fontSize: '9pt', margin: '0.25rem 0'}}>
                    {asset.additions.map((add, i) => (
                         <li key={i}>Purchased on {new Date(add.date).toLocaleDateString('en-GB')} for {formatCurrency(add.cost)}</li>
                    ))}
                </ul>
            </div>
        )}
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
            <div className="summary-row net-block">
                <span>Closing Net Block / WDV</span>
                <span>{formatCurrency(details.closingWDV)}</span>
            </div>
        </div>
    </div>
);

export default PrintAssetDetail;