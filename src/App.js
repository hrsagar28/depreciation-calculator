import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import HelpModal from './components/HelpModal';
import Tooltip from './components/Tooltip';
import { useDebounce } from './utils/helpers';
import AssetCard from './components/AssetCard';
import BlockCard from './components/BlockCard';
import { FY_LABEL, SCHEDULE_II_WDV_RATES, SCHEDULE_II_SLM_USEFUL_LIFE, INCOME_TAX_BLOCKS, EXCLUDED_BLOCK_TYPES_FOR_ADDITIONAL_DEP } from './config';
import AssetDetailPanel from './components/AssetDetailPanel';
import ConfirmationModal from './components/ConfirmationModal';
import AdditionalDepreciationModal from './components/AdditionalDepreciationModal';
import BlockDetailPanel from './components/BlockDetailPanel';
import PrintStyles from './components/PrintStyles';
import { calculateCompaniesActDepreciation, calculateIncomeTaxDepreciation } from './utils/depreciationCalculations';
import PrintSummaryTable from './components/PrintSummaryTable';
import PrintAssetDetail from './components/PrintAssetDetail';
import PrintLayout from './components/PrintLayout';
import SummaryReport from './components/SummaryReport';
import { PieChart, Pie, Cell, Tooltip as ChartTooltip, ResponsiveContainer, Legend } from 'recharts';
// PapaParse is loaded via a script tag in the App component to avoid import errors.


// --- UI Components ---

const SkeletonCard = () => (
    <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-white/30 dark:border-slate-700/50 rounded-2xl shadow-lg p-4 mb-4 animate-pulse">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="h-6 w-6 rounded bg-slate-200 dark:bg-slate-700"></div>
                <div className="space-y-2">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
            </div>
            <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
    </div>
);

const SkeletonSummary = () => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-8 animate-pulse">
        <div className="p-4 md:p-6 flex justify-between items-center">
            <div className="h-8 w-1/3 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
        </div>
        <div className="p-4 md:p-6 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded"></div>
                    ))}
                </div>
                <div className="flex justify-center items-center">
                    <div className="h-48 w-48 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                </div>
            </div>
        </div>
    </div>

);


const Toast = ({ message, show, onClose, onUndo }) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000); // Increased time to allow for Undo
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    return (
        <div className={`fixed bottom-5 right-5 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out z-50 flex items-center justify-between gap-4 ${show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <span>{message}</span>
            {onUndo && (
                <button onClick={onUndo} className="font-bold uppercase text-sm text-indigo-300 hover:text-indigo-200">Undo</button>
            )}
        </div>
    );
};



const EmptyState = ({ addAsset, act }) => (
    <div className="text-center p-8 md:p-16 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-slate-700/50">
        <svg className="mx-auto h-24 w-24 text-slate-400 dark:text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="mt-4 text-2xl font-bold text-slate-700 dark:text-slate-200">Your Asset Register is Empty</h3>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Get started by adding your first {act === 'companies' ? 'asset' : 'block'} to calculate depreciation.</p>
        <div className="mt-6">
            <button
                onClick={addAsset}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                <svg className="-ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add First {act === 'companies' ? 'Asset' : 'Block'}
            </button>
        </div>
    </div>
);

const ActSelectionScreen = ({ onSelectCalculationMode, theme, toggleTheme, openHelpModal }) => {
    return (
        <div className={theme}>
            <div className="bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 min-h-screen text-slate-800 font-sans flex flex-col justify-center items-center p-4">
                 <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => openHelpModal('introduction')} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm">Help</button>
                    <button onClick={toggleTheme} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-lg shadow-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-sm">
                        {theme === 'light' ? 'Dark' : 'Light'}
                    </button>
                </div>
                <div className="text-center mb-12">
                     <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100">Depreciation Calculator</h1>
                     <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">For the Financial Year {FY_LABEL}</p>
                </div>
                <div className="w-full max-w-4xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-white/30 dark:border-slate-700/50 rounded-2xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100 mb-8">Choose Calculation Standard</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Companies Act */}
                        <div className="flex flex-col">
                            <button onClick={() => onSelectCalculationMode('companies')} className="p-6 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 flex flex-col items-center justify-center text-center h-full">
                                <svg className="h-12 w-12 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h6m-6 4h6m-6 4h6" /></svg>
                                <h3 className="text-xl font-bold">Companies Act, 2013</h3>
                                <p className="text-sm mt-1 opacity-80">Calculate on individual assets using SLM or WDV.</p>
                            </button>
                        </div>
                        {/* Income Tax Act */}
                        <div className="flex flex-col">
                           <button onClick={() => onSelectCalculationMode('income_tax')} className="p-6 bg-teal-600 text-white rounded-xl shadow-lg hover:bg-teal-700 transition-all duration-300 transform hover:scale-105 flex flex-col items-center justify-center text-center h-full">
                                <svg className="h-12 w-12 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                <h3 className="text-xl font-bold">Income Tax Act, 1961</h3>
                                <p className="text-sm mt-1 opacity-80">Calculate on block of assets using WDV.</p>
                            </button>
                        </div>
                    </div>
                     <div className="text-center mt-8">
                        <button onClick={() => openHelpModal('generalTerms')} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                            Confused by the terms? Click here for a glossary.
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- START: Automated Test Component ---
const AutomatedTests = ({ isVisible, onClose }) => {
    const [testResults, setTestResults] = useState([]);

    const testCases = useMemo(() => [
        // Companies Act - WDV
        { id: 'CA-WDV-1', description: 'WDV - Basic, Full Year', act: 'companies', method: 'WDV', input: { assetType: 'general_machinery', purchaseDate: '2023-04-01', companiesAct: { openingGrossBlock: 100000, openingAccumulatedDepreciation: 10000, residualValue: 0 }, additions: [], disposalDate: null, saleValue: 0 }, expected: { depreciationForYear: 16290, closingWDV: 73710 } },
        { id: 'CA-WDV-2', description: 'WDV - Pro-rata on Addition (>180 days)', act: 'companies', method: 'WDV', input: { assetType: 'general_machinery', purchaseDate: '2023-04-01', companiesAct: { openingGrossBlock: 0, openingAccumulatedDepreciation: 0, residualValue: 0 }, additions: [{ date: '2024-05-01', cost: 50000 }], disposalDate: null, saleValue: 0 }, expected: { depreciationForYear: 8306.16, closingWDV: 41693.84 } },
        // Companies Act - SLM
        { id: 'CA-SLM-1', description: 'SLM - Basic, Full Year', act: 'companies', method: 'SLM', input: { assetType: 'general_machinery', purchaseDate: '2023-04-01', companiesAct: { openingGrossBlock: 150000, openingAccumulatedDepreciation: 10000, residualValue: 15000 }, additions: [], disposalDate: null, saleValue: 0 }, expected: { depreciationForYear: 9000, closingWDV: 131000 } },
        { id: 'CA-SLM-2', description: 'SLM - Disposal with Profit', act: 'companies', method: 'SLM', input: { assetType: 'computers_laptops', purchaseDate: '2023-04-01', companiesAct: { openingGrossBlock: 60000, openingAccumulatedDepreciation: 20000, residualValue: 0 }, additions: [], disposalDate: '2024-09-30', saleValue: 50000 }, expected: { depreciationForYear: 10027.40, profitOrLoss: 20027.40, closingWDV: 0 } },
        // Income Tax Act
        { id: 'IT-1', description: 'IT - Addition > 180 days', act: 'income_tax', input: { blockType: 'computers_software', rate: 0.40, openingWDV: 100000, additions: [{ date: '2024-06-01', cost: 50000 }], saleProceeds: 0, blockCeased: false, eligibleForAdditional: false }, expected: { depreciationForYear: 60000, closingWDV: 90000 } },
        { id: 'IT-2', description: 'IT - Addition < 180 days', act: 'income_tax', input: { blockType: 'computers_software', rate: 0.40, openingWDV: 100000, additions: [{ date: '2024-12-01', cost: 50000 }], saleProceeds: 0, blockCeased: false, eligibleForAdditional: false }, expected: { depreciationForYear: 50000, closingWDV: 100000 } },
        { id: 'IT-3', description: 'IT - Additional Depreciation', act: 'income_tax', input: { blockType: 'machinery_general', rate: 0.15, openingWDV: 200000, additions: [{ date: '2024-07-01', cost: 100000 }], saleProceeds: 0, blockCeased: false, eligibleForAdditional: true }, expected: { depreciationForYear: 65000, closingWDV: 235000 } },
        { id: 'IT-4', description: 'IT - Short Term Capital Gain', act: 'income_tax', input: { blockType: 'furniture_fittings', rate: 0.10, openingWDV: 80000, additions: [], saleProceeds: 100000, blockCeased: false, eligibleForAdditional: false }, expected: { depreciationForYear: 0, shortTermCapitalGainLoss: -20000, closingWDV: 0 } },
        { id: 'IT-5', description: 'IT - Block Ceased with Loss', act: 'income_tax', input: { blockType: 'motor_cars', rate: 0.15, openingWDV: 500000, additions: [], saleProceeds: 400000, blockCeased: true, eligibleForAdditional: false }, expected: { depreciationForYear: 0, shortTermCapitalGainLoss: -100000, closingWDV: 0 } },
    ], []);

    const runTests = useCallback(() => {
        const results = testCases.map(test => {
            let actual;
            if (test.act === 'companies') {
                actual = calculateCompaniesActDepreciation(test.input, test.method);
            } else {
                actual = calculateIncomeTaxDepreciation(test.input);
            }

            let pass = true;
            const mismatches = [];
            for (const key in test.expected) {
                if (round(actual[key]) !== round(test.expected[key])) {
                    pass = false;
                    mismatches.push({ key, expected: test.expected[key], actual: actual[key] });
                }
            }

            return { ...test, status: pass ? 'pass' : 'fail', actual, mismatches };
        });
        setTestResults(results);
    }, [testCases]);

    useEffect(() => {
        if (isVisible) {
            runTests();
        }
    }, [isVisible, runTests]);

    if (!isVisible) return null;

    const passedCount = testResults.filter(r => r.status === 'pass').length;
    const failedCount = testResults.filter(r => r.status === 'fail').length;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
                <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Automated Calculation Tests</h2>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label="Close tests">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <div className="flex gap-4">
                        <span className={`px-3 py-1 text-sm font-bold rounded-full ${failedCount === 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                            {passedCount} / {testResults.length} Passed
                        </span>
                    </div>
                    <button onClick={runTests} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition-colors text-sm">
                        Re-run Tests
                    </button>
                </div>
                <div className="flex-grow p-4 overflow-y-auto">
                    <div className="space-y-3">
                        {testResults.map(test => (
                            <div key={test.id} className={`p-3 rounded-lg border ${test.status === 'pass' ? 'bg-green-50/50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-red-50/50 border-red-200 dark:bg-red-900/20 dark:border-red-800'}`}>
                                <div className="flex items-center justify-between">
                                    <p className="font-medium text-slate-800 dark:text-slate-200">{test.description}</p>
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full uppercase ${test.status === 'pass' ? 'bg-green-200 text-green-800 dark:bg-green-500' : 'bg-red-200 text-red-800 dark:bg-red-500'}`}>{test.status}</span>
                                </div>
                                {test.status === 'fail' && (
                                    <div className="mt-2 p-2 bg-white dark:bg-slate-800 rounded text-xs space-y-1">
                                        {test.mismatches.map(m => (
                                            <div key={m.key}>
                                                <span className="font-bold">{m.key}:</span>
                                                <span className="text-red-600 dark:text-red-400"> Expected {formatCurrency(m.expected)}, Got {formatCurrency(m.actual)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
// --- END: Automated Test Component ---

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
    const [isTestRunnerVisible, setIsTestRunnerVisible] = useState(false);
    const [toast, setToast] = useState({ message: '', show: false, onUndo: null });
    const [filterType, setFilterType] = useState(null);
    const [selectedAssetId, setSelectedAssetId] = useState(null);
    const [selectedBlockId, setSelectedBlockId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [blockSearchTerm, setBlockSearchTerm] = useState('');
    
    // NEW STATE for Help Modal
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [helpTopic, setHelpTopic] = useState('introduction');

    // Check for test mode using URL query parameter
    const isTestMode = useMemo(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('mode') === 'test';
        }
        return false;
    }, []);

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
                assets: stateToSave.assets.map(({ isNew, ...rest }) => rest),
                assetBlocks: stateToSave.assetBlocks.map(({ isNew, ...rest }) => rest),
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

    const calculationResults = useMemo(() => {
        if (act === 'companies') {
            return assets.map(asset => ({
                id: asset.id,
                asset,
                details: calculateCompaniesActDepreciation(asset, method)
            }));
        }
        if (act === 'income_tax') {
            return assetBlocks.map(block => ({
                id: block.id,
                block,
                details: calculateIncomeTaxDepreciation(block)
            }));
        }
        return [];
    }, [assets, assetBlocks, method, act]);

    const summaryData = useMemo(() => {
        const summary = { byType: {} };

        if (act === 'companies') {
            const initialTypeSummary = {
                openingGrossBlock: 0, additions: 0, disposalsCost: 0, closingGrossBlock: 0,
                openingAccumulatedDepreciation: 0, openingNetBlock: 0, depreciationForYear: 0,
                closingAccumulatedDepreciation: 0, closingNetBlock: 0
            };
            calculationResults.forEach(({asset, details}) => {
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
        } else { // Income Tax Summary
            const initialBlockSummary = {
                openingWDV: 0, additions: 0, saleValue: 0, wdvForDep: 0,
                depreciationForYear: 0, closingNetBlock: 0, shortTermCapitalGainLoss: 0
            };
            calculationResults.forEach(({block, details}) => {
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
        }

        return summary;
    }, [calculationResults, act]);

    const filteredItems = useMemo(() => {
        let results = calculationResults;
        if (act === 'companies') {
            if (filterType) {
                results = results.filter(result => result.asset.assetType === filterType);
            }
            if (searchTerm) {
                const lowercasedFilter = searchTerm.toLowerCase();
                results = results.filter(result =>
                    result.asset.name.toLowerCase().includes(lowercasedFilter)
                );
            }
        } else if (act === 'income_tax') {
            if (filterType) {
                results = results.filter(result => result.block.blockType === filterType);
            }
            if (blockSearchTerm) {
                const lowercasedFilter = blockSearchTerm.toLowerCase();
                results = results.filter(result =>
                    result.block.name.toLowerCase().includes(lowercasedFilter)
                );
            }
        }
        return results;
    }, [calculationResults, filterType, searchTerm, blockSearchTerm, act]);

    const selectedAssetCount = useMemo(() => assets.filter(a => a.isSelected).length, [assets]);
    const selectedBlockCount = useMemo(() => assetBlocks.filter(b => b.isSelected).length, [assetBlocks]);

    const selectedAssetData = useMemo(() => {
        if (act === 'companies') {
            return calculationResults.find(r => r.id === selectedAssetId);
        }
        return null;
    }, [selectedAssetId, calculationResults, act]);

    const selectedBlockData = useMemo(() => {
        if (act === 'income_tax') {
            return calculationResults.find(r => r.id === selectedBlockId);
        }
        return null;
    }, [selectedBlockId, calculationResults, act]);

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

    const renderCompaniesActContent = () => (
        <>
            <div className="max-w-lg mx-auto mb-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg p-2 rounded-xl flex space-x-2 border border-white/30 dark:border-slate-700/50 shadow-sm">
                <button onClick={() => handleMethodChange('WDV')} className={`w-1/2 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${method === 'WDV' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}>Written Down Value (WDV)</button>
                <button onClick={() => handleMethodChange('SLM')} className={`w-1/2 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${method === 'SLM' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}>Straight-Line Method (SLM)</button>
            </div>
            <main>
                <div className="mb-4">
                   <div className="flex items-center gap-2 mb-4">
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Assets</h2>
                        <button onClick={() => openHelpModal('companiesAct')} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.546-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                   </div>
                    {selectedAssetCount > 0 && (
                        <div className="flex items-center gap-4 mb-4">
                            <button onClick={handleSelectAllAssets} className="px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-sm hover:bg-slate-700 transition-colors text-sm">{allVisibleAssetsSelected ? 'Deselect All' : 'Select All'}</button>
                            <button onClick={handleDeleteAssetRequest} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-sm hover:bg-red-700 transition-colors text-sm">Delete ({selectedAssetCount})</button>
                        </div>
                    )}
                   <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:max-w-md">
                             <input type="text" placeholder="Search assets by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border-2 border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition"/>
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        {filterType && !isLoading && (
                            <button onClick={() => setFilterType(null)} className="px-3 py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors flex items-center gap-1">
                                <span>Filtering by: {filterType.replace(/_/g, ' ')}</span>
                                <span className="font-bold">&times;</span>
                            </button>
                        )}
                   </div>
                </div>
                {assets.length === 0 ? <EmptyState addAsset={addAsset} act={act} /> : <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredItems.map((result) => <AssetCard key={result.id} asset={result.asset} details={result.details} onSelect={handleSelectAsset} onEdit={() => setSelectedAssetId(result.id)} />)}</div>}
            </main>
            {!isLoading && <button onClick={addAsset} className="fixed bottom-6 right-6 md:bottom-8 md:right-8 h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center" title="Add New Asset" aria-label="Add new asset"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>}
            {selectedAssetData && <AssetDetailPanel key={selectedAssetData.id} asset={selectedAssetData.asset} details={selectedAssetData.details} updateAsset={updateAsset} method={method} act={act} onClose={() => setSelectedAssetId(null)} />}
        </>
    );

    const renderIncomeTaxContent = () => (
        <main>
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Asset Blocks</h2>
                     <button onClick={() => openHelpModal('incomeTaxAct')} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.546-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                </div>
                {selectedBlockCount > 0 && (
                    <div className="flex items-center gap-4 mb-4">
                        <button onClick={handleSelectAllBlocks} className="px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-sm hover:bg-slate-700 transition-colors text-sm">{allVisibleBlocksSelected ? 'Deselect All' : 'Select All'}</button>
                        <button onClick={handleDeleteBlockRequest} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-sm hover:bg-red-700 transition-colors text-sm">Delete ({selectedBlockCount})</button>
                    </div>
                )}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:max-w-md">
                        <input type="text" placeholder="Search blocks by name..." value={blockSearchTerm} onChange={(e) => setBlockSearchTerm(e.target.value)} className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border-2 border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition"/>
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    {filterType && !isLoading && (
                        <button onClick={() => setFilterType(null)} className="px-3 py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 text-sm font-semibold rounded-lg shadow-sm hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors flex items-center gap-1">
                            <span>Filtering by: {(INCOME_TAX_BLOCKS[filterType]?.name || filterType).replace(/_/g, ' ')}</span>
                            <span className="font-bold">&times;</span>
                        </button>
                    )}
                </div>
            </div>
            {assetBlocks.length === 0 ? (
                <EmptyState addAsset={addBlock} act={act} />
            ) : (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.map(result => (
                        <BlockCard
                            key={result.id}
                            block={result.block}
                            details={result.details}
                            onSelect={handleSelectBlock}
                            onEdit={() => setSelectedBlockId(result.id)}
                        />
                    ))}
                </div>
            )}
            {!isLoading && <button onClick={addBlock} className="fixed bottom-6 right-6 md:bottom-8 md:right-8 h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center" title="Add New Block" aria-label="Add new block"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>}
            {selectedBlockData && <BlockDetailPanel key={selectedBlockData.id} block={selectedBlockData.block} details={selectedBlockData.details} updateBlock={updateBlock} onClose={() => setSelectedBlockId(null)} />}
        </main>
    );

    // FIX: Restructured the main return block to ensure HelpModal is always available.
    return (
        <div className={theme}>
            {/* The HelpModal is now at the top level, so it can be opened from any screen. */}
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
                    <AutomatedTests isVisible={isTestRunnerVisible} onClose={() => setIsTestRunnerVisible(false)} />
                    
                    <div className="print-only">
                        <PrintLayout 
                            calculationResults={calculationResults}
                            method={method}
                            FY_LABEL={FY_LABEL}
                            summaryData={summaryData}
                            act={act}
                        />
                    </div>

                    <div className="no-print bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 min-h-screen text-slate-800 font-sans">
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

                            <header className="mb-8 relative flex flex-col sm:justify-center">
                                <div className="w-full flex justify-end mb-4 sm:absolute sm:top-0 sm:right-0 sm:mb-0 gap-2">
                                <button onClick={() => openHelpModal(act === 'companies' ? 'companiesAct' : 'incomeTaxAct')} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm">Help</button>
                                <button onClick={toggleTheme} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-lg shadow-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-sm">
                                        {theme === 'light' ? 'Dark' : 'Light'}
                                    </button>
                                </div>
                                <div className="text-center">
                                    <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100">Depreciation Calculator</h1>
                                    <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">
                                        {act === 'companies' ? 'As per Companies Act, 2013' : 'As per Income Tax Act, 1961'} for FY {FY_LABEL}
                                    </p>
                                </div>
                            </header>

                            {isLoading ? <SkeletonSummary /> : <SummaryReport summaryData={summaryData} onFilterChange={setFilterType} showToast={showToast} filterType={filterType} theme={theme} act={act} setAct={handleSelectAct} />}

                            {act === 'companies' ? renderCompaniesActContent() : renderIncomeTaxContent()}

                            {isTestMode && (
                                <footer className="text-center mt-12">
                                    <button onClick={() => setIsTestRunnerVisible(true)} className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                        Run Automated Calculation Tests
                                    </button>
                                </footer>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
