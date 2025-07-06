import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import HelpModal from './components/HelpModal';
import Tooltip from './components/Tooltip';
import { useDebounce } from './utils/helpers';
import AssetCard from './components/AssetCard';
import BlockCard from './components/BlockCard';
import { FINANCIAL_YEARS, getFinancialYearDates, INCOME_TAX_BLOCKS } from './config';
import AssetDetailPanel from './components/AssetDetailPanel';
import ConfirmationModal from './components/ConfirmationModal';
import BlockDetailPanel from './components/BlockDetailPanel';
import PrintStyles from './components/PrintStyles';
import { calculateCompaniesActDepreciation, calculateIncomeTaxDepreciation } from './utils/depreciationCalculations';
import PrintLayout from './components/PrintLayout';
import SummaryReport from './components/SummaryReport';
import Toast from './components/Toast';
import EmptyState from './components/EmptyState';
import ActSelectionScreen from './components/ActSelectionScreen';
import { SkeletonSummary } from './components/SkeletonLoader';
import IncomeTaxView from './components/IncomeTaxView';
import CompaniesActView from './components/CompaniesActView';
import DeferredTaxCalculator from './components/DeferredTaxCalculator';
import PrintDeferredTax from './components/PrintDeferredTax';

export default function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [theme, setTheme] = useState('light');
    const [act, setAct] = useState(null);
    const [method, setMethod] = useState('WDV');
    const [currentFY, setCurrentFY] = useState("2024-25");

    const [allAssets, setAllAssets] = useState({});
    const [allAssetBlocks, setAllAssetBlocks] = useState({});

    const [deferredTaxRate, setDeferredTaxRate] = useState(25);
    const [accountingProfit, setAccountingProfit] = useState('');

    const [isAssetDeleteModalOpen, setIsAssetDeleteModalOpen] = useState(false);
    const [isBlockDeleteModalOpen, setIsBlockDeleteModalOpen] = useState(false);
    const [toast, setToast] = useState({ message: '', show: false, onUndo: null });
    const [filterType, setFilterType] = useState(null);
    const [selectedAssetId, setSelectedAssetId] = useState(null);
    const [selectedBlockId, setSelectedBlockId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [blockSearchTerm, setBlockSearchTerm] = useState('');
    
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [helpTopic, setHelpTopic] = useState('introduction');

    const assets = useMemo(() => allAssets[currentFY] || [], [allAssets, currentFY]);
    const assetBlocks = useMemo(() => allAssetBlocks[currentFY] || [], [allAssetBlocks, currentFY]);

    const debouncedAssets = useDebounce(assets, 300);
    const debouncedAssetBlocks = useDebounce(assetBlocks, 300);
    const debouncedMethod = useDebounce(method, 300);
    const debouncedTheme = useDebounce(theme, 300);
    const debouncedAct = useDebounce(act, 300);
    const debouncedDeferredTaxRate = useDebounce(deferredTaxRate, 300);
    const debouncedAccountingProfit = useDebounce(accountingProfit, 300);
    const debouncedCurrentFY = useDebounce(currentFY, 300);

    const showToast = useCallback((message, onUndo = null) => {
        setToast({ message, show: true, onUndo });
    },[]);

    const hideToast = useCallback(() => {
        setToast(prev => ({ ...prev, show: false, onUndo: null }));
    }, []);

    const saveState = useCallback((stateToSave) => {
        try {
            const dataToSave = {
                allAssets: stateToSave.allAssets,
                allAssetBlocks: stateToSave.allAssetBlocks,
                method: stateToSave.method,
                act: stateToSave.act,
                deferredTaxRate: stateToSave.deferredTaxRate,
                accountingProfit: stateToSave.accountingProfit,
                currentFY: stateToSave.currentFY,
            };
            localStorage.setItem('depreciationAppStateV10', JSON.stringify(dataToSave));
            localStorage.setItem('depreciationAppTheme', stateToSave.theme);
        } catch (error) {
            console.error("Failed to save state to localStorage", error);
            showToast("Error: Could not save data.");
        }
    }, [showToast]);
    
    const openHelpModal = (topic) => {
        setHelpTopic(topic);
        setIsHelpModalOpen(true);
    };

    useEffect(() => {
        const papaScriptId = 'papaparse-script';
        if (!document.getElementById(papaScriptId)) {
            const script = document.createElement('script');
            script.id = papaScriptId;
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js";
            script.async = true;
            script.onload = () => console.log('PapaParse loaded');
            script.onerror = () => showToast("Export feature unavailable. Please check your internet connection and refresh.");
            document.head.appendChild(script);
        }
    }, [showToast]);

    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                const savedState = localStorage.getItem('depreciationAppStateV10');
                const savedTheme = localStorage.getItem('depreciationAppTheme');
                const hasVisited = localStorage.getItem('depreciationAppVisited');
                setTheme(savedTheme || 'light');

                if (savedState) {
                    const data = JSON.parse(savedState);
                    setAllAssets(data.allAssets || {});
                    setAllAssetBlocks(data.allAssetBlocks || {});
                    setMethod(data.method || 'WDV');
                    setAct(data.act || null);
                    setCurrentFY(data.currentFY || "2024-25");
                    setDeferredTaxRate(data.deferredTaxRate || 25);
                    setAccountingProfit(data.accountingProfit || '');
                } else {
                     if (!hasVisited) {
                        openHelpModal('introduction');
                        localStorage.setItem('depreciationAppVisited', 'true');
                     }
                }
            } catch (error) {
                console.error("Failed to load state from localStorage", error);
            }
            setIsLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!isLoading) {
            saveState({ 
                allAssets, 
                allAssetBlocks,
                method: debouncedMethod, 
                theme: debouncedTheme, 
                act: debouncedAct,
                deferredTaxRate: debouncedDeferredTaxRate,
                accountingProfit: debouncedAccountingProfit,
                currentFY: debouncedCurrentFY,
            });
        }
    }, [allAssets, allAssetBlocks, debouncedMethod, debouncedTheme, debouncedAct, debouncedDeferredTaxRate, debouncedAccountingProfit, debouncedCurrentFY, isLoading, saveState]);
    
    const { start: fyStartDate, end: fyEndDate, label: FY_LABEL_CURRENT } = getFinancialYearDates(currentFY);

    const handleYearChange = (newFY) => {
        const currentYearIndex = FINANCIAL_YEARS.indexOf(newFY);
        const prevYearWithDataIndex = FINANCIAL_YEARS.slice(0, currentYearIndex).reverse().findIndex(fy => allAssets[fy] || allAssetBlocks[fy]);
        
        // Check if data for the new year already exists. If so, just switch to it.
        if (allAssets[newFY] || allAssetBlocks[newFY]) {
            setCurrentFY(newFY);
            return;
        }

        // If no prior year has data, just switch to the new empty year
        if (prevYearWithDataIndex === -1) {
            setCurrentFY(newFY);
            return;
        }

        // --- Perform Rollover ---
        let assetsToRollover = { ...allAssets };
        let blocksToRollover = { ...allAssetBlocks };

        const lastYearWithData = FINANCIAL_YEARS.slice(0, currentYearIndex).reverse()[prevYearWithDataIndex];
        const lastYearWithDataIndex = FINANCIAL_YEARS.indexOf(lastYearWithData);

        for (let i = lastYearWithDataIndex; i < currentYearIndex; i++) {
            const stepFY = FINANCIAL_YEARS[i];
            const nextStepFY = FINANCIAL_YEARS[i + 1];
            const { start: stepFyStart, end: stepFyEnd } = getFinancialYearDates(stepFY);
            
            const currentAssets = assetsToRollover[stepFY] || [];
            const currentBlocks = blocksToRollover[stepFY] || [];

            // Rollover Companies Act Assets
            const nextYearAssets = currentAssets.map(asset => {
                const prevYearDetails = calculateCompaniesActDepreciation(asset, method, stepFyStart, stepFyEnd);
                if (prevYearDetails.closingGrossBlock <= 0 && prevYearDetails.disposalsCost > 0) return null;
                return {
                    ...asset, additions: [], disposalDate: '', saleValue: '', isNew: false, isSelected: false,
                    companiesAct: {
                        openingGrossBlock: prevYearDetails.closingGrossBlock,
                        openingAccumulatedDepreciation: prevYearDetails.closingAccumulatedDepreciation,
                        residualValue: asset.companiesAct.residualValue
                    }
                };
            }).filter(Boolean);

            // Rollover Income Tax Blocks
            const nextYearBlocks = currentBlocks.map(block => {
                const prevYearDetails = calculateIncomeTaxDepreciation(block, stepFyStart, stepFyEnd);
                if (prevYearDetails.closingWDV <= 0 && block.blockCeased) return null;
                 return {
                    ...block, openingWDV: prevYearDetails.closingWDV,
                    additions: [], saleProceeds: '', blockCeased: false, isNew: false, isSelected: false,
                };
            }).filter(Boolean);

            assetsToRollover[nextStepFY] = nextYearAssets;
            blocksToRollover[nextStepFY] = nextYearBlocks;
        }
        setAllAssets(assetsToRollover);
        setAllAssetBlocks(blocksToRollover);
        setCurrentFY(newFY);
        showToast(`Balances rolled over to ${newFY}`, null);
    };

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const handleSelectAct = (selectedAct) => {
        setAct(selectedAct);
        setFilterType(null);
        setSearchTerm('');
        setBlockSearchTerm('');
    };

    const addAsset = useCallback(() => {
        const newId = `asset-${Date.now()}`;
        const newAsset = { id: newId, name: '', additions: [], assetType: '', isNew: true, isSelected: false, purchaseDate: '', disposalDate: '', saleValue: '', companiesAct: { openingGrossBlock: '', openingAccumulatedDepreciation: '', residualValue: '' }, };
        setAllAssets(prev => ({ ...prev, [currentFY]: [newAsset, ...(prev[currentFY] || [])] }));
        setSelectedAssetId(newId);
        setFilterType(null);
        showToast("Asset added successfully!");
    }, [currentFY, showToast]);

    const addBlock = useCallback(() => {
        const newId = `block-${Date.now()}`;
        const newBlock = { id: newId, blockType: '', name: '', rate: 0, openingWDV: '', additions: [], saleProceeds: '', blockCeased: false, eligibleForAdditional: false, additionalDepEligibility: { isNewPlantMachinery: false, isManufacturing: false, isNotExcluded: false }, isSelected: false, isNew: true, };
        setAllAssetBlocks(prev => ({ ...prev, [currentFY]: [newBlock, ...(prev[currentFY] || [])] }));
        setSelectedBlockId(newId);
        showToast("New block added. Please select a block type.");
    }, [currentFY, showToast]);

    const updateAsset = useCallback((id, updatedData) => {
        setAllAssets(prev => ({ ...prev, [currentFY]: (prev[currentFY] || []).map(asset => asset.id === id ? updatedData : asset) }));
    }, [currentFY]);

    const updateBlock = useCallback((id, updatedData) => {
        setAllAssetBlocks(prev => ({ ...prev, [currentFY]: (prev[currentFY] || []).map(block => block.id === id ? updatedData : block) }));
    }, [currentFY]);

    const handleSelectAsset = useCallback((id, isSelected) => {
        setAllAssets(prev => ({ ...prev, [currentFY]: (prev[currentFY] || []).map(asset => asset.id === id ? {...asset, isSelected} : asset) }));
    }, [currentFY]);

    const handleSelectBlock = useCallback((id, isSelected) => {
        setAllAssetBlocks(prev => ({ ...prev, [currentFY]: (prev[currentFY] || []).map(block => block.id === id ? {...block, isSelected} : block) }));
    }, [currentFY]);

    const handleConfirmAssetDelete = useCallback(() => {
      const originalAssets = [...(allAssets[currentFY] || [])];
      const assetsToDelete = originalAssets.filter(a => a.isSelected);
      const newAssets = originalAssets.filter(asset => !asset.isSelected);
      setAllAssets(prev => ({...prev, [currentFY]: newAssets}));
      setIsAssetDeleteModalOpen(false);
      setSelectedAssetId(null);
      const undo = () => { setAllAssets(prev => ({...prev, [currentFY]: originalAssets})); hideToast(); showToast("Deletion undone."); };
      showToast(`${assetsToDelete.length} asset(s) deleted.`, undo);
    }, [allAssets, currentFY, showToast, hideToast]);

    const handleConfirmBlockDelete = useCallback(() => {
      const originalBlocks = [...(allAssetBlocks[currentFY] || [])];
      const blocksToDelete = originalBlocks.filter(b => b.isSelected);
      const newBlocks = originalBlocks.filter(block => !block.isSelected);
      setAllAssetBlocks(prev => ({...prev, [currentFY]: newBlocks}));
      setIsBlockDeleteModalOpen(false);
      setSelectedBlockId(null);
      const undo = () => { setAllAssetBlocks(prev => ({...prev, [currentFY]: originalBlocks})); hideToast(); showToast("Deletion undone."); };
      showToast(`${blocksToDelete.length} block(s) deleted.`, undo);
    }, [allAssetBlocks, currentFY, showToast, hideToast]);

    const handleMethodChange = (newMethod) => {
        if (method !== newMethod && assets.some(a => a.companiesAct.openingGrossBlock || a.additions.length > 0)) {
            showToast("Method switched. Please review assets as Residual Value requirements may have changed.");
        }
        setMethod(newMethod);
    };

    const handleDeleteAssetRequest = () => { if (selectedAssetCount > 0) setIsAssetDeleteModalOpen(true); };
    const handleDeleteBlockRequest = () => { if (selectedBlockCount > 0) setIsBlockDeleteModalOpen(true); };

    const handleExport = useCallback(() => {
        const dataToExport = { allAssets, allAssetBlocks, method, deferredTaxRate, accountingProfit, currentFY };
        const dataStr = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `depreciation_data_backup.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Data exported successfully!");
    }, [allAssets, allAssetBlocks, method, deferredTaxRate, accountingProfit, currentFY, showToast]);

    const handleImport = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importedData = JSON.parse(event.target.result);
                        setAllAssets(importedData.allAssets || {});
                        setAllAssetBlocks(importedData.allAssetBlocks || {});
                        setMethod(importedData.method || 'WDV');
                        setCurrentFY(importedData.currentFY || "2024-25");
                        setDeferredTaxRate(importedData.deferredTaxRate || 25);
                        setAccountingProfit(importedData.accountingProfit || '');
                        showToast("Data imported successfully!");
                    } catch (error) {
                        showToast("Error: Invalid or corrupted data file.");
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }, [showToast]);
    
    const companiesActCalculationResults = useMemo(() => {
        return assets.map(asset => ({ id: asset.id, asset, details: calculateCompaniesActDepreciation(asset, method, fyStartDate, fyEndDate) }));
    }, [assets, method, fyStartDate, fyEndDate]);
    
    const incomeTaxCalculationResults = useMemo(() => {
        return assetBlocks.map(block => ({ id: block.id, block, details: calculateIncomeTaxDepreciation(block, fyStartDate, fyEndDate) }));
    }, [assetBlocks, fyStartDate, fyEndDate]);

    const companiesActSummary = useMemo(() => {
        const summary = { byType: {}, totals: {} };
        const initialTypeSummary = { openingGrossBlock: 0, additions: 0, disposalsCost: 0, closingGrossBlock: 0, openingAccumulatedDepreciation: 0, openingNetBlock: 0, depreciationForYear: 0, closingAccumulatedDepreciation: 0, closingNetBlock: 0 };
        companiesActCalculationResults.forEach(({asset, details}) => {
            const type = asset.assetType || 'unclassified';
            if (!summary.byType[type]) { summary.byType[type] = { ...initialTypeSummary, name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), internalName: type }; }
            Object.keys(initialTypeSummary).forEach(key => summary.byType[type][key] += details[key] || 0);
        });
        summary.totals = Object.values(summary.byType).reduce((acc, curr) => { Object.keys(acc).forEach(key => { acc[key] += curr[key]; }); return acc; }, { ...initialTypeSummary });
        return summary;
    }, [companiesActCalculationResults]);

    const incomeTaxSummary = useMemo(() => {
        const summary = { byType: {}, totals: {} };
        const initialBlockSummary = { openingWDV: 0, additions: 0, saleValue: 0, wdvForDep: 0, depreciationForYear: 0, closingNetBlock: 0, shortTermCapitalGainLoss: 0 };
        incomeTaxCalculationResults.forEach(({block, details}) => {
            const type = block.blockType || 'unclassified';
            if (!summary.byType[type]) { summary.byType[type] = { ...initialBlockSummary, name: INCOME_TAX_BLOCKS[type]?.name || 'Unclassified Block', internalName: type, }; }
            Object.keys(initialBlockSummary).forEach(key => summary.byType[type][key] += details[key] || 0);
        });
        summary.totals = Object.values(summary.byType).reduce((acc, curr) => { Object.keys(acc).forEach(key => { acc[key] += curr[key]; }); return acc; }, { ...initialBlockSummary });
        return summary;
    }, [incomeTaxCalculationResults]);

    const filteredItems = useMemo(() => {
        const results = act === 'companies' ? companiesActCalculationResults : incomeTaxCalculationResults;
        if (act === 'companies') {
            if (filterType) return results.filter(result => result.asset.assetType === filterType);
            if (searchTerm) return results.filter(result => result.asset.name.toLowerCase().includes(searchTerm.toLowerCase()));
        } else if (act === 'income_tax') {
            if (filterType) return results.filter(result => result.block.blockType === filterType);
            if (blockSearchTerm) return results.filter(result => result.block.name.toLowerCase().includes(blockSearchTerm.toLowerCase()));
        }
        return results;
    }, [act, companiesActCalculationResults, incomeTaxCalculationResults, filterType, searchTerm, blockSearchTerm]);

    const selectedAssetCount = useMemo(() => assets.filter(a => a.isSelected).length, [assets]);
    const selectedBlockCount = useMemo(() => assetBlocks.filter(b => b.isSelected).length, [assetBlocks]);

    const selectedAssetData = useMemo(() => {
        if (act === 'companies') return companiesActCalculationResults.find(r => r.id === selectedAssetId);
        return null;
    }, [selectedAssetId, companiesActCalculationResults, act]);

    const selectedBlockData = useMemo(() => {
        if (act === 'income_tax') return incomeTaxCalculationResults.find(r => r.id === selectedBlockId);
        return null;
    }, [selectedBlockId, incomeTaxCalculationResults, act]);

    const allVisibleAssetsSelected = useMemo(() => {
        if (act !== 'companies' || filteredItems.length === 0) return false;
        const visibleIds = new Set(filteredItems.map(r => r.id));
        return assets.filter(a => visibleIds.has(a.id)).every(a => a.isSelected);
    }, [assets, filteredItems, act]);

    const allVisibleBlocksSelected = useMemo(() => {
        if (act !== 'income_tax' || filteredItems.length === 0) return false;
        const visibleIds = new Set(filteredItems.map(b => b.id));
        return assetBlocks.filter(b => visibleIds.has(b.id)).every(b => b.isSelected);
    }, [assetBlocks, filteredItems, act]);

    const handleSelectAllAssets = useCallback(() => {
        const visibleIds = new Set(filteredItems.map(a => a.id));
        const shouldSelectAll = !allVisibleAssetsSelected;
        setAllAssets(prev => ({ ...prev, [currentFY]: (prev[currentFY] || []).map(asset => visibleIds.has(asset.id) ? {...asset, isSelected: shouldSelectAll} : asset) }));
    }, [filteredItems, allVisibleAssetsSelected, currentFY]);

    const handleSelectAllBlocks = useCallback(() => {
        const visibleIds = new Set(filteredItems.map(b => b.id));
        const shouldSelectAll = !allVisibleBlocksSelected;
        setAllAssetBlocks(prev => ({ ...prev, [currentFY]: (prev[currentFY] || []).map(block => visibleIds.has(block.id) ? {...block, isSelected: shouldSelectAll} : block) }));
    }, [filteredItems, allVisibleBlocksSelected, currentFY]);

    return (
        <div className={`${theme} transition-colors duration-500`}>
            <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} topic={helpTopic} />
            
            {isLoading ? (
                <div className="bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 min-h-screen flex justify-center items-center">
                    <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">Loading Calculator...</div>
                </div>
            ) : !act ? (
                <ActSelectionScreen 
                    onSelectCalculationMode={handleSelectAct} 
                    theme={theme} 
                    toggleTheme={toggleTheme} 
                    openHelpModal={openHelpModal}
                    handleExport={handleExport}
                    handleImport={handleImport}
                />
            ) : (
                <>
                    <PrintStyles />
                    <style>{`
                        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                        .animate-fade-in { animation: fade-in 0.5s ease-in-out; }
                        @keyframes fade-in-slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                        .animate-new-item { animation: fade-in-slide-up 0.5s ease-out; }
                    `}</style>
                    
                    <div className="print-only">
                        {act === 'deferred_tax' ? (
                            <PrintDeferredTax
                                companiesActDepreciation={companiesActSummary.totals.depreciationForYear}
                                incomeTaxDepreciation={incomeTaxSummary.totals.depreciationForYear}
                                openingCompaniesActWdv={companiesActSummary.totals.openingNetBlock}
                                openingIncomeTaxWdv={incomeTaxSummary.totals.openingWDV}
                                taxRate={deferredTaxRate}
                                accountingProfit={accountingProfit}
                                FY_LABEL={FY_LABEL_CURRENT}
                            />
                        ) : (
                            <PrintLayout
                                calculationResults={act === 'companies' ? companiesActCalculationResults : incomeTaxCalculationResults}
                                method={method}
                                FY_LABEL={FY_LABEL_CURRENT}
                                summaryData={act === 'companies' ? companiesActSummary : incomeTaxSummary}
                                act={act}
                            />
                        )}
                    </div>

                    <div className="no-print bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 min-h-screen text-slate-800 font-sans transition-colors duration-500">
                        <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
                            <Toast message={toast.message} show={toast.show} onClose={hideToast} onUndo={toast.onUndo} />
                            <ConfirmationModal
                                isOpen={isAssetDeleteModalOpen || isBlockDeleteModalOpen}
                                onClose={() => { setIsAssetDeleteModalOpen(false); setIsBlockDeleteModalOpen(false); }}
                                onConfirm={act === 'companies' ? handleConfirmAssetDelete : handleConfirmBlockDelete}
                                title="Confirm Deletion"
                                confirmText="Confirm Deletion"
                            >
                                Are you sure you want to delete the selected {act === 'companies' ? selectedAssetCount : selectedBlockCount} item(s)? This action cannot be undone.
                            </ConfirmationModal>

                            <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="text-center md:text-left">
                                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100">
                                        {act === 'deferred_tax' ? 'Deferred Tax Analysis' : 'Depreciation Calculator'}
                                    </h1>
                                    <p className="text-md sm:text-lg text-slate-600 dark:text-slate-400 mt-1">
                                        For Financial Year: {FY_LABEL_CURRENT}
                                    </p>
                                </div>
                                <div className="flex justify-center items-center gap-2">
                                    <select 
                                        value={currentFY} 
                                        onChange={(e) => handleYearChange(e.target.value)}
                                        className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >
                                        {FINANCIAL_YEARS.map(fy => (
                                            <option key={fy} value={fy}>{fy}</option>
                                        ))}
                                    </select>
                                    <button onClick={() => setAct(null)} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-sm hover:bg-gray-700 transition-colors text-sm">Change Tool</button>
                                    <button onClick={() => openHelpModal(act === 'companies' ? 'companiesAct' : act === 'income_tax' ? 'incomeTaxAct' : 'deferredTax')} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm">Help</button>
                                    <button onClick={toggleTheme} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-lg shadow-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-sm">
                                        {theme === 'light' ? 'Dark' : 'Light'}
                                    </button>
                                </div>
                            </header>

                            {act !== 'deferred_tax' && (isLoading ? <SkeletonSummary /> : <SummaryReport summaryData={act === 'companies' ? companiesActSummary : incomeTaxSummary} onFilterChange={setFilterType} showToast={showToast} filterType={filterType} theme={theme} act={act} setAct={handleSelectAct} />)}
                            
                            <div key={act + currentFY} className="animate-fade-in">
                                {act === 'companies' ? (
                                    <CompaniesActView
                                      handleMethodChange={handleMethodChange}
                                      method={method}
                                      assets={assets}
                                      addAsset={addAsset}
                                      filteredItems={filteredItems}
                                      handleSelectAsset={handleSelectAsset}
                                      setSelectedAssetId={setSelectedAssetId}
                                      selectedAssetCount={selectedAssetCount}
                                      allVisibleAssetsSelected={allVisibleAssetsSelected}
                                      handleSelectAllAssets={handleSelectAllAssets}
                                      handleDeleteAssetRequest={handleDeleteAssetRequest}
                                      searchTerm={searchTerm}
                                      setSearchTerm={setSearchTerm}
                                      filterType={filterType}
                                      setFilterType={setFilterType}
                                      isLoading={isLoading}
                                      selectedAssetData={selectedAssetData}
                                      updateAsset={updateAsset}
                                      fyStartDate={fyStartDate}
                                      fyEndDate={fyEndDate}
                                    />
                                  ) : act === 'income_tax' ? (
                                    <IncomeTaxView
                                      assetBlocks={assetBlocks}
                                      addBlock={addBlock}
                                      filteredItems={filteredItems}
                                      handleSelectBlock={handleSelectBlock}
                                      setSelectedBlockId={setSelectedBlockId}
                                      selectedBlockCount={selectedBlockCount}
                                      allVisibleBlocksSelected={allVisibleBlocksSelected}
                                      handleSelectAllBlocks={handleSelectAllBlocks}
                                      handleDeleteBlockRequest={handleDeleteBlockRequest}
                                      blockSearchTerm={blockSearchTerm}
                                      setBlockSearchTerm={setBlockSearchTerm}
                                      filterType={filterType}
                                      setFilterType={setFilterType}
                                      isLoading={isLoading}
                                      selectedBlockData={selectedBlockData}
                                      updateBlock={updateBlock}
                                      fyStartDate={fyStartDate}
                                      fyEndDate={fyEndDate}
                                    />
                                  ) : (
                                    <DeferredTaxCalculator
                                      companiesActDepreciation={companiesActSummary.totals.depreciationForYear}
                                      incomeTaxDepreciation={incomeTaxSummary.totals.depreciationForYear}
                                      openingCompaniesActWdv={companiesActSummary.totals.openingNetBlock}
                                      openingIncomeTaxWdv={incomeTaxSummary.totals.openingWDV}
                                      taxRate={deferredTaxRate}
                                      setTaxRate={setDeferredTaxRate}
                                      accountingProfit={accountingProfit}
                                      setAccountingProfit={setAccountingProfit}
                                      setAct={setAct}
                                    />
                                  )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
