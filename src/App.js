import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip as ChartTooltip, ResponsiveContainer, Legend } from 'recharts';
// PapaParse is loaded via a script tag in the App component to avoid import errors.

// --- Config & Data ---
const FINANCIAL_YEAR_CONFIG = {
  start: '2024-04-01',
  end: '2025-03-31',
  label: '2024-25',
};
const { start: FY_START_DATE, end: FY_END_DATE, label: FY_LABEL } = FINANCIAL_YEAR_CONFIG;

// Companies Act Data
const SCHEDULE_II_WDV_RATES = {
  general_machinery: 0.1810, computers_laptops: 0.6316, servers_networks: 0.3930,
  general_furniture: 0.2589, office_equipment: 0.4507, motor_cars: 0.2589,
  buildings_rcc: 0.0487, buildings_non_rcc: 0.0950,
};
const SCHEDULE_II_SLM_USEFUL_LIFE = {
  general_machinery: 15, computers_laptops: 3, servers_networks: 6,
  general_furniture: 10, office_equipment: 5, motor_cars: 8,
  buildings_rcc: 60, buildings_non_rcc: 30,
};

// Income Tax Act Data (Updated)
const INCOME_TAX_BLOCKS = {
  'building_residential': { name: 'Building (Residential)', rate: 0.05 },
  'building_general': { name: 'Building (Office, Factory, etc.)', rate: 0.10 },
  'furniture_fittings': { name: 'Furniture & Fittings', rate: 0.10 },
  'machinery_general': { name: 'Plant & Machinery (General)', rate: 0.15 },
  'motor_cars': { name: 'Motor Cars', rate: 0.15 },
  'ships_vessels': { name: 'Ships, Vessels', rate: 0.20 },
  'intangibles': { name: 'Intangible Assets (Patents, Copyrights)', rate: 0.25 },
  'motor_buses_lorries_taxis_hire': { name: 'Motor Buses, Lorries & Taxis (Hiring Business)', rate: 0.30 },
  'building_temporary': { name: 'Buildings (Temporary Structures)', rate: 0.40 },
  'aircraft': { name: 'Aircraft', rate: 0.40 },
  'computers_software': { name: 'Computers & Software', rate: 0.40 },
  'energy_saving_devices': { name: 'Energy Saving Devices', rate: 0.40 },
  'pollution_control': { name: 'Pollution Control Equipment', rate: 0.40 },
  'books_professional': { name: 'Books (for Professionals)', rate: 0.40 },
  'books_annual': { name: 'Books (Annual Publications)', rate: 1.00 },
};

// List of block types statutorily excluded from additional depreciation
const EXCLUDED_BLOCK_TYPES_FOR_ADDITIONAL_DEP = [
    'ships_vessels',
    'motor_cars',
    'motor_buses_lorries_taxis_hire',
    'aircraft',
    'intangibles', 
    'building_residential',
    'building_general',
    'building_temporary',
];


// --- Helper & Hook Functions ---
const round = (value) => parseFloat(value.toFixed(2));

const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

const getDaysInFY = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const fyEndYear = month >= 3 ? year + 1 : year;
    return isLeapYear(fyEndYear) ? 366 : 365;
};

const isValidDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0,0,0,0);
    const earliestDate = new Date('1900-01-01');
    return date instanceof Date && !isNaN(date) && date <= today && date >= earliestDate;
}

const getDaysUsed = (purchaseDateStr, disposalDateStr = null) => {
    const currentFYStart = new Date(FY_START_DATE);
    const financialYearEnd = new Date(`${FY_END_DATE}T23:59:59`);

    let effectiveStartDate = currentFYStart;
    if (purchaseDateStr) {
        const purchaseDate = new Date(purchaseDateStr);
        purchaseDate.setHours(0, 0, 0, 0);
        if (purchaseDate > effectiveStartDate) {
            effectiveStartDate = purchaseDate;
        }
    }

    let effectiveEndDate = financialYearEnd;
    if (disposalDateStr) {
        const disposalDate = new Date(disposalDateStr);
        if (disposalDate >= currentFYStart && disposalDate <= financialYearEnd) {
             if(disposalDate < effectiveEndDate) {
                effectiveEndDate = disposalDate;
            }
        }
    }
    
    const daysInYear = getDaysInFY(effectiveStartDate);
    if (effectiveEndDate < effectiveStartDate) return { daysUsed: 0, daysInYear };
    
    const diffTime = effectiveEndDate - effectiveStartDate;
    if (diffTime < 0) return { daysUsed: 0, daysInYear };
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return { daysUsed: Math.max(0, diffDays), daysInYear };
};

const formatCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

// --- Standalone Calculation Logic ---
const calculateCompaniesActDepreciation = (asset, method) => {
    const financialData = asset.companiesAct;
    const openingGrossBlock = Math.max(0, parseFloat(financialData.openingGrossBlock) || 0);
    const openingAccumulatedDepreciation = Math.max(0, parseFloat(financialData.openingAccumulatedDepreciation) || 0);
    const residualValue = Math.max(0, parseFloat(financialData.residualValue) || 0);
    const grossBlockAdditions = asset.additions.reduce((sum, add) => sum + (Math.max(0, parseFloat(add.cost)) || 0), 0);
    
    // IMPROVEMENT 1: If no opening block or additions, sale value is irrelevant.
    const hasValueAtStart = openingGrossBlock > 0 || grossBlockAdditions > 0;
    const saleValue = hasValueAtStart ? Math.max(0, parseFloat(asset.saleValue) || 0) : 0;
    
    if (!hasValueAtStart) {
        return { depreciationForYear: 0, closingWDV: 0, workings: [], profitOrLoss: 0, openingGrossBlock: 0, grossBlockAdditions: 0, disposalsCost: 0, closingGrossBlock: 0, openingAccumulatedDepreciation: 0, closingAccumulatedDepreciation: 0, openingWDV: 0, saleValue: 0 };
    }

    const isDisposed = !!asset.disposalDate;
    const additionsBeforeDisposal = asset.additions.filter(add => !isDisposed || (add.date && new Date(add.date) <= new Date(asset.disposalDate)));
    const totalAdditionsCostBeforeDisposal = additionsBeforeDisposal.reduce((sum, add) => sum + (Math.max(0, parseFloat(add.cost)) || 0), 0);
    
    let depreciationForYear = 0;
    let workings = [];
    let calculatedRate = 0;
    let usefulLife = 0;
    const openingWDV = round(openingGrossBlock - openingAccumulatedDepreciation);

    if (method === 'SLM') {
        usefulLife = SCHEDULE_II_SLM_USEFUL_LIFE[asset.assetType] || 0;
        if (usefulLife > 0) {
            const depreciableBase = round(openingGrossBlock - residualValue);
            const maxAllowableDepOpening = Math.max(0, round(openingWDV - residualValue));
            if (depreciableBase > 0 && maxAllowableDepOpening > 0) {
                const { daysUsed, daysInYear } = getDaysUsed(asset.purchaseDate, asset.disposalDate); 
                const annualDep = round(depreciableBase / usefulLife);
                const depOnOpening = round(Math.min(annualDep * (daysUsed / daysInYear), maxAllowableDepOpening));
                depreciationForYear += depOnOpening;
                workings.push({ description: `Dep on Opening Cost`, calculation: `((${formatCurrency(openingGrossBlock)} - ${formatCurrency(residualValue)}) / ${usefulLife} yrs) × ${daysUsed}/${daysInYear} days`, amount: depOnOpening });
            }
        }
    } else { // WDV
        calculatedRate = SCHEDULE_II_WDV_RATES[asset.assetType] || 0;
        if (openingWDV > 0 && calculatedRate > 0) {
            const { daysUsed, daysInYear } = getDaysUsed(asset.purchaseDate, asset.disposalDate);
            const depOnOpening = round(Math.min((openingWDV * calculatedRate) * (daysUsed / daysInYear), openingWDV));
            depreciationForYear += depOnOpening;
            workings.push({ description: `Dep on Opening WDV`, calculation: `(${formatCurrency(openingWDV)} × ${(calculatedRate * 100).toFixed(2)}%) × ${daysUsed}/${daysInYear} days`, amount: depOnOpening });
        }
    }

    additionsBeforeDisposal.forEach((addition, index) => {
        const addCost = Math.max(0, parseFloat(addition.cost) || 0);
        if (addCost <= 0 || !addition.date) return;
        const { daysUsed, daysInYear: daysInAddYear } = getDaysUsed(addition.date, asset.disposalDate);
        let proRataDep = 0;
        if (method === 'SLM' && usefulLife > 0) {
            const addResidualValue = Math.max(0, parseFloat(addition.residualValue) || 0);
            const addDepreciable = round(addCost - addResidualValue);
            if (addDepreciable > 0) {
                proRataDep = round((addDepreciable / usefulLife) * (daysUsed / daysInAddYear));
                workings.push({ description: `Dep on Addition #${index + 1}`, calculation: `((${formatCurrency(addCost)} - ${formatCurrency(addResidualValue)}) / ${usefulLife} years) × ${daysUsed}/${daysInAddYear} days`, amount: proRataDep });
            }
        } else if (method === 'WDV' && calculatedRate > 0) {
            proRataDep = round((addCost * calculatedRate) * (daysUsed / daysInAddYear));
            workings.push({ description: `Dep on Addition #${index + 1}`, calculation: `(${formatCurrency(addCost)} × ${(calculatedRate * 100).toFixed(2)}%) × ${daysUsed}/${daysInAddYear} days`, amount: proRataDep });
        }
        depreciationForYear += proRataDep;
    });
    depreciationForYear = round(depreciationForYear);

    let profitOrLoss = 0;
    let finalClosingWDV, finalClosingGrossBlock, finalClosingAccumDep, disposalsCost = 0;

    if(isDisposed) {
        const costOfDisposedAsset = round(openingGrossBlock + totalAdditionsCostBeforeDisposal);
        const wdvOnSaleDate = round(costOfDisposedAsset - (openingAccumulatedDepreciation + depreciationForYear));
        profitOrLoss = round(saleValue - wdvOnSaleDate);
        disposalsCost = costOfDisposedAsset;
        finalClosingGrossBlock = round(openingGrossBlock + grossBlockAdditions - disposalsCost);
        finalClosingAccumDep = 0;
        finalClosingWDV = 0;
    } else {
        finalClosingGrossBlock = round(openingGrossBlock + grossBlockAdditions);
        finalClosingAccumDep = round(openingAccumulatedDepreciation + depreciationForYear);
        finalClosingWDV = round(finalClosingGrossBlock - finalClosingAccumDep);
    }

    return { depreciationForYear, closingWDV: finalClosingWDV, workings, profitOrLoss, openingGrossBlock, grossBlockAdditions, disposalsCost, closingGrossBlock: finalClosingGrossBlock, openingAccumulatedDepreciation, closingAccumulatedDepreciation: finalClosingAccumDep, openingWDV, saleValue };
};

const calculateIncomeTaxDepreciation = (block) => {
    const openingWDV = Math.max(0, parseFloat(block.openingWDV) || 0);
    const blockCeased = block.blockCeased || false;
    const eligibleForAdditional = block.eligibleForAdditional || false;
    const rate = block.rate || 0;

    let additionsFullRate = 0;
    let additionsHalfRate = 0;
    
    block.additions.forEach(add => {
        const cost = Math.max(0, parseFloat(add.cost) || 0);
        if(cost > 0 && add.date) {
            const { daysUsed } = getDaysUsed(add.date, null);
            if (daysUsed >= 180) {
                additionsFullRate += cost;
            } else {
                additionsHalfRate += cost;
            }
        }
    });
    additionsFullRate = round(additionsFullRate);
    additionsHalfRate = round(additionsHalfRate);
    const totalAdditions = round(additionsFullRate + additionsHalfRate);

    // IMPROVEMENT 1: If no opening block or additions, sale value is irrelevant.
    const hasValueAtStart = openingWDV > 0 || totalAdditions > 0;
    const saleProceeds = hasValueAtStart ? Math.max(0, parseFloat(block.saleProceeds) || 0) : 0;

    const wdvBeforeDep = round(openingWDV + totalAdditions - saleProceeds);

    let depreciationForYear = 0;
    let additionalDepreciation = 0;
    let shortTermCapitalGainLoss = 0;
    let closingWDV = 0;
    let workings = [];
    
    if (!block.blockType) {
        return { openingWDV, additions: totalAdditions, saleValue: saleProceeds, wdvForDep: wdvBeforeDep, depreciationForYear: 0, closingWDV: wdvBeforeDep, shortTermCapitalGainLoss: 0, workings: [{description: "Select a block type to calculate depreciation.", calculation: "", amount: 0}] };
    }


    if (blockCeased) {
        shortTermCapitalGainLoss = round(saleProceeds - (openingWDV + totalAdditions));
        closingWDV = 0;
        workings.push({
            description: shortTermCapitalGainLoss >= 0 ? 'Short Term Capital Gain' : 'Short Term Capital Loss',
            calculation: `${formatCurrency(saleProceeds)} - (${formatCurrency(openingWDV)} + ${formatCurrency(totalAdditions)})`,
            amount: shortTermCapitalGainLoss
        });
    } else if (wdvBeforeDep > 0) {
        const depOnAdditionsFull = round(additionsFullRate * rate);
        const depOnAdditionsHalf = round(additionsHalfRate * (rate / 2));
        const wdvForOpeningDep = round(wdvBeforeDep - additionsFullRate - additionsHalfRate);
        const depOnOpening = round(Math.max(0, wdvForOpeningDep * rate));

        depreciationForYear = round(depOnOpening + depOnAdditionsFull + depOnAdditionsHalf);
        
        if (depOnOpening > 0) workings.push({ description: 'Dep on Opening WDV balance', calculation: `${formatCurrency(wdvForOpeningDep)} × ${rate * 100}%`, amount: depOnOpening });
        if (depOnAdditionsFull > 0) workings.push({ description: 'Dep on Additions (>= 180 days)', calculation: `${formatCurrency(additionsFullRate)} × ${rate * 100}%`, amount: depOnAdditionsFull });
        if (depOnAdditionsHalf > 0) workings.push({ description: 'Dep on Additions (< 180 days)', calculation: `${formatCurrency(additionsHalfRate)} × ${(rate / 2) * 100}%`, amount: depOnAdditionsHalf });

        // Additional Depreciation Calculation
        if (eligibleForAdditional) {
            const addDepOnFull = round(additionsFullRate * 0.20);
            const addDepOnHalf = round(additionsHalfRate * 0.10);
            additionalDepreciation = round(addDepOnFull + addDepOnHalf);
            if(additionalDepreciation > 0) {
                 workings.push({ description: 'Additional Depreciation', calculation: `On new additions`, amount: additionalDepreciation });
                 depreciationForYear = round(depreciationForYear + additionalDepreciation);
            }
        }

        closingWDV = round(wdvBeforeDep - depreciationForYear);
    } else {
        shortTermCapitalGainLoss = round(wdvBeforeDep); // This will be negative, indicating a capital gain
        closingWDV = 0;
        workings.push({
            description: 'Short Term Capital Gain (Sale > WDV)',
            calculation: `(${formatCurrency(openingWDV)} + ${formatCurrency(totalAdditions)}) - ${formatCurrency(saleProceeds)}`,
            amount: -shortTermCapitalGainLoss
        });
    }
    
    return {
        openingWDV,
        additions: totalAdditions,
        saleValue: saleProceeds,
        wdvForDep: wdvBeforeDep,
        depreciationForYear,
        closingWDV,
        shortTermCapitalGainLoss,
        workings
    };
};


// --- UI Components ---

// IMPROVEMENT 3: Enhanced Tooltip with proper ARIA attributes
const Tooltip = ({ text, children, id }) => (
    <div className="relative flex items-center group">
        {React.cloneElement(children, { 'aria-describedby': id })}
        <div
            id={id}
            role="tooltip"
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 bg-slate-800 text-white text-xs rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-300 pointer-events-none z-20 shadow-lg"
        >
            {text}
            <svg className="absolute text-slate-800 h-2 w-full left-0 bottom-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,255 127.5,127.5 255,255"/></svg>
        </div>
    </div>
);

const AssetCard = ({ asset, details, onSelect, onEdit }) => {
    return (
        <div
            onClick={onEdit}
            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-white/30 dark:border-slate-700/50 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
        >
            <div className="p-5 sm:p-4">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center flex-shrink-0 mr-4">
                        <input type="checkbox" checked={asset.isSelected} onChange={(e) => onSelect(asset.id, e.target.checked)} onClick={(e) => e.stopPropagation()} className="h-6 w-6 rounded border-slate-400 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer" aria-label={`Select asset ${asset.name || 'Unnamed Asset'}`}/>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-lg md:text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{asset.name || 'Unnamed Asset'}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{asset.assetType ? asset.assetType.replace(/_/g, ' ') : 'No type selected'}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-xl md:text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(details.depreciationForYear)}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Depreciation</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const BlockCard = ({ block, details, onSelect, onEdit }) => {
    return (
        <div
            onClick={onEdit}
            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-white/30 dark:border-slate-700/50 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
        >
            <div className="p-5 sm:p-4">
                <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center flex-shrink-0 mr-4">
                        <input type="checkbox" checked={block.isSelected} onChange={(e) => onSelect(block.id, e.target.checked)} onClick={(e) => e.stopPropagation()} className="h-6 w-6 rounded border-slate-400 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer" aria-label={`Select block ${block.name || 'Unnamed Block'}`}/>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-lg md:text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{block.name || 'Unnamed Block'}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{block.rate ? `Rate: ${block.rate * 100}%` : 'No type selected'}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-xl md:text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(details.depreciationForYear)}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Depreciation</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AssetDetailPanel = ({ asset, details, updateAsset, method, act, onClose }) => {
    const [newAddition, setNewAddition] = useState({ date: '', cost: '', residualValue: '' });
    const nameInputRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    const financialData = asset.companiesAct;
    const isInvalidAccumDep = (parseFloat(financialData.openingAccumulatedDepreciation) || 0) > (parseFloat(financialData.openingGrossBlock) || 0);
    const isInvalidResidual = (parseFloat(financialData.residualValue) || 0) > (parseFloat(financialData.openingGrossBlock) || 0);
    const isGrossBlockEmpty = financialData.openingGrossBlock === '' && asset.additions.length === 0;
    const isAccumDepEmpty = financialData.openingAccumulatedDepreciation === '' && financialData.openingGrossBlock !== '';
    const isPurchaseDateInvalid = asset.purchaseDate && !isValidDate(asset.purchaseDate);
    const isAdditionDateInvalid = newAddition.date && !isValidDate(newAddition.date);
    const isResidualValueEmptyForSLM = method === 'SLM' && financialData.residualValue === '';
    const isDisposalDateInvalid = asset.disposalDate && asset.purchaseDate && new Date(asset.disposalDate) < new Date(asset.purchaseDate);
    
    // IMPROVEMENT 1: Logic to disable sale value input
    const canHaveSaleValue = (parseFloat(financialData.openingGrossBlock) || 0) > 0 || asset.additions.length > 0;

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); 
    };
    
    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        let sanitizedValue = value;
        if (type === 'number') {
            if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                 sanitizedValue = value;
            } else {
                 return;
            }
        }
        
        const updatedAsset = { ...asset };
        if (['openingGrossBlock', 'openingAccumulatedDepreciation', 'residualValue'].includes(name)) {
            updatedAsset.companiesAct = { ...updatedAsset.companiesAct, [name]: sanitizedValue };
        } else {
            updatedAsset[name] = sanitizedValue;
        }
        updateAsset(asset.id, updatedAsset);
    };

    const handleAddAddition = () => {
        if (!newAddition.date || !newAddition.cost || isAdditionDateInvalid) return;
        updateAsset(asset.id, { ...asset, additions: [...asset.additions, newAddition] });
        setNewAddition({ date: '', cost: '', residualValue: '' });
    };

    const removeAddition = (index) => {
        updateAsset(asset.id, { ...asset, additions: asset.additions.filter((_, i) => i !== index) });
    };
    
    const inputFieldClass = "w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300";
    const isDisposed = !!asset.disposalDate;
    
    return (
        <div className="fixed inset-0 z-40 flex justify-end">
            <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose}></div>
            <div className={`relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl w-full md:max-w-2xl h-full shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex-shrink-0 p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                        <input ref={nameInputRef} type="text" value={asset.name} placeholder="Enter Asset Name" onChange={(e) => updateAsset(asset.id, {...asset, name: e.target.value})} className="text-2xl font-bold text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none focus:ring-0 border-none p-0 w-full placeholder-slate-400 dark:placeholder-slate-500"/>
                        <button onClick={handleClose} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label="Close panel">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
                <div className="flex-grow p-6 overflow-y-auto">
                    <div className="space-y-6">
                        <div>
                            <label htmlFor={`assetType-${asset.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Asset Type</label>
                            <select id={`assetType-${asset.id}`} name="assetType" value={asset.assetType} onChange={handleInputChange} className={`${inputFieldClass} text-sm ${!asset.assetType ? 'border-amber-500 ring-1 ring-amber-500' : ''}`}>
                                <option value="" disabled>-- Select Asset Type --</option>
                                {Object.entries(SCHEDULE_II_WDV_RATES).map(([key, val]) => (
                                    <option key={key} value={key}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                                ))}
                            </select>
                            {!asset.assetType && <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Select an asset type to calculate depreciation.</p>}
                            {method === 'SLM' && asset.assetType && (
                                <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                    Useful Life: <span className="font-semibold">{SCHEDULE_II_SLM_USEFUL_LIFE[asset.assetType]} years</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
                            <div>
                                <label htmlFor={`openingGrossBlock-${asset.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    <Tooltip text="The total cost of the asset at the beginning of the financial year." id={`tooltip-ogb-${asset.id}`}>
                                        <span tabIndex="0">Opening Gross Block (₹) <span className="text-slate-400">(?)</span></span>
                                    </Tooltip>
                                </label>
                                <input id={`openingGrossBlock-${asset.id}`} type="number" name="openingGrossBlock" value={financialData.openingGrossBlock} onChange={handleInputChange} className={`${inputFieldClass} ${isGrossBlockEmpty ? 'border-red-500 ring-1 ring-red-500' : ''}`} placeholder="e.g. 500000" />
                                {isGrossBlockEmpty && <p className="text-xs text-red-600 mt-1">Gross Block is required if no Additions.</p>}
                            </div>
                            <div>
                                <label htmlFor={`openingAccumulatedDepreciation-${asset.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    <Tooltip text="Total depreciation charged on the asset up to the beginning of the financial year." id={`tooltip-oad-${asset.id}`}>
                                        <span tabIndex="0">Opening Accum. Dep. (₹) <span className="text-slate-400">(?)</span></span>
                                    </Tooltip>
                                </label>
                                <input id={`openingAccumulatedDepreciation-${asset.id}`} type="number" name="openingAccumulatedDepreciation" value={financialData.openingAccumulatedDepreciation} onChange={handleInputChange} className={`${inputFieldClass} ${isInvalidAccumDep ? 'border-red-500 ring-1 ring-red-500' : ''} ${isAccumDepEmpty ? 'border-amber-500 ring-1 ring-amber-500' : ''}`} placeholder="e.g. 50000" />
                                {isInvalidAccumDep && <p className="text-xs text-red-600 mt-1">Accum. Dep. cannot exceed Gross Block.</p>}
                                {isAccumDepEmpty && <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Required field. Enter 0 if none.</p>}
                            </div>

                            {method === 'SLM' && (
                                <div>
                                    <label htmlFor={`residualValue-${asset.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                       <Tooltip text="The estimated value of the asset at the end of its useful life. Enter 0 if none." id={`tooltip-rv-${asset.id}`}>
                                         <span tabIndex="0">Residual Value (₹) <span className="text-slate-400">(?)</span></span>
                                       </Tooltip>
                                   </label>
                                   <input id={`residualValue-${asset.id}`} type="number" name="residualValue" value={financialData.residualValue} onChange={handleInputChange} className={`${inputFieldClass} ${isInvalidResidual ? 'border-red-500 ring-1 ring-red-500' : ''}`} placeholder="e.g. 25000" />
                                   {isInvalidResidual && <p className="text-xs text-red-600 mt-1">Residual value cannot exceed Gross Block.</p>}
                                   {isResidualValueEmptyForSLM && <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Required for SLM. Defaults to 0 if empty.</p>}
                                </div>
                            )}
                        </div>
                        
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h4 className="text-md font-semibold text-slate-800 dark:text-slate-100 mb-3">Additions During The Year</h4>
                             {asset.additions.map((add, index) => {
                                 const isExistingAdditionInvalid = !isValidDate(add.date);
                                 const residualText = (method === 'SLM' && (parseFloat(add.residualValue) || 0) > 0) ? ` (Residual: ${formatCurrency(add.residualValue)})` : '';
                                 return (
                                     <div key={index} className={`flex items-center gap-2 mb-2 p-2 rounded-md text-sm ${isExistingAdditionInvalid ? 'bg-red-100 dark:bg-red-900/30' : 'bg-indigo-50 dark:bg-indigo-900/30'}`}>
                                         <span className={`flex-grow ${isExistingAdditionInvalid ? 'text-red-800 dark:text-red-300' : 'text-indigo-800 dark:text-indigo-300'}`}>Purchased on {add.date ? new Date(add.date).toLocaleDateString('en-GB') : '??'} for {formatCurrency(add.cost)}{residualText} {isExistingAdditionInvalid && '(Invalid Date)'}</span>
                                        <button onClick={() => removeAddition(index)} className="p-1 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50" title="Remove Addition" aria-label={`Remove addition on ${add.date}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        </button>
                                     </div>
                                 );
                             })}
                            <div className="flex flex-col sm:flex-row items-center gap-2 mt-3">
                                <input type="date" aria-label="New addition date" value={newAddition.date} onChange={(e) => setNewAddition(p => ({...p, date: e.target.value}))} className={`${inputFieldClass} flex-1`} min={FY_START_DATE} max={asset.disposalDate || FY_END_DATE}/>
                                <input type="number" aria-label="New addition cost" value={newAddition.cost} onChange={(e) => setNewAddition(p => ({...p, cost: e.target.value}))} placeholder="Cost of Addition (₹)" className={`${inputFieldClass} flex-1`}/>
                                {method === 'SLM' && (
                                   <Tooltip text="Optional: Residual value for this specific addition. Defaults to 0 if empty." id={`tooltip-add-rv-${asset.id}`}>
                                    <input 
                                        type="number" 
                                        aria-label="New addition residual value"
                                        value={newAddition.residualValue} 
                                        onChange={(e) => setNewAddition(p => ({...p, residualValue: e.target.value}))} 
                                        placeholder="Residual Value (₹)" 
                                        className={`${inputFieldClass} flex-1`}
                                    />
                                   </Tooltip>
                                )}
                                <button onClick={handleAddAddition} disabled={!newAddition.date || !newAddition.cost || isAdditionDateInvalid} className="w-full sm:w-auto px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex-shrink-0 text-base shadow-md disabled:bg-indigo-400 disabled:cursor-not-allowed">Add</button>
                            </div>
                            {isAdditionDateInvalid && <p className="text-xs text-red-600 mt-1">Addition date is invalid.</p>}
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h4 className="text-md font-semibold text-slate-800 dark:text-slate-100 mb-3">Disposal / Sale</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                 <div>
                                    <label htmlFor={`purchaseDate-${asset.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                         <Tooltip text="The original date the asset was purchased. Required for accurate depreciation on opening balances and for disposals." id={`tooltip-pd-${asset.id}`}>
                                              <span tabIndex="0">Orig. Purchase Date <span className={`font-bold ${!asset.purchaseDate ? 'text-red-500' : 'text-slate-400'}`}>(?)</span></span>
                                         </Tooltip>
                                    </label>
                                    <input id={`purchaseDate-${asset.id}`} type="date" name="purchaseDate" value={asset.purchaseDate} onChange={handleInputChange} className={`${inputFieldClass} ${!asset.purchaseDate || isPurchaseDateInvalid ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                                    {!asset.purchaseDate && <p className="text-xs text-red-600 mt-1">Purchase date is required.</p>}
                                    {isPurchaseDateInvalid && <p className="text-xs text-red-600 mt-1">Purchase date is invalid.</p>}
                                 </div>
                                <div>
                                    <label htmlFor={`disposalDate-${asset.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Disposal Date</label>
                                    <input id={`disposalDate-${asset.id}`} type="date" name="disposalDate" value={asset.disposalDate} onChange={handleInputChange} className={`${inputFieldClass} ${isDisposalDateInvalid ? 'border-red-500 ring-1 ring-red-500' : ''}`} min={FY_START_DATE} max={FY_END_DATE} />
                                    {isDisposalDateInvalid && <p className="text-xs text-red-600 mt-1">Disposal date cannot be before purchase date.</p>}
                                </div>
                                <div>
                                    <label htmlFor={`saleValue-${asset.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        <Tooltip text="A sale value higher than the Written Down Value (WDV) will result in a profit, which may have tax implications and require verification." id={`tooltip-sv-${asset.id}`}>
                                            <span tabIndex="0">Sale Value (₹) <span className="text-slate-400">(?)</span></span>
                                        </Tooltip>
                                    </label>
                                    <input id={`saleValue-${asset.id}`} type="number" name="saleValue" value={asset.saleValue} onChange={handleInputChange} className={inputFieldClass} placeholder="e.g., 100000" disabled={!asset.disposalDate || !canHaveSaleValue}/>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h4 className="text-md font-semibold text-slate-800 dark:text-slate-100 mb-3">Calculation Workings</h4>
                            <div className="space-y-3">
                                {details.workings.length > 0 ? details.workings.map((item, index) => (
                                    <div key={index} className="flex justify-between items-start text-sm pb-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                                        <div className='pr-4'>
                                            <p className="text-slate-700 dark:text-slate-300">{item.description}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.calculation}</p>
                                            {item.note && <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1 italic">{item.note}</p>}
                                        </div>
                                        <p className="font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap">{formatCurrency(item.amount)}</p>
                                    </div>
                                )) : <p className="text-sm text-slate-500 dark:text-slate-400">Enter values to see calculation.</p>}
                            </div>
                            <hr className="my-4 border-slate-200 dark:border-slate-700" />
                            <div className="flex justify-between items-center text-md font-bold text-slate-800 dark:text-slate-100">
                                <p>Depreciation For The Year</p>
                                <p>{formatCurrency(details.depreciationForYear)}</p>
                            </div>
                             {isDisposed && (
                                 <div className={`mt-2 flex justify-between items-center text-md font-bold ${details.profitOrLoss >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                                    <p>{details.profitOrLoss >= 0 ? 'Profit on Sale' : 'Loss on Sale'}</p>
                                    <p>{formatCurrency(Math.abs(details.profitOrLoss))}</p>
                                 </div>
                             )}
                            <div className="mt-4 flex justify-between items-center text-md font-bold text-green-800 dark:text-green-300 bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                                <p>Closing Net Block</p>
                                <p>{formatCurrency(details.closingWDV)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

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

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, children, confirmText = "Confirm" }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md m-4 p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">{title}</h2>
                <div className="text-slate-600 dark:text-slate-300 mb-6">{children}</div>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors">{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

// --- START: Print Components ---
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
// --- END: Print Components ---


const SummaryReport = ({ summaryData, onFilterChange, showToast, filterType, theme, act, setAct }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    
    const chartData = useMemo(() => {
        const colors = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#f43f5e', '#64748b', '#d946ef', '#22c55e', '#f97316', '#84cc16'];
        return Object.values(summaryData.byType).map((typeData, index) => ({
            name: typeData.name,
            internalName: typeData.internalName,
            value: typeData.depreciationForYear,
            fill: colors[index % colors.length]
        })).filter(item => item.value > 0);
    }, [summaryData.byType]);
    
    const handleExport = () => {
       if (!window.Papa) {
           showToast("Export feature unavailable. Please check your internet connection and refresh.");
           return;
       }

       let header, rows, totalsRow;

       if (act === 'companies') {
           header = ["Asset Type", "Op. Gross Block", "Additions", "Disposals", "Cl. Gross Block", "Op. Accum. Dep.", "Dep. for Year", "Cl. Accum. Dep.", "Op. Net Block", "Cl. Net Block"];
           rows = Object.values(summaryData.byType).map(item => ([
                item.name, item.openingGrossBlock, item.additions, item.disposalsCost, item.closingGrossBlock,
                item.openingAccumulatedDepreciation, item.depreciationForYear, item.closingAccumulatedDepreciation,
                item.openingNetBlock, item.closingNetBlock
           ]));
           totalsRow = ["TOTAL", summaryData.totals.openingGrossBlock, summaryData.totals.additions, summaryData.totals.disposalsCost, summaryData.totals.closingGrossBlock, summaryData.totals.openingAccumulatedDepreciation, summaryData.totals.depreciationForYear, summaryData.totals.closingAccumulatedDepreciation, summaryData.totals.openingNetBlock, summaryData.totals.closingNetBlock];
       } else { // Income Tax
           header = ["Asset Block", "Opening WDV", "Additions", "Sale Proceeds", "WDV for Dep.", "Dep. for Year", "Closing WDV", "STCG/L"];
           rows = Object.values(summaryData.byType).map(item => ([
                item.name, item.openingWDV, item.additions, item.saleValue, item.wdvForDep, item.depreciationForYear, item.closingNetBlock, item.shortTermCapitalGainLoss
           ]));
           totalsRow = ["TOTAL", summaryData.totals.openingWDV, summaryData.totals.additions, summaryData.totals.saleValue, summaryData.totals.wdvForDep, summaryData.totals.depreciationForYear, summaryData.totals.closingNetBlock, summaryData.totals.shortTermCapitalGainLoss];
       }
       

       const csv = window.Papa.unparse({ fields: header, data: [...rows, totalsRow] });

       const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
       const link = document.createElement("a");
       const url = URL.createObjectURL(blob);
       link.setAttribute("href", url);
       link.setAttribute("download", `Depreciation_Summary_${act}_FY${FY_LABEL}.csv`);
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
       showToast("CSV export started successfully!");
    };

    const handlePieClick = (data) => {
        if (data && data.internalName) {
            onFilterChange(data.internalName);
        }
    };

    const hasChartData = chartData.length > 0;
    const legendColor = theme === 'dark' ? '#f1f5f9' : '#334155';
    const tooltipStyle = {
        contentStyle: { 
            backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
            borderColor: theme === 'dark' ? '#334155' : '#cccccc',
            borderRadius: '0.75rem'
        },
        itemStyle: { color: legendColor },
        labelStyle: { color: legendColor }
    };

    return (
      <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-white/30 dark:border-slate-700/50 rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="p-4 md:p-6 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 flex justify-between items-center" onClick={() => setIsExpanded(!isExpanded)}>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Summary & Reporting</h2>
              <div className="flex items-center gap-4">
                  <button onClick={(e) => {e.stopPropagation(); window.print()}} className="px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-sm hover:bg-slate-700 transition-colors text-sm">Print</button>
                  <button onClick={(e) => {e.stopPropagation(); handleExport()}} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-sm">Export CSV</button>
                   <button onClick={(e) => {e.stopPropagation(); setAct(null)}} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-sm hover:bg-gray-700 transition-colors text-sm">Change Act</button>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 text-slate-400 dark:text-slate-500 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
          </div>
          {isExpanded && (
              <div id="summary-section-printable-content" className="p-4 md:p-6 border-t border-slate-200 dark:border-slate-700/50">
                  <div className={`grid grid-cols-1 ${hasChartData ? 'xl:grid-cols-3' : ''} gap-8`}>
                      <div className="xl:col-span-2">
                          <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200 mb-4">
                            {act === 'companies' ? 'Asset Type Summary Schedule' : 'Asset Block Summary (Income Tax)'}
                          </h3>
                          <div className="overflow-x-auto">
                            {act === 'companies' ? (
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-200/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 uppercase">
                                        <tr>
                                            <th className="p-2 rounded-tl-lg">Asset Type</th>
                                            <th className="p-2 text-right">Op. Gross Block</th>
                                            <th className="p-2 text-right">Additions</th>
                                            <th className="p-2 text-right">Disposals</th>
                                            <th className="p-2 text-right">Cl. Gross Block</th>
                                            <th className="p-2 text-right">Op. Accum. Dep.</th>
                                            <th className="p-2 text-right">Dep. for Year</th>
                                            <th className="p-2 text-right">Cl. Accum. Dep.</th>
                                            <th className="p-2 text-right">Op. Net Block</th>
                                            <th className="p-2 text-right rounded-tr-lg">Cl. Net Block</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.values(summaryData.byType).map(typeData => (
                                            <tr key={typeData.name} className={`border-b border-slate-200 dark:border-slate-700 transition-colors ${filterType && filterType === typeData.internalName ? 'bg-indigo-100/50 dark:bg-indigo-900/30' : ''}`}>
                                                <td className="p-2 font-medium text-slate-800 dark:text-slate-100">{typeData.name}</td>
                                                <td className="p-2 text-right text-slate-600 dark:text-slate-400">{formatCurrency(typeData.openingGrossBlock)}</td>
                                                <td className="p-2 text-right text-slate-600 dark:text-slate-400">{formatCurrency(typeData.additions)}</td>
                                                <td className="p-2 text-right text-slate-600 dark:text-slate-400">{formatCurrency(typeData.disposalsCost)}</td>
                                                <td className="p-2 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(typeData.closingGrossBlock)}</td>
                                                <td className="p-2 text-right text-slate-600 dark:text-slate-400">{formatCurrency(typeData.openingAccumulatedDepreciation)}</td>
                                                <td className="p-2 text-right text-blue-600 dark:text-blue-400 font-semibold">{formatCurrency(typeData.depreciationForYear)}</td>
                                                <td className="p-2 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(typeData.closingAccumulatedDepreciation)}</td>
                                                <td className="p-2 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(typeData.openingNetBlock)}</td>
                                                <td className="p-2 text-right font-semibold text-green-700 dark:text-green-500">{formatCurrency(typeData.closingNetBlock)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="font-bold bg-slate-200/50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100">
                                        <tr className="border-t-2 border-slate-400 dark:border-slate-500">
                                            <td className="p-2 rounded-bl-lg">TOTAL</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.openingGrossBlock)}</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.additions)}</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.disposalsCost)}</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.closingGrossBlock)}</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.openingAccumulatedDepreciation)}</td>
                                            <td className="p-2 text-right text-blue-700 dark:text-blue-400">{formatCurrency(summaryData.totals.depreciationForYear)}</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.closingAccumulatedDepreciation)}</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.openingNetBlock)}</td>
                                            <td className="p-2 text-right text-green-800 dark:text-green-400 rounded-br-lg">{formatCurrency(summaryData.totals.closingNetBlock)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            ) : (
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-200/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 uppercase">
                                        <tr>
                                            <th className="p-2 rounded-tl-lg">Asset Block</th>
                                            <th className="p-2 text-right">Opening WDV</th>
                                            <th className="p-2 text-right">Additions</th>
                                            <th className="p-2 text-right">Sale Proceeds</th>
                                            <th className="p-2 text-right">WDV for Dep.</th>
                                            <th className="p-2 text-right">Dep. for Year</th>
                                            <th className="p-2 text-right">Closing WDV</th>
                                            <th className="p-2 text-right rounded-tr-lg">STCG/(STCL)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.values(summaryData.byType).map(typeData => (
                                            <tr key={typeData.name} className={`border-b border-slate-200 dark:border-slate-700 transition-colors ${filterType && filterType === typeData.internalName ? 'bg-indigo-100/50 dark:bg-indigo-900/30' : ''}`}>
                                                <td className="p-2 font-medium text-slate-800 dark:text-slate-100">{typeData.name}</td>
                                                <td className="p-2 text-right text-slate-600 dark:text-slate-400">{formatCurrency(typeData.openingWDV)}</td>
                                                <td className="p-2 text-right text-slate-600 dark:text-slate-400">{formatCurrency(typeData.additions)}</td>
                                                <td className="p-2 text-right text-slate-600 dark:text-slate-400">{formatCurrency(typeData.saleValue)}</td>
                                                <td className="p-2 text-right font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(typeData.wdvForDep)}</td>
                                                <td className="p-2 text-right text-blue-600 dark:text-blue-400 font-semibold">{formatCurrency(typeData.depreciationForYear)}</td>
                                                <td className="p-2 text-right font-semibold text-green-700 dark:text-green-500">{formatCurrency(typeData.closingNetBlock)}</td>
                                                <td className={`p-2 text-right font-semibold ${typeData.shortTermCapitalGainLoss > 0 ? 'text-green-700 dark:text-green-500' : 'text-red-700 dark:text-red-500'}`}>{formatCurrency(typeData.shortTermCapitalGainLoss)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="font-bold bg-slate-200/50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100">
                                        <tr className="border-t-2 border-slate-400 dark:border-slate-500">
                                            <td className="p-2 rounded-bl-lg">TOTAL</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.openingWDV)}</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.additions)}</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.saleValue)}</td>
                                            <td className="p-2 text-right">{formatCurrency(summaryData.totals.wdvForDep)}</td>
                                            <td className="p-2 text-right text-blue-700 dark:text-blue-400">{formatCurrency(summaryData.totals.depreciationForYear)}</td>
                                            <td className="p-2 text-right text-green-800 dark:text-green-400">{formatCurrency(summaryData.totals.closingNetBlock)}</td>
                                            <td className={`p-2 text-right font-bold ${summaryData.totals.shortTermCapitalGainLoss > 0 ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}`}>{formatCurrency(summaryData.totals.shortTermCapitalGainLoss)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                          </div>
                           <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-900/30 border-l-4 border-blue-500 rounded-r-lg">
                               <p className="text-xs text-blue-800 dark:text-blue-200">
                                   <strong>Note:</strong> {act === 'companies' ? "The calculations above are based on a single-asset accounting model as per Ind AS 16." : "The calculations are based on Income Tax rules. Depreciation for additions is calculated at a half rate if used for less than 180 days."} For tax purposes, where depreciation is calculated on a 'block of assets', please aggregate the results from this schedule manually.
                               </p>
                           </div>
                      </div>
                       {hasChartData && (
                           <div className="min-h-[300px] chart-container flex flex-col items-center">
                              <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200 mb-4 text-center">Depreciation by Asset Type</h3>
                               <ResponsiveContainer width="100%" height={300}>
                                  <PieChart>
                                    <Pie 
                                      data={chartData} 
                                      dataKey="value" 
                                      nameKey="name" 
                                      cx="50%" 
                                      cy="50%" 
                                      outerRadius={90} 
                                      labelLine={false}
                                      onClick={handlePieClick}
                                      label={({ name, percent, x, y, fill }) => percent > 0.05 ? <text x={x} y={y} fill={"#fff"} textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">{`${(percent * 100).toFixed(0)}%`}</text> : null }
                                    >
                                       {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} stroke={filterType === entry.internalName ? '#fff' : entry.fill} strokeWidth={filterType === entry.internalName ? 3 : 1} className="cursor-pointer" />)}
                                    </Pie>
                                    <ChartTooltip {...tooltipStyle} />
                                    <Legend wrapperStyle={{fontSize: "12px", paddingTop: "20px", color: legendColor}}/>
                                  </PieChart>
                               </ResponsiveContainer>
                           </div>
                       )}
                  </div>
              </div>
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

const ActSelectionScreen = ({ onSelectCalculationMode, theme, toggleTheme }) => {
    // IMPROVEMENT 4: UI Consistency
    // The buttons here are intentionally different to signify distinct paths.
    // The consistency is applied *within* each calculator path.
    return (
        <div className={theme}>
            <div className="bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 min-h-screen text-slate-800 font-sans flex flex-col justify-center items-center p-4">
                 <div className="absolute top-4 right-4">
                    <button onClick={toggleTheme} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-lg shadow-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-sm">
                        {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
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
                   <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Assets</h2>
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
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Asset Blocks</h2>
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
   
    if (isLoading) {
        return (
             <div className={theme}>
                <div className="bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 min-h-screen flex justify-center items-center">
                    <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">Loading Calculator...</div>
                </div>
            </div>
        );
    }

    if (!act) {
        return <ActSelectionScreen onSelectCalculationMode={handleSelectAct} theme={theme} toggleTheme={toggleTheme} />;
    }

    return (
        <div className={theme}>
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
                        <div className="w-full flex justify-end mb-4 sm:absolute sm:top-0 sm:right-0 sm:mb-0">
                           <button onClick={toggleTheme} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-lg shadow-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-sm">
                                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
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
        </div>
    );
}

// IMPROVEMENT 5: New component for guided eligibility check
const AdditionalDepreciationModal = ({ isOpen, onClose, onConfirm, eligibilityData, setEligibilityData }) => {
    if (!isOpen) return null;

    const handleCheckboxChange = (e) => {
        const { name, checked } = e.target;
        setEligibilityData(prev => ({ ...prev, [name]: checked }));
    };

    const isEligible = eligibilityData.isNewPlantMachinery && eligibilityData.isManufacturing && eligibilityData.isNotExcluded;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg m-4">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Additional Depreciation Eligibility Checklist</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Confirm the following conditions as per Section 32(1)(iia) of the Income Tax Act.</p>
                </div>
                <div className="p-6 space-y-4">
                    <label className="flex items-start p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <input type="checkbox" name="isNewPlantMachinery" checked={eligibilityData.isNewPlantMachinery} onChange={handleCheckboxChange} className="h-5 w-5 mt-0.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <span className="ml-3 text-sm text-slate-700 dark:text-slate-300">The additions represent <strong className="font-semibold">new</strong> plant or machinery.</span>
                    </label>
                    <label className="flex items-start p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <input type="checkbox" name="isManufacturing" checked={eligibilityData.isManufacturing} onChange={handleCheckboxChange} className="h-5 w-5 mt-0.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <span className="ml-3 text-sm text-slate-700 dark:text-slate-300">The assessee is engaged in the business of <strong className="font-semibold">manufacture or production</strong> of any article or thing.</span>
                    </label>
                    <label className="flex items-start p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <input type="checkbox" name="isNotExcluded" checked={eligibilityData.isNotExcluded} onChange={handleCheckboxChange} className="h-5 w-5 mt-0.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                        <span className="ml-3 text-sm text-slate-700 dark:text-slate-300">The asset is <strong className="font-semibold">NOT</strong> a ship, aircraft, second-hand machinery, office appliance, or road transport vehicle.</span>
                    </label>
                </div>
                 <div className={`p-4 rounded-b-2xl ${isEligible ? 'bg-green-50 dark:bg-green-900/30' : 'bg-amber-50 dark:bg-amber-900/30'}`}>
                    <p className={`text-sm text-center font-medium ${isEligible ? 'text-green-800 dark:text-green-300' : 'text-amber-800 dark:text-amber-300'}`}>
                        {isEligible ? 'Based on your selections, the asset is eligible.' : 'All conditions must be met to claim additional depreciation.'}
                    </p>
                </div>
                <div className="flex justify-end gap-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                    <button onClick={() => onConfirm(isEligible)} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400" disabled={!isEligible}>Confirm Eligibility</button>
                </div>
            </div>
        </div>
    );
};

const BlockDetailPanel = ({ block, details, updateBlock, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [newAddition, setNewAddition] = useState({ date: '', cost: '' });
    
    // State for new modals
    const [isCessationModalOpen, setCessationModalOpen] = useState(false);
    const [isAdditionalDepModalOpen, setAdditionalDepModalOpen] = useState(false);
    const [tempEligibility, setTempEligibility] = useState(block.additionalDepEligibility || { isNewPlantMachinery: false, isManufacturing: false, isNotExcluded: false });

    // Check if the current block type is eligible for additional depreciation
    const isBlockTypeEligibleForAdditionalDep = block.blockType && !EXCLUDED_BLOCK_TYPES_FOR_ADDITIONAL_DEP.includes(block.blockType);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); 
    };
    
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        // IMPROVEMENT 2: Intercept blockCeased change to show modal
        if (name === 'blockCeased' && checked) {
            setCessationModalOpen(true);
            return; // Don't update state directly
        }

        let sanitizedValue = type === 'checkbox' ? checked : value;

        if (type === 'number') {
            if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                 sanitizedValue = value;
            } else {
                 return;
            }
        }
        
        let updatedBlock = { ...block, [name]: sanitizedValue };

        if (name === 'blockType') {
            const blockDetails = INCOME_TAX_BLOCKS[sanitizedValue];
            if (blockDetails) {
                updatedBlock.name = blockDetails.name;
                updatedBlock.rate = blockDetails.rate;
            }
            // If block type changes to an ineligible one, reset additional depreciation
            if (EXCLUDED_BLOCK_TYPES_FOR_ADDITIONAL_DEP.includes(sanitizedValue)) {
                updatedBlock.eligibleForAdditional = false;
                updatedBlock.additionalDepEligibility = { isNewPlantMachinery: false, isManufacturing: false, isNotExcluded: false };
            }
        }
        
        updateBlock(block.id, updatedBlock);
    };
    
    const handleConfirmCessation = () => {
        updateBlock(block.id, { ...block, blockCeased: true });
        setCessationModalOpen(false);
    };
    
    const handleConfirmAdditionalDep = (isEligible) => {
        updateBlock(block.id, { ...block, eligibleForAdditional: isEligible, additionalDepEligibility: tempEligibility });
        setAdditionalDepModalOpen(false);
    };

    const handleAddAddition = () => {
        if (!newAddition.date || !newAddition.cost) return;
        const updatedAdditions = [...(block.additions || []), newAddition];
        updateBlock(block.id, { ...block, additions: updatedAdditions });
        setNewAddition({ date: '', cost: '' });
    };

    const removeAddition = (index) => {
        const updatedAdditions = block.additions.filter((_, i) => i !== index);
        updateBlock(block.id, { ...block, additions: updatedAdditions });
    };
    
    // IMPROVEMENT 1: Logic to disable sale value input
    const canHaveSaleValue = (parseFloat(block.openingWDV) || 0) > 0 || (block.additions && block.additions.length > 0);
    
    const inputFieldClass = "w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300";
    
    return (
        <>
        <ConfirmationModal
            isOpen={isCessationModalOpen}
            onClose={() => setCessationModalOpen(false)}
            onConfirm={handleConfirmCessation}
            title="Confirm Block Cessation"
            confirmText="Confirm Cessation"
        >
            <p>By marking this block as 'ceased', you are confirming that all assets within this block have been sold or disposed of during the financial year.</p>
            <p className="mt-2 font-semibold">This action will calculate the final Short Term Capital Gain/Loss and set the closing WDV to zero.</p>
        </ConfirmationModal>
        
        <AdditionalDepreciationModal
            isOpen={isAdditionalDepModalOpen}
            onClose={() => setAdditionalDepModalOpen(false)}
            onConfirm={handleConfirmAdditionalDep}
            eligibilityData={tempEligibility}
            setEligibilityData={setTempEligibility}
        />

        <div className="fixed inset-0 z-40 flex justify-end">
            <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose}></div>
            <div className={`relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl w-full md:max-w-2xl h-full shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex-shrink-0 p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                        <input type="text" value={block.name} placeholder="Select a Block Type" onChange={(e) => updateBlock(block.id, {...block, name: e.target.value})} className="text-2xl font-bold text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none focus:ring-0 border-none p-0 w-full placeholder-slate-400 dark:placeholder-slate-500"/>
                        <button onClick={handleClose} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" aria-label="Close panel">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
                <div className="flex-grow p-6 overflow-y-auto">
                    <div className="space-y-6">
                        <div>
                            <label htmlFor={`blockType-${block.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Block Type</label>
                            <select id={`blockType-${block.id}`} name="blockType" value={block.blockType} onChange={handleInputChange} className={`${inputFieldClass} text-sm ${!block.blockType ? 'border-amber-500 ring-1 ring-amber-500' : ''}`}>
                                <option value="" disabled>-- Select Block Type --</option>
                                {Object.entries(INCOME_TAX_BLOCKS).map(([key, val]) => (
                                    <option key={key} value={key}>{val.name} ({val.rate * 100}%)</option>
                                ))}
                            </select>
                            {!block.blockType && <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Select a block type to calculate depreciation.</p>}
                        </div>

                        <div>
                            <label htmlFor={`openingWDV-${block.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Opening WDV (₹)</label>
                            <input id={`openingWDV-${block.id}`} type="number" name="openingWDV" value={block.openingWDV} onChange={handleInputChange} className={inputFieldClass} placeholder="e.g. 1000000" />
                        </div>
                        
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h4 className="text-md font-semibold text-slate-800 dark:text-slate-100 mb-3">Additions During The Year</h4>
                             {(block.additions || []).map((add, index) => (
                                 <div key={index} className="flex items-center gap-2 mb-2 p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-sm">
                                     <span className="flex-grow text-indigo-800 dark:text-indigo-300">Purchased on {add.date ? new Date(add.date).toLocaleDateString('en-GB') : '??'} for {formatCurrency(add.cost)}</span>
                                    <button onClick={() => removeAddition(index)} className="p-1 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50" title="Remove Addition" aria-label={`Remove addition on ${add.date}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                 </div>
                             ))}
                             <div className="flex flex-col sm:flex-row items-center gap-2 mt-3">
                                <input type="date" aria-label="New addition date" value={newAddition.date} onChange={(e) => setNewAddition(p => ({...p, date: e.target.value}))} className={`${inputFieldClass} flex-1`} min={FY_START_DATE} max={FY_END_DATE}/>
                                <input type="number" aria-label="New addition cost" value={newAddition.cost} onChange={(e) => setNewAddition(p => ({...p, cost: e.target.value}))} placeholder="Cost of Addition (₹)" className={`${inputFieldClass} flex-1`}/>
                                <button onClick={handleAddAddition} disabled={!newAddition.date || !newAddition.cost} className="w-full sm:w-auto px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex-shrink-0 text-base shadow-md disabled:bg-indigo-400 disabled:cursor-not-allowed">Add</button>
                            </div>
                            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h5 className="font-semibold text-slate-800 dark:text-slate-200">Additional Depreciation</h5>
                                        {!isBlockTypeEligibleForAdditionalDep && block.blockType ? (
                                            <p className="text-sm text-amber-600 dark:text-amber-500">
                                                Not applicable for this asset block type.
                                            </p>
                                        ) : (
                                            <p className={`text-sm ${block.eligibleForAdditional ? 'text-green-600' : 'text-slate-500'}`}>
                                                {block.eligibleForAdditional ? 'Eligibility confirmed' : 'Check eligibility for new additions'}
                                            </p>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => { setTempEligibility(block.additionalDepEligibility); setAdditionalDepModalOpen(true); }} 
                                        className="px-4 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed"
                                        disabled={!isBlockTypeEligibleForAdditionalDep}
                                        aria-disabled={!isBlockTypeEligibleForAdditionalDep}
                                    >
                                        Checklist
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h4 className="text-md font-semibold text-slate-800 dark:text-slate-100 mb-3">Disposals During The Year</h4>
                            <div>
                                <label htmlFor={`saleProceeds-${block.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Total Sale Proceeds (₹)</label>
                                <input id={`saleProceeds-${block.id}`} type="number" name="saleProceeds" value={block.saleProceeds} onChange={handleInputChange} className={inputFieldClass} placeholder="e.g., 150000" disabled={!canHaveSaleValue} />
                                {!canHaveSaleValue && block.saleProceeds && <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Sale proceeds are only applicable if there is an opening WDV or additions.</p>}
                            </div>
                            {parseFloat(block.saleProceeds) > 0 && (
                                <div className="mt-4 flex items-center">
                                    <input type="checkbox" id={`blockCeased-${block.id}`} name="blockCeased" checked={block.blockCeased} onChange={handleInputChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                                    <label htmlFor={`blockCeased-${block.id}`} className="ml-2 block text-sm text-slate-900 dark:text-slate-200">
                                        Block ceases to exist after this sale
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h4 className="text-md font-semibold text-slate-800 dark:text-slate-100 mb-3">Calculation Summary</h4>
                            <div className="space-y-3">
                                {details.workings.map((item, index) => (
                                    <div key={index} className="flex justify-between items-start text-sm pb-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                                        <div className='pr-4'>
                                            <p className="text-slate-700 dark:text-slate-300">{item.description}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.calculation}</p>
                                        </div>
                                        <p className="font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap">{formatCurrency(item.amount)}</p>
                                    </div>
                                ))}
                            </div>
                            <hr className="my-4 border-slate-200 dark:border-slate-700" />
                            <div className="flex justify-between items-center text-md font-bold text-slate-800 dark:text-slate-100">
                                <p>Depreciation For The Year</p>
                                <p>{formatCurrency(details.depreciationForYear)}</p>
                            </div>
                             {details.shortTermCapitalGainLoss !== 0 && (
                                 <div className={`mt-2 flex justify-between items-center text-md font-bold ${details.shortTermCapitalGainLoss >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                                    <p>{details.shortTermCapitalGainLoss >= 0 ? 'Short Term Capital Gain' : 'Short Term Capital Loss'}</p>
                                    <p>{formatCurrency(Math.abs(details.shortTermCapitalGainLoss))}</p>
                                 </div>
                             )}
                            <div className="mt-4 flex justify-between items-center text-md font-bold text-green-800 dark:text-green-300 bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                                <p>Closing WDV</p>
                                <p>{formatCurrency(details.closingWDV)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};
