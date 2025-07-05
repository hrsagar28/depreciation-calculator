import React from 'react';

const PrintStyles = () => (
    <style>{`
        .print-only { display: none; }
        @media print {
            @page { size: landscape; margin: 0.75in; }
            body, html { background-color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; height: auto; font-size: 10pt; }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            .print-header h1 { font-size: 18pt; font-weight: bold; text-align: center; margin-bottom: 4px; }
            .print-header p { font-size: 12pt; text-align: center; margin-bottom: 2rem; }
            .print-section-title { font-size: 14pt; font-weight: bold; margin-top: 2rem; margin-bottom: 1rem; border-bottom: 2px solid #ccc; padding-bottom: 0.5rem; page-break-after: avoid; page-break-before: always; }
            .print-section-title.first { page-break-before: auto; }
            .print-summary-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
            .print-summary-table th, .print-summary-table td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 8pt; }
            .print-summary-table th { background-color: #f2f2f2 !important; font-weight: bold; }
            .print-summary-table td[align="right"], .print-summary-table th[align="right"] { text-align: right; }
            .print-summary-table tfoot { font-weight: bold; background-color: #f2f2f2 !important; }
            .print-asset-detail { page-break-inside: avoid; margin-bottom: 1.5rem; border: 1px solid #ccc; padding: 1rem; border-radius: 8px; }
            .print-asset-detail h4 { font-size: 12pt; font-weight: bold; margin-bottom: 0.75rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
            .print-asset-header-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem 1.5rem; margin-bottom: 1rem; }
            .print-asset-header-grid div { font-size: 9pt; }
            .print-workings-table { width: 100%; margin-top: 1rem; border-collapse: collapse; }
            .print-workings-table td { padding: 4px 0; vertical-align: top; border-bottom: 1px dotted #ccc; }
            .print-workings-table tr:last-child td { border-bottom: none; }
            .print-workings-table .calc-desc { font-size: 9pt; }
            .print-workings-table .calc-string { font-size: 8pt; color: #555 !important; padding-left: 1rem; }
            .print-workings-table .calc-amount { text-align: right; font-weight: bold; white-space: nowrap; padding-left: 1.5rem; }
            .print-final-summary { margin-top: 1rem; border-top: 2px solid #ccc; padding-top: 0.75rem; }
            .print-final-summary .summary-row { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 0.25rem; font-size: 10pt; }
            .print-final-summary .profit { color: #166534 !important; }
            .print-final-summary .loss { color: #b91c1c !important; }
            .print-final-summary .net-block { background-color: #f0fdf4 !important; padding: 0.5rem; border-radius: 4px; margin-top: 0.5rem; }
            * { box-shadow: none !important; text-shadow: none !important; color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
        }
    `}</style>
);

export default PrintStyles;