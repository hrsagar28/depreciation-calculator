import React from 'react';
import { formatCurrency } from '../utils/helpers';

const PrintInfoCard = ({ title, children }) => (
    <div style={{ border: '1px solid #ccc', borderRadius: '8px', marginBottom: '1.5rem', pageBreakInside: 'avoid' }}>
        <header style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eee', backgroundColor: '#f8f9fa' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '12pt', margin: 0 }}>{title}</h3>
        </header>
        <div style={{ padding: '1rem', fontSize: '10pt' }}>
            {children}
        </div>
    </div>
);

const PrintDeferredTax = ({
    companiesActDepreciation,
    incomeTaxDepreciation,
    openingCompaniesActWdv,
    openingIncomeTaxWdv,
    taxRate,
    accountingProfit,
    FY_LABEL
}) => {
    // Re-calculating logic here to be self-contained for printing
    const parsedAccountingProfit = parseFloat(accountingProfit) || 0;
    const openingTimingDifference = (openingIncomeTaxWdv || 0) - (openingCompaniesActWdv || 0);
    const openingDeferredTax = openingTimingDifference * (taxRate / 100);
    const movementTimingDifference = (companiesActDepreciation || 0) - (incomeTaxDepreciation || 0);
    const movementDeferredTax = movementTimingDifference * (taxRate / 100);
    const closingDeferredTax = openingDeferredTax + movementDeferredTax;
    const isClosingAsset = closingDeferredTax >= 0;
    const resultType = isClosingAsset ? 'Asset' : 'Liability';
    
    const journalEntry = {
        debit: movementDeferredTax >= 0 ? 'Deferred Tax Asset (B/S)' : 'Deferred Tax Expense (P&L)',
        credit: movementDeferredTax >= 0 ? 'Deferred Tax Expense (P&L)' : 'Deferred Tax Liability (B/S)',
        amount: Math.abs(movementDeferredTax),
        narration: `Being the movement in deferred tax for the year recognized on timing differences in depreciation.`
    };

    const taxableProfit = parsedAccountingProfit - movementTimingDifference;
    const currentTax = taxableProfit * (taxRate / 100);
    const totalTaxExpense = currentTax + movementDeferredTax;

    return (
        <div className="print-container">
            <header className="print-header">
                <h1>Deferred Tax Analysis</h1>
                <p>For the Financial Year {FY_LABEL}</p>
            </header>

            <PrintInfoCard title="Deferred Tax Movement Summary">
                <table className="print-summary-table">
                    <tbody>
                        <tr>
                            <td>Opening Deferred Tax {openingDeferredTax >= 0 ? 'Asset' : 'Liability'}</td>
                            <td align="right">{formatCurrency(Math.abs(openingDeferredTax))}</td>
                        </tr>
                        <tr>
                            <td>Movement during the year (Charge)/Credit to P&L</td>
                            <td align="right">{formatCurrency(movementDeferredTax)}</td>
                        </tr>
                        <tr style={{fontWeight: 'bold', borderTop: '2px solid #ccc'}}>
                            <td>Closing Deferred Tax {resultType}</td>
                            <td align="right">{formatCurrency(Math.abs(closingDeferredTax))}</td>
                        </tr>
                    </tbody>
                </table>
            </PrintInfoCard>

            <PrintInfoCard title="Journal Entry (for Movement during the year)">
                <table className="print-summary-table">
                     <thead>
                        <tr>
                            <th>Particulars</th>
                            <th align="right">Debit (₹)</th>
                            <th align="right">Credit (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{journalEntry.debit}</td>
                            <td align="right">{formatCurrency(journalEntry.amount)}</td>
                            <td></td>
                        </tr>
                        <tr>
                            <td style={{paddingLeft: '1rem'}}>To {journalEntry.credit}</td>
                            <td></td>
                            <td align="right">{formatCurrency(journalEntry.amount)}</td>
                        </tr>
                    </tbody>
                </table>
                {/* THIS IS THE CORRECTED NARRATION */}
                <p style={{marginTop: '1rem', fontSize: '9pt', fontStyle: 'italic'}}>({journalEntry.narration})</p>
            </PrintInfoCard>

            <PrintInfoCard title="Notes to Accounts & Disclosures">
                 <h4 style={{fontWeight: 'bold', fontSize: '11pt', marginBottom: '0.5rem'}}>A. Deferred Tax {resultType} (Balance Sheet Note)</h4>
                 <p style={{marginBottom: '1rem'}}>The closing balance is presented under <strong>{isClosingAsset ? 'Non-Current Assets' : 'Non-Current Liabilities'}</strong>. The movement is reconciled as follows:</p>
                 {/* THIS IS THE CORRECTED RECONCILIATION TABLE */}
                 <table className="print-summary-table" style={{maxWidth: '400px'}}>
                    <tbody>
                        <tr>
                            <td>Opening Balance</td>
                            <td align="right">{formatCurrency(openingDeferredTax)}</td>
                        </tr>
                        <tr>
                            <td>Charge/(Credit) to P&L for the year</td>
                            <td align="right">{formatCurrency(movementDeferredTax)}</td>
                        </tr>
                        <tr style={{fontWeight: 'bold', borderTop: '2px solid #ccc'}}>
                            <td>Closing Balance</td>
                            <td align="right">{formatCurrency(closingDeferredTax)}</td>
                        </tr>
                    </tbody>
                 </table>
                 
                 <h4 style={{fontWeight: 'bold', fontSize: '11pt', marginBottom: '0.5rem', marginTop: '1.5rem'}}>B. Tax Expense (Profit & Loss Note)</h4>
                 <table className="print-summary-table">
                    <tbody>
                        <tr>
                            <td>Current Tax (on taxable profit)</td>
                            <td align="right">{formatCurrency(currentTax)}</td>
                        </tr>
                        <tr>
                            <td>Deferred Tax (charge/credit for the year)</td>
                            <td align="right">{formatCurrency(movementDeferredTax)}</td>
                        </tr>
                        <tr style={{fontWeight: 'bold', borderTop: '2px solid #ccc'}}>
                            <td>Total Tax Expense for the year</td>
                            <td align="right">{formatCurrency(totalTaxExpense)}</td>
                        </tr>
                    </tbody>
                </table>
            </PrintInfoCard>
        </div>
    );
};

export default PrintDeferredTax;
