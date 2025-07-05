import React from 'react';
import PrintSummaryTable from './PrintSummaryTable';
import PrintAssetDetail from './PrintAssetDetail';

const PrintLayout = ({ calculationResults, method, FY_LABEL, summaryData, act }) => (
    <div className="print-container">
        <header className="print-header">
            <h1>Depreciation Calculator - {act === 'companies' ? 'Companies Act' : 'Income Tax Act'}</h1>
            <p>For the Financial Year {FY_LABEL}</p>
        </header>
        <section>
            <PrintSummaryTable summaryData={summaryData} act={act} />
        </section>
        {act === 'companies' && calculationResults.length > 0 && (
           <section>
                <h2 className="print-section-title">Asset Details</h2>
                {calculationResults.map(result => (
                    <PrintAssetDetail
                        key={`print-${result.id}`}
                        asset={result.asset}
                        details={result.details}
                        method={method}
                        act={act}
                    />
                ))}
           </section>
        )}
    </div>
);

export default PrintLayout;