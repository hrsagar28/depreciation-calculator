import React from 'react';
import PrintSummaryTable from './PrintSummaryTable';
import PrintAssetDetail from './PrintAssetDetail';
import PrintBlockDetail from './PrintBlockDetail'; // Import the new component

const PrintLayout = ({ calculationResults, method, FY_LABEL, summaryData, act }) => (
    <div className="print-container">
        <header className="print-header">
            <h1>Depreciation Calculator - {act === 'companies' ? 'Companies Act' : 'Income Tax Act'}</h1>
            <p>For the Financial Year {FY_LABEL}</p>
        </header>
        <section>
            <PrintSummaryTable summaryData={summaryData} act={act} />
        </section>

        {/* This logic now handles both Companies Act and Income Tax Act details */}
        {calculationResults.length > 0 && (
           <section>
                <h2 className="print-section-title">
                    {act === 'companies' ? 'Asset Details' : 'Block Details'}
                </h2>
                {act === 'companies' ? (
                    calculationResults.map(result => (
                        <PrintAssetDetail
                            key={`print-asset-${result.id}`}
                            asset={result.asset}
                            details={result.details}
                            method={method}
                            act={act}
                        />
                    ))
                ) : (
                    calculationResults.map(result => (
                        <PrintBlockDetail
                            key={`print-block-${result.id}`}
                            block={result.block}
                            details={result.details}
                        />
                    ))
                )}
           </section>
        )}
    </div>
);

export default PrintLayout;
