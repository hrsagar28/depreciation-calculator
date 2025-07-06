import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import HelpModal from './components/HelpModal';
import Tooltip from './components/Tooltip';
import { useDebounce } from './utils/helpers';
import AssetCard from './components/AssetCard';
import BlockCard from './components/BlockCard';
import { FY_LABEL, INCOME_TAX_BLOCKS } from './config';
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
// PapaParse is loaded via a script tag in the App component to avoid import errors.


export default function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [theme, setTheme] = useState('light');
    const [act, setAct] = useState(null); // 'companies' or 'income_tax'
    const [method, setMethod] = useState('WDV');

    // State for Companies Act
    const [assets, setAssets] = useState([]);

    // State for Income Tax Act
    const [assetBlocks, setAssetBlocks] = useState([]);

    const [isAssetDeleteModalOpen, setIsAssetDeleteModalOpen] = useState(false);
    const [isBlockDeleteModalOpen, setIsBlockDeleteModalOpen] = useState(false);
    const [toast, setToast] = useState({ message: '', show: false, onUndo: null });
    const [filterType, setFilterType] = useState(null);
    const [selectedAssetId, setSelectedAssetId] = useState(null);
    const [selectedBlockId, setSelectedBlockId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [blockSearchTerm, setBlockSearchTerm] = useState('');
    
    // NEW STATE for Help Modal
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [helpTopic, setHelpTopic] = useState('introduction');

    const debouncedAssets = useDebounce(assets, 300);
    const debouncedAssetBlocks = useDebounce(assetBlocks, 300);
    const debouncedMethod = useDebounce(method, 300);
    const debouncedTheme = useDebounce(theme, 300);
    const debouncedAct = useDebounce(act, 300);

    const showToast = useCallback((message, onUndo = null) => {
        setToast({ message, show: true, onUndo });
    },[]);

    const hideToast = useCallback(() => {
        setToast(prev => ({ ...prev, show: false, onUndo: null }));
    }, []);

    const saveState = useCallback((stateToSave) => {
        try {
            const dataToSave = {
                assets: stateToSave.assets.map(asset => {
                    const { isNew, ...rest } = asset;
                    return rest;
                }),
                assetBlocks: stateToSave.assetBlocks.map(block => {
                    const { isNew, ...rest } = block;
                    return rest;
                }),
                method: stateToSave.method,
                act: stateToSave.act,
            };
            localStorage.setItem('depreciationAppStateV9', JSON.stringify(dataToSave));
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
                const savedState = localStorage.getItem('depreciationAppStateV9');
                const savedTheme = localStorage.getItem('depreciationAppTheme');
                const hasVisited = localStorage.getItem('depreciationAppVisited');
                setTheme(savedTheme || 'light');

                if (savedState) {
                    const { assets: savedAssets, assetBlocks: savedBlocks, method: savedMethod, act: savedAct } = JSON.parse(savedState);
                    setAssets(savedAssets?.map(a => ({...a, isSelected: false, isNew: false })) || []);
                    setAssetBlocks(savedBlocks?.map(b => ({...b, isSelected: false, isNew: false })) || []);
                    setMethod(savedMethod || 'WDV');
                    setAct(savedAct || null);
                } else {
                     setAssets([]);
                     setAssetBlocks([]);
                     if (!hasVisited) {
                        openHelpModal('introduction');
                        localStorage.setItem('depreciationAppVisited', 'true');
                     }
                }
            } catch (error) {
                console.error("Failed to load state from localStorage", error);
                 setAssets([]);
                 setAssetBlocks([]);
            }
            setIsLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!isLoading) {
            saveState({ assets: debouncedAssets, assetBlocks: debouncedAssetBlocks, method: debouncedMethod, theme: debouncedTheme, act: debouncedAct });
        }
    }, [debouncedAssets, debouncedAssetBlocks, debouncedMethod, debouncedTheme, debouncedAct, isLoading, saveState]);

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
        const newAsset = {
            id: newId, name: '',
            additions: [],
            assetType: '', isNew: true, isSelected: false,
            purchaseDate: '', disposalDate: '', saleValue: '',
            companiesAct: { openingGrossBlock: '', openingAccumulatedDepreciation: '', residualValue: '' },
        };
        const newAssets = [newAsset, ...assets];
        setAssets(newAssets);
        setSelectedAssetId(newId);
        setFilterType(null);
        showToast("Asset added successfully!");
    }, [assets, showToast]);

    const addBlock = useCallback(() => {
        const newId = `block-${Date.now()}`;
        const newBlock = {
            id: newId,
            blockType: '',
            name: 'New Block',
            rate: 0,
            openingWDV: '',
            additions: [],
            saleProceeds: '',
            blockCeased: false,
            eligibleForAdditional: false,
            additionalDepEligibility: {
                isNewPlantMachinery: false,
                isManufacturing: false,
                isNotExcluded: false,
            },
            isSelected: false,
            isNew: true,
        };
        const newBlocks = [newBlock, ...assetBlocks];
        setAssetBlocks(newBlocks);
        setSelectedBlockId(newId);
        showToast("New block added. Please select a block type.");
    }, [assetBlocks, showToast]);

    const updateAsset = useCallback((id, updatedData) => {
        setAssets(prev => prev.map(asset => (asset.id === id ? updatedData : asset)));
    }, []);

    const updateBlock = useCallback((id, updatedData) => {
        setAssetBlocks(prev => prev.map(block => (block.id === id ? updatedData : block)));
    }, []);

    const handleSelectAsset = useCallback((id, isSelected) => {
        setAssets(prev => prev.map(asset => asset.id === id ? {...asset, isSelected} : asset));
    }, []);

    const handleSelectBlock = useCallback((id, isSelected) => {
        setAssetBlocks(prev => prev.map(block => block.id === id ? {...block, isSelected} : block));
    }, []);

    const handleConfirmAssetDelete = useCallback(() => {
      const originalAssets = [...assets];
      const assetsToDelete = assets.filter(a => a.isSelected);
      const newAssets = assets.filter(asset => !asset.isSelected);

      setAssets(newAssets);
      setIsAssetDeleteModalOpen(false);
      setSelectedAssetId(null);

      const undo = () => {
          setAssets(originalAssets);
          hideToast();
          showToast("Deletion undone.");
      };
      showToast(`${assetsToDelete.length} asset(s) deleted.`, undo);
    }, [assets, showToast, hideToast]);

    const handleConfirmBlockDelete = useCallback(() => {
      const originalBlocks = [...assetBlocks];
      const blocksToDelete = assetBlocks.filter(b => b.isSelected);
      const newBlocks = assetBlocks.filter(block => !block.isSelected);

      setAssetBlocks(newBlocks);
      setIsBlockDeleteModalOpen(false);
      setSelectedBlockId(null);

      const undo = () => {
          setAssetBlocks(originalBlocks);
          hideToast();
          showToast("Deletion undone.");
      };
      showToast(`${blocksToDelete.length} block(s) deleted.`, undo);
    }, [assetBlocks, showToast, hideToast]);

    const handleMethodChange = (newMethod) => {
        if (method !== newMethod && assets.some(a => a.companiesAct.openingGrossBlock || a.additions.length > 0)) {
            showToast("Method switched. Please review assets as Residual Value requirements may have changed.");
        }
        setMethod(newMethod);
    };

    const handleDeleteAssetRequest = () => {
        if (selectedAssetCount > 0) {
            setIsAssetDeleteModalOpen(true);
        }
    };

    const handleDeleteBlockRequest = () => {
        if (selectedBlockCount > 0) {
            setIsBlockDeleteModalOpen(true);
        }
    };
    
    // --- CORRECTLY ORDERED LOGIC BLOCKS ---

    // 1. First, the main calculations
    const companiesActCalculationResults = useMemo(() => {
        return assets.map(asset => ({
            id: asset.id,
            asset,
            details: calculateCompaniesActDepreciation(asset, method)
        }));
    }, [assets, method]);
    
    const incomeTaxCalculationResults = useMemo(() => {
        return assetBlocks.map(block => ({
            id: block.id,
            block,
            details: calculateIncomeTaxDepreciation(block)
        }));
    }, [assetBlocks]);

    // 2. Second, the summaries which depend on the calculations
    const companiesActSummary = useMemo(() => {
        const summary = { byType: {}, totals: {} };
        const initialTypeSummary = {
            openingGrossBlock: 0, additions: 0, disposalsCost: 0, closingGrossBlock: 0,
            openingAccumulatedDepreciation: 0, openingNetBlock: 0, depreciationForYear: 0,
            closingAccumulatedDepreciation: 0, closingNetBlock: 0
        };
        companiesActCalculationResults.forEach(({asset, details}) => {
            const type = asset.assetType || 'unclassified';
            if (!summary.byType[type]) {
                summary.byType[type] = {
                    ...initialTypeSummary,
                    name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    internalName: type,
                };
            }
            const calc = details;
            summary.byType[type].openingGrossBlock += calc.openingGrossBlock;
            summary.byType[type].additions += calc.grossBlockAdditions;
            summary.byType[type].disposalsCost += calc.disposalsCost;
            summary.byType[type].closingGrossBlock += calc.closingGrossBlock;
            summary.byType[type].openingAccumulatedDepreciation += calc.openingAccumulatedDepreciation;
            summary.byType[type].openingNetBlock += calc.openingWDV;
            summary.byType[type].depreciationForYear += calc.depreciationForYear;
            summary.byType[type].closingAccumulatedDepreciation += calc.closingAccumulatedDepreciation;
            summary.byType[type].closingNetBlock += calc.closingWDV;
        });
        summary.totals = Object.values(summary.byType).reduce((acc, curr) => {
            Object.keys(acc).forEach(key => { if (typeof acc[key] === 'number') acc[key] += curr[key]; });
            return acc;
        }, { ...initialTypeSummary });
        return summary;
    }, [companiesActCalculationResults]);

    const incomeTaxSummary = useMemo(() => {
        const summary = { byType: {}, totals: {} };
        const initialBlockSummary = {
            openingWDV: 0, additions: 0, saleValue: 0, wdvForDep: 0,
            depreciationForYear: 0, closingNetBlock: 0, shortTermCapitalGainLoss: 0
        };
        incomeTaxCalculationResults.forEach(({block, details}) => {
            const type = block.blockType || 'unclassified';
            if (!summary.byType[type]) {
                summary.byType[type] = {
                    ...initialBlockSummary,
                    name: INCOME_TAX_BLOCKS[type]?.name || 'Unclassified Block',
                    internalName: type,
                };
            }
            const calc = details;
            summary.byType[type].openingWDV += calc.openingWDV;
            summary.byType[type].additions += calc.additions;
            summary.byType[type].saleValue += calc.saleValue;
            summary.byType[type].wdvForDep += calc.wdvForDep;
            summary.byType[type].depreciationForYear += calc.depreciationForYear;
            summary.byType[type].closingNetBlock += calc.closingWDV;
            summary.byType[type].shortTermCapitalGainLoss += calc.shortTermCapitalGainLoss;
        });
        summary.totals = Object.values(summary.byType).reduce((acc, curr) => {
            Object.keys(acc).forEach(key => { if (typeof acc[key] === 'number') acc[key] += curr[key]; });
            return acc;
        }, { ...initialBlockSummary });
        return summary;
    }, [incomeTaxCalculationResults]);

    // 3. Third, the filtered items which depend on the calculations
    const filteredItems = useMemo(() => {
        const results = act === 'companies' ? companiesActCalculationResults : incomeTaxCalculationResults;
        if (act === 'companies') {
            if (filterType) {
                return results.filter(result => result.asset.assetType === filterType);
            }
            if (searchTerm) {
                const lowercasedFilter = searchTerm.toLowerCase();
                return results.filter(result =>
                    result.asset.name.toLowerCase().includes(lowercasedFilter)
                );
            }
        } else if (act === 'income_tax') {
            if (filterType) {
                return results.filter(result => result.block.blockType === filterType);
            }
            if (blockSearchTerm) {
                const lowercasedFilter = blockSearchTerm.toLowerCase();
                return results.filter(result =>
                    result.block.name.toLowerCase().includes(lowercasedFilter)
                );
            }
        }
        return results;
    }, [act, companiesActCalculationResults, incomeTaxCalculationResults, filterType, searchTerm, blockSearchTerm]);

    // 4. Finally, all other hooks that depend on the above variables
    const selectedAssetCount = useMemo(() => assets.filter(a => a.isSelected).length, [assets]);
    const selectedBlockCount = useMemo(() => assetBlocks.filter(b => b.isSelected).length, [assetBlocks]);

    const selectedAssetData = useMemo(() => {
        if (act === 'companies') {
            return companiesActCalculationResults.find(r => r.id === selectedAssetId);
        }
        return null;
    }, [selectedAssetId, companiesActCalculationResults, act]);

    const selectedBlockData = useMemo(() => {
        if (act === 'income_tax') {
            return incomeTaxCalculationResults.find(r => r.id === selectedBlockId);
        }
        return null;
    }, [selectedBlockId, incomeTaxCalculationResults, act]);

    const allVisibleAssetsSelected = useMemo(() => {
        if (act !== 'companies') return false;
        const visibleIds = new Set(filteredItems.map(r => r.id));
        if(visibleIds.size === 0) return false;
        const visibleAssets = assets.filter(a => visibleIds.has(a.id));
        if(visibleAssets.length === 0) return false;
        return visibleAssets.every(a => a.isSelected);
    }, [assets, filteredItems, act]);

    const allVisibleBlocksSelected = useMemo(() => {
        if (act !== 'income_tax') return false;
        const visibleIds = new Set(filteredItems.map(r => r.id));
        if(visibleIds.size === 0) return false;
        const visibleBlocks = assetBlocks.filter(b => visibleIds.has(b.id));
        if(visibleBlocks.length === 0) return false;
        return visibleBlocks.every(b => b.isSelected);
    }, [assetBlocks, filteredItems, act]);

    const handleSelectAllAssets = useCallback(() => {
        const visibleIds = new Set(filteredItems.map(a => a.id));
        const shouldSelectAll = !allVisibleAssetsSelected;
        setAssets(prevAssets =>
            prevAssets.map(asset => {
                if (visibleIds.has(asset.id)) {
                    return {...asset, isSelected: shouldSelectAll};
                }
                return asset;
            })
        );
    }, [filteredItems, allVisibleAssetsSelected]);

    const handleSelectAllBlocks = useCallback(() => {
        const visibleIds = new Set(filteredItems.map(b => b.id));
        const shouldSelectAll = !allVisibleBlocksSelected;
        setAssetBlocks(prevBlocks => prevBlocks.map(block => {
            if (visibleIds.has(block.id)) {
                return {...block, isSelected: shouldSelectAll};
            }
            return block;
        }));
    }, [filteredItems, allVisibleBlocksSelected]);

    return (
        <div className={`${theme} transition-colors duration-500`}>
            <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} topic={helpTopic} />
            
            {isLoading ? (
                <div className="bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 min-h-screen flex justify-center items-center">
                    <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">Loading Calculator...</div>
                </div>
            ) : !act ? (
                <ActSelectionScreen onSelectCalculationMode={handleSelectAct} theme={theme} toggleTheme={toggleTheme} openHelpModal={openHelpModal} />
            ) : (
                <>
                    <PrintStyles />
                    <style>{`
                        @keyframes fade-in {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        .animate-fade-in {
                            animation: fade-in 0.5s ease-in-out;
                        }
                        /* --- NEW ANIMATION --- */
                        @keyframes fade-in-slide-up {
                            from { 
                                opacity: 0;
                                transform: translateY(20px);
                            }
                            to { 
                                opacity: 1;
                                transform: translateY(0);
                            }
                        }
                        .animate-new-item {
                            animation: fade-in-slide-up 0.5s ease-out;
                        }
                    `}</style>
                    
                    <div className="print-only">
                        <PrintLayout
                            calculationResults={act === 'companies' ? companiesActCalculationResults : incomeTaxCalculationResults}
                            method={method}
                            FY_LABEL={FY_LABEL}
                            summaryData={act === 'companies' ? companiesActSummary : incomeTaxSummary}
                            act={act}
                        />
                    </div>

                    <div className="no-print bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 min-h-screen text-slate-800 font-sans transition-colors duration-500">
                        <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
                            <Toast
                                message={toast.message}
                                show={toast.show}
                                onClose={hideToast}
                                onUndo={toast.onUndo}
                            />
                            <ConfirmationModal
                                isOpen={isAssetDeleteModalOpen || isBlockDeleteModalOpen}
                                onClose={() => { setIsAssetDeleteModalOpen(false); setIsBlockDeleteModalOpen(false); }}
                                onConfirm={act === 'companies' ? handleConfirmAssetDelete : handleConfirmBlockDelete}
                                title="Confirm Deletion"
                                confirmText="Confirm Deletion"
                            >
                                Are you sure you want to delete the selected {act === 'companies' ? selectedAssetCount : selectedBlockCount} item(s)? This action cannot be undone.
                            </ConfirmationModal>

                            <header className="mb-8 relative flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-center sm:text-left">
                                    <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100">
                                        {act === 'deferred_tax' ? 'Deferred Tax Analysis' : 'Depreciation Calculator'}
                                    </h1>
                                    <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">
                                        {act === 'companies' ? 'As per Companies Act, 2013' : act === 'income_tax' ? 'As per Income Tax Act, 1961' : `For FY ${FY_LABEL}`}
                                    </p>
                                </div>
                                <div className="mt-4 sm:mt-0 flex justify-center sm:justify-end gap-2">
                                    <button onClick={() => setAct(null)} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-sm hover:bg-gray-700 transition-colors text-sm">Change Tool</button>
                                    <button onClick={() => openHelpModal(act === 'companies' ? 'companiesAct' : act === 'income_tax' ? 'incomeTaxAct' : 'deferredTax')} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm">Help</button>
                                    <button onClick={toggleTheme} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-lg shadow-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-sm">
                                        {theme === 'light' ? 'Dark' : 'Light'}
                                    </button>
                                </div>
                            </header>

                            {act !== 'deferred_tax' && (isLoading ? <SkeletonSummary /> : <SummaryReport summaryData={act === 'companies' ? companiesActSummary : incomeTaxSummary} onFilterChange={setFilterType} showToast={showToast} filterType={filterType} theme={theme} act={act} setAct={handleSelectAct} />)}
                            
                            <div key={act} className="animate-fade-in">
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
                                    />
                                  ) : (
                                    <DeferredTaxCalculator
                                      companiesActDepreciation={companiesActSummary.totals.depreciationForYear}
                                      incomeTaxDepreciation={incomeTaxSummary.totals.depreciationForYear}
                                      openingCompaniesActWdv={companiesActSummary.totals.openingNetBlock}
                                      openingIncomeTaxWdv={incomeTaxSummary.totals.openingWDV}
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
