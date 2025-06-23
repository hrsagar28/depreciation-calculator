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

// --- Helper & Hook Functions ---
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
const calculateAssetDetails = (asset, method) => {
    const openingGrossBlock = Math.max(0, parseFloat(asset.openingGrossBlock) || 0);
    const openingAccumulatedDepreciation = Math.max(0, parseFloat(asset.openingAccumulatedDepreciation) || 0);
    const residualValue = Math.max(0, parseFloat(asset.residualValue) || 0);
    const saleValue = Math.max(0, parseFloat(asset.saleValue) || 0);
    
    if (openingGrossBlock <= 0 && asset.additions.length === 0) {
        return {
            rate: '0.00', usefulLife: 0, depreciationForYear: 0, closingAccumulatedDepreciation: 0,
            closingWDV: 0, workings: [{ description: 'Calculation Paused', calculation: 'Enter an Opening Gross Block or an Addition to begin.', amount: 0 }],
            profitOrLoss: 0, openingGrossBlock: 0, grossBlockAdditions: 0, disposalsCost: 0, closingGrossBlock: 0,
            openingAccumulatedDepreciation: 0
        };
    }
     if (openingAccumulatedDepreciation > openingGrossBlock) {
        const grossBlockAdditions = asset.additions.reduce((sum, add) => sum + (Math.max(0, parseFloat(add.cost)) || 0), 0);
        const closingGrossBlock = openingGrossBlock + grossBlockAdditions;
        return {
            rate: '0.00', usefulLife: 0, depreciationForYear: 0, 
            closingAccumulatedDepreciation: openingAccumulatedDepreciation, closingWDV: closingGrossBlock - openingAccumulatedDepreciation,
            workings: [], profitOrLoss: 0, openingGrossBlock, grossBlockAdditions: grossBlockAdditions, 
            disposalsCost: 0, closingGrossBlock, openingAccumulatedDepreciation: openingAccumulatedDepreciation
        };
    }

    const isDisposed = !!asset.disposalDate;
    const disposalDate = isDisposed ? new Date(asset.disposalDate) : null;
    
    const additionsBeforeDisposal = asset.additions.filter(add => {
        if (!isDisposed) return true;
        if (!add.date || !isValidDate(add.date)) return false;
        return new Date(add.date) <= disposalDate;
    });

    const totalAdditionsCostBeforeDisposal = additionsBeforeDisposal.reduce((sum, add) => sum + (Math.max(0, parseFloat(add.cost)) || 0), 0);
    const grossBlockAdditions = asset.additions.reduce((sum, add) => sum + (Math.max(0, parseFloat(add.cost)) || 0), 0);
    
    let depreciationForYear = 0;
    let workings = [];
    let calculatedRate = 0;
    let usefulLife = 0;

    if (method === 'SLM') {
        usefulLife = SCHEDULE_II_SLM_USEFUL_LIFE[asset.assetType] || 0;
        if (usefulLife > 0) {
            const depreciableBase = openingGrossBlock - residualValue;
            const wdvAtStart = openingGrossBlock - openingAccumulatedDepreciation;
            const maxAllowableDepOpening = Math.max(0, wdvAtStart - residualValue);

            if (depreciableBase > 0 && maxAllowableDepOpening > 0) {
                const { daysUsed, daysInYear } = getDaysUsed(asset.purchaseDate, asset.disposalDate); 
                const annualDep = depreciableBase / usefulLife;
                const depOnOpeningRaw = annualDep * (daysUsed / daysInYear);
                
                const depOnOpening = Math.min(depOnOpeningRaw, maxAllowableDepOpening);

                depreciationForYear += depOnOpening;
                const workingItem = {
                    description: `Dep on Opening Cost`,
                    calculation: `((${formatCurrency(openingGrossBlock)} - ${formatCurrency(residualValue)}) / ${usefulLife} yrs) × ${daysUsed}/${daysInYear} days`,
                    amount: depOnOpening
                };
                if (depOnOpening < depOnOpeningRaw) {
                    workingItem.note = 'Depreciation capped to not fall below residual value.';
                }
                workings.push(workingItem);
            }
        }
    } else { // WDV
        calculatedRate = SCHEDULE_II_WDV_RATES[asset.assetType] || 0;
        const openingWDV = openingGrossBlock - openingAccumulatedDepreciation;
        if (openingWDV > 0 && calculatedRate > 0) {
            const { daysUsed, daysInYear } = getDaysUsed(asset.purchaseDate, asset.disposalDate);
            const depOnOpening = (openingWDV * calculatedRate) * (daysUsed / daysInYear);

            const cappedDepOnOpening = Math.min(depOnOpening, openingWDV);

            depreciationForYear += cappedDepOnOpening;
            const workingItem = {
                description: `Dep on Opening WDV`,
                calculation: `(${formatCurrency(openingWDV)} × ${(calculatedRate * 100).toFixed(2)}%) × ${daysUsed}/${daysInYear} days`,
                amount: cappedDepOnOpening
            };
             if(cappedDepOnOpening < depOnOpening){
                 workingItem.note = `Depreciation capped at opening WDV.`;
            }
            workings.push(workingItem);
        }
    }

    additionsBeforeDisposal.forEach((addition, index) => {
        const addCost = Math.max(0, parseFloat(addition.cost) || 0);
        if (addCost <= 0 || !addition.date) return;
        const { daysUsed, daysInYear: daysInAddYear } = getDaysUsed(addition.date, asset.disposalDate);
        let proRataDep = 0;
        let calcString = '';

        if (method === 'SLM' && usefulLife > 0) {
            const addResidualValue = Math.max(0, parseFloat(addition.residualValue) || 0);
            const addDepreciable = addCost - addResidualValue;
            if (addDepreciable > 0) {
                const annualDepAddition = addDepreciable / usefulLife;
                proRataDep = annualDepAddition * (daysUsed / daysInAddYear);
                
                proRataDep = Math.min(proRataDep, addDepreciable);

                calcString = `((${formatCurrency(addCost)} - ${formatCurrency(addResidualValue)}) / ${usefulLife} years) × ${daysUsed}/${daysInAddYear} days`;
                const workingItem = {
                    description: `Dep on Addition #${index + 1}`,
                    calculation: calcString,
                    amount: proRataDep
                };
                if (proRataDep < (annualDepAddition * (daysUsed / daysInAddYear))) {
                     workingItem.note = 'Depreciation capped to not fall below its residual value.';
                }
                workings.push(workingItem);
            }
        } else if (method === 'WDV' && calculatedRate > 0) {
            proRataDep = (addCost * calculatedRate) * (daysUsed / daysInAddYear);
            proRataDep = Math.min(proRataDep, addCost);
            calcString = `(${formatCurrency(addCost)} × ${(calculatedRate * 100).toFixed(2)}%) × ${daysUsed}/${daysInAddYear} days`;
            workings.push({
                description: `Dep on Addition #${index + 1}`,
                calculation: calcString,
                amount: proRataDep
            });
        }
        depreciationForYear += proRataDep;
    });
    
    let profitOrLoss = 0;
    if(isDisposed) {
        const costOfDisposedAsset = openingGrossBlock + totalAdditionsCostBeforeDisposal;
        const wdvOnSaleDate = costOfDisposedAsset - (openingAccumulatedDepreciation + depreciationForYear);
        profitOrLoss = saleValue - wdvOnSaleDate;
    }
    
    const disposalsCost = isDisposed ? openingGrossBlock + totalAdditionsCostBeforeDisposal : 0;
    const closingGrossBlock = isDisposed ? 0 : openingGrossBlock + grossBlockAdditions;
    const closingAccumulatedDepreciation = isDisposed ? 0 : openingAccumulatedDepreciation + depreciationForYear;
    const closingWDV = isDisposed ? 0 : closingGrossBlock - closingAccumulatedDepreciation;

    return {
        rate: (calculatedRate * 100).toFixed(2), usefulLife, depreciationForYear, profitOrLoss,
        closingWDV, workings, openingGrossBlock, grossBlockAdditions, disposalsCost, closingGrossBlock,
        openingAccumulatedDepreciation, closingAccumulatedDepreciation,
    };
};


// --- UI Components ---
const Tooltip = ({ text, children }) => (
    <div className="relative flex items-center group" tabIndex="0">
        {children}
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 bg-slate-800 text-white text-xs rounded-lg py-2 px-3 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-300 pointer-events-none z-20 shadow-lg">
            {text}
            <svg className="absolute text-slate-800 h-2 w-full left-0 bottom-full transform rotate-180" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
        </div>
    </div>
);

const AssetCard = ({ asset, details, onSelect, onEdit, animationDelay }) => {
    return (
        <div style={{ transitionDelay: `${animationDelay}ms` }} className="group asset-card-enter">
            <div
                onClick={onEdit}
                className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-white/30 dark:border-slate-700/50 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
            >
                <div className="p-5 sm:p-4">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center flex-shrink-0 mr-4">
                            <input type="checkbox" checked={asset.isSelected} onChange={(e) => onSelect(asset.id, e.target.checked)} onClick={(e) => e.stopPropagation()} className="h-6 w-6 rounded border-slate-400 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"/>
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
        </div>
    );
};

const AssetDetailPanel = ({ asset, details, updateAsset, method, onClose }) => {
    const [newAddition, setNewAddition] = useState({ date: '', cost: '', residualValue: '' });
    const nameInputRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    const isInvalidAccumDep = (parseFloat(asset.openingAccumulatedDepreciation) || 0) > (parseFloat(asset.openingGrossBlock) || 0);
    const isInvalidResidual = (parseFloat(asset.residualValue) || 0) > (parseFloat(asset.openingGrossBlock) || 0);
    const isGrossBlockEmpty = asset.openingGrossBlock === '' && asset.additions.length === 0;
    const isAccumDepEmpty = asset.openingAccumulatedDepreciation === '' && asset.openingGrossBlock !== '';
    const isPurchaseDateInvalid = asset.purchaseDate && !isValidDate(asset.purchaseDate);
    const isAdditionDateInvalid = newAddition.date && !isValidDate(newAddition.date);
    const isResidualValueEmptyForSLM = method === 'SLM' && asset.residualValue === '';
    
    const isDisposalDateInvalid = asset.disposalDate && asset.purchaseDate && new Date(asset.disposalDate) < new Date(asset.purchaseDate);

    const isSaleValueHigh = useMemo(() => {
        if (!asset.disposalDate || details.profitOrLoss === undefined) return false;
        const saleValueNum = parseFloat(asset.saleValue) || 0;
        if (saleValueNum === 0) return false;
        const wdvOnSaleDate = saleValueNum - details.profitOrLoss;
        return wdvOnSaleDate > 0 && saleValueNum > wdvOnSaleDate;
    }, [asset.saleValue, asset.disposalDate, details.profitOrLoss]);

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
        updateAsset(asset.id, { ...asset, [name]: sanitizedValue });
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
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Asset Type</label>
                            <select name="assetType" value={asset.assetType} onChange={handleInputChange} className={`${inputFieldClass} text-sm ${!asset.assetType ? 'border-amber-500 ring-1 ring-amber-500' : ''}`}>
                                <option value="" disabled>-- Select Asset Type --</option>
                                <option value="general_machinery">General Plant & Machinery</option>
                                <option value="computers_laptops">Computers / Laptops</option>
                                <option value="servers_networks">Servers & Networks</option>
                                <option value="general_furniture">General Furniture</option>
                                <option value="office_equipment">Office Equipment</option>
                                <option value="motor_cars">Motor Cars</option>
                                <option value="buildings_rcc">Building - RCC</option>
                                <option value="buildings_non_rcc">Building - non-RCC</option>
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
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    <Tooltip text="The total cost of the asset at the beginning of the financial year.">
                                        Opening Gross Block (₹) <span className="text-slate-400">(?)</span>
                                    </Tooltip>
                                </label>
                                <input type="number" name="openingGrossBlock" value={asset.openingGrossBlock} onChange={handleInputChange} className={`${inputFieldClass} ${isGrossBlockEmpty ? 'border-red-500 ring-1 ring-red-500' : ''}`} placeholder="e.g. 500000" />
                                {isGrossBlockEmpty && <p className="text-xs text-red-600 mt-1">Gross Block is required if no Additions.</p>}
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    <Tooltip text="Total depreciation charged on the asset up to the beginning of the financial year.">
                                        Opening Accum. Dep. (₹) <span className="text-slate-400">(?)</span>
                                    </Tooltip>
                                </label>
                                <input type="number" name="openingAccumulatedDepreciation" value={asset.openingAccumulatedDepreciation} onChange={handleInputChange} className={`${inputFieldClass} ${isInvalidAccumDep ? 'border-red-500 ring-1 ring-red-500' : ''} ${isAccumDepEmpty ? 'border-amber-500 ring-1 ring-amber-500' : ''}`} placeholder="e.g. 50000" />
                                {isInvalidAccumDep && <p className="text-xs text-red-600 mt-1">Accum. Dep. cannot exceed Gross Block.</p>}
                                {isAccumDepEmpty && <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Required field. Enter 0 if none.</p>}
                            </div>
                            {method === 'SLM' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                       <Tooltip text="The estimated value of the asset at the end of its useful life. Enter 0 if none.">
                                         Residual Value (₹) <span className="text-slate-400">(?)</span>
                                       </Tooltip>
                                   </label>
                                   <input type="number" name="residualValue" value={asset.residualValue} onChange={handleInputChange} className={`${inputFieldClass} ${isInvalidResidual ? 'border-red-500 ring-1 ring-red-500' : ''}`} placeholder="e.g. 25000" />
                                   {isInvalidResidual && <p className="text-xs text-red-600 mt-1">Residual value cannot exceed Gross Block.</p>}
                                   {isResidualValueEmptyForSLM && <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Required for SLM. Defaults to 0 if empty.</p>}
                                </div>
                            )}
                        </div>
                        
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                            <h4 className="text-md font-semibold text-slate-800 dark:text-slate-100 mb-3">Additions During The Year</h4>
                             {asset.additions.map((add, index) => {
                                 const isExistingAdditionInvalid = !isValidDate(add.date);
                                 const residualText = (parseFloat(add.residualValue) || 0) > 0 ? ` (Residual: ${formatCurrency(add.residualValue)})` : '';
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
                                <input type="date" value={newAddition.date} onChange={(e) => setNewAddition(p => ({...p, date: e.target.value}))} className={`${inputFieldClass} flex-1`} min={FY_START_DATE} max={asset.disposalDate || FY_END_DATE}/>
                                <input type="number" value={newAddition.cost} onChange={(e) => setNewAddition(p => ({...p, cost: e.target.value}))} placeholder="Cost of Addition (₹)" className={`${inputFieldClass} flex-1`}/>
                                {method === 'SLM' && (
                                   <Tooltip text="Optional: Residual value for this specific addition. Defaults to 0 if empty.">
                                    <input 
                                        type="number" 
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
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                         <Tooltip text="The original date the asset was purchased. Required for accurate depreciation on opening balances and for disposals.">
                                              Orig. Purchase Date <span className={`font-bold ${!asset.purchaseDate ? 'text-red-500' : 'text-slate-400'}`}>(?)</span>
                                         </Tooltip>
                                    </label>
                                    <input type="date" name="purchaseDate" value={asset.purchaseDate} onChange={handleInputChange} className={`${inputFieldClass} ${!asset.purchaseDate || isPurchaseDateInvalid ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                                    {!asset.purchaseDate && <p className="text-xs text-red-600 mt-1">Purchase date is required.</p>}
                                    {isPurchaseDateInvalid && <p className="text-xs text-red-600 mt-1">Purchase date is invalid.</p>}
                                 </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Disposal Date</label>
                                    <input type="date" name="disposalDate" value={asset.disposalDate} onChange={handleInputChange} className={`${inputFieldClass} ${isDisposalDateInvalid ? 'border-red-500 ring-1 ring-red-500' : ''}`} min={FY_START_DATE} max={FY_END_DATE} />
                                    {isDisposalDateInvalid && <p className="text-xs text-red-600 mt-1">Disposal date cannot be before purchase date.</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        <Tooltip text="A sale value higher than the Written Down Value (WDV) will result in a profit, which may have tax implications and require verification.">
                                            Sale Value (₹) <span className="text-slate-400">(?)</span>
                                        </Tooltip>
                                    </label>
                                    <input type="number" name="saleValue" value={asset.saleValue} onChange={handleInputChange} className={inputFieldClass} placeholder="e.g., 100000" disabled={!asset.disposalDate}/>
                                    {isSaleValueHigh && <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Note: Sale value is higher than WDV.</p>}
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


const Toast = ({ message, show, onClose }) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    return (
        <div className={`fixed bottom-5 right-5 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out z-50 ${show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            {message}
        </div>
    );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md m-4 p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">{title}</h2>
                <div className="text-slate-600 dark:text-slate-300 mb-6">{children}</div>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors">Confirm Deletion</button>
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
const PrintSummaryTable = ({ summaryData }) => (
    <>
        <h2 className="print-section-title first">Asset Type Summary Schedule</h2>
        <table className="print-summary-table">
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
        </table>
        <p style={{ fontSize: '8pt', color: '#555', marginTop: '1rem' }}>
            <strong>Note:</strong> The calculations above are based on a single-asset accounting model as per Ind AS 16. For Income Tax purposes, where depreciation is calculated on a 'block of assets', please aggregate the results from this schedule manually.
        </p>
    </>
);
const PrintAssetDetail = ({ asset, details, method }) => (
    <div className="print-asset-detail">
        <h4>{asset.name || 'Unnamed Asset'}</h4>
        <div className="print-asset-header-grid">
            <div><strong>Asset Type:</strong> {asset.assetType ? asset.assetType.replace(/_/g, ' ') : 'N/A'}</div>
            <div><strong>Method:</strong> {method}</div>
            <div><strong>Orig. Purchase Date:</strong> {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('en-GB') : 'N/A'}</div>
            {asset.disposalDate && <div><strong>Disposal Date:</strong> {new Date(asset.disposalDate).toLocaleDateString('en-GB')}</div>}
            <div><strong>Opening Gross Block:</strong> {formatCurrency(details.openingGrossBlock)}</div>
            <div><strong>Opening Accum. Dep:</strong> {formatCurrency(details.openingAccumulatedDepreciation)}</div>
            {method === 'SLM' && <div><strong>Residual Value:</strong> {formatCurrency(asset.residualValue)}</div>}
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
            {asset.disposalDate && details.profitOrLoss !== 0 && (
                <div className={`summary-row ${details.profitOrLoss >= 0 ? 'profit' : 'loss'}`}>
                    <span>{details.profitOrLoss >= 0 ? 'Profit on Sale' : 'Loss on Sale'}</span>
                    <span>{formatCurrency(Math.abs(details.profitOrLoss))}</span>
                </div>
            )}
            <div className="summary-row net-block">
                <span>Closing Net Block</span>
                <span>{formatCurrency(details.closingWDV)}</span>
            </div>
        </div>
    </div>
);
const PrintLayout = ({ calculationResults, method, FY_LABEL, summaryData }) => (
    <div className="print-container">
        <header className="print-header">
            <h1>Depreciation Calculator</h1>
            <p>For the Financial Year {FY_LABEL}</p>
        </header>
        <section>
            <PrintSummaryTable summaryData={summaryData} />
        </section>
        {calculationResults.length > 0 && (
           <section>
                <h2 className="print-section-title">Asset Details</h2>
                {calculationResults.map(result => (
                    <PrintAssetDetail 
                        key={`print-${result.id}`}
                        asset={result.asset}
                        details={result.details}
                        method={method}
                    />
                ))}
           </section>
        )}
    </div>
);
// --- END: Print Components ---


const SummaryReport = ({ summaryData, onFilterChange, showToast, filterType, theme }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    
    const chartData = useMemo(() => {
        const colors = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#f43f5e', '#64748b'];
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
       const header = ["Asset Type", "Op. Gross Block", "Additions", "Disposals", "Cl. Gross Block", "Op. Accum. Dep.", "Dep. for Year", "Cl. Accum. Dep.", "Op. Net Block", "Cl. Net Block"];
       const rows = Object.values(summaryData.byType).map(item => ([
            item.name, item.openingGrossBlock, item.additions, item.disposalsCost, item.closingGrossBlock,
            item.openingAccumulatedDepreciation, item.depreciationForYear, item.closingAccumulatedDepreciation,
            item.openingNetBlock, item.closingNetBlock
       ]));
       
       const totalsRow = ["TOTAL", summaryData.totals.openingGrossBlock, summaryData.totals.additions, summaryData.totals.disposalsCost, summaryData.totals.closingGrossBlock, summaryData.totals.openingAccumulatedDepreciation, summaryData.totals.depreciationForYear, summaryData.totals.closingAccumulatedDepreciation, summaryData.totals.openingNetBlock, summaryData.totals.closingNetBlock];

       const csv = window.Papa.unparse({ fields: header, data: [...rows, totalsRow] });

       const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
       const link = document.createElement("a");
       const url = URL.createObjectURL(blob);
       link.setAttribute("href", url);
       link.setAttribute("download", `Depreciation_Summary_FY${FY_LABEL}.csv`);
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
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 text-slate-400 dark:text-slate-500 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
          </div>
          {isExpanded && (
              <div id="summary-section-printable-content" className="p-4 md:p-6 border-t border-slate-200 dark:border-slate-700/50">
                  <div className={`grid grid-cols-1 ${hasChartData ? 'xl:grid-cols-3' : ''} gap-8`}>
                      <div className="xl:col-span-2">
                          <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200 mb-4">Asset Type Summary Schedule</h3>
                          <div className="overflow-x-auto">
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
                          </div>
                           <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-900/30 border-l-4 border-blue-500 rounded-r-lg">
                               <p className="text-xs text-blue-800 dark:text-blue-200">
                                   <strong>Note:</strong> The calculations above are based on a single-asset accounting model as per Ind AS 16. For Income Tax purposes, where depreciation is calculated on a 'block of assets', please aggregate the results from this schedule manually.
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

const EmptyState = ({ addAsset }) => (
    <div className="text-center p-8 md:p-16 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-slate-700/50">
        <svg className="mx-auto h-24 w-24 text-slate-400 dark:text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="mt-4 text-2xl font-bold text-slate-700 dark:text-slate-200">Your Asset Register is Empty</h3>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Get started by adding your first asset to calculate depreciation.</p>
        <div className="mt-6">
            <button
                onClick={addAsset}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                <svg className="-ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add First Asset
            </button>
        </div>
    </div>
);


export default function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [theme, setTheme] = useState('light');
    const [method, setMethod] = useState('WDV');
    const [assets, setAssets] = useState([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [toast, setToast] = useState({ message: '', show: false });
    const [filterType, setFilterType] = useState(null);
    const [selectedAssetId, setSelectedAssetId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const debouncedAssets = useDebounce(assets, 250);
    const debouncedMethod = useDebounce(method, 250);
    const debouncedTheme = useDebounce(theme, 250);

    const showToast = useCallback((message) => {
        setToast({ message, show: true });
    },[]);
    
    const saveState = useCallback((stateToSave) => {
        try {
            localStorage.setItem('depreciationAppStateV3', JSON.stringify({
                assets: stateToSave.assets.map(({ isNew, ...rest }) => rest),
                method: stateToSave.method
            }));
            localStorage.setItem('depreciationAppTheme', stateToSave.theme);
        } catch (error) {
            console.error("Failed to save state to localStorage", error);
            showToast("Error: Could not save data.");
        }
    }, [showToast]);

    useEffect(() => {
        const scriptId = 'papaparse-script';
        if (document.getElementById(scriptId) || window.Papa) return;
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js";
        script.async = true;
        script.onload = () => console.log('PapaParse loaded');
        script.onerror = () => showToast("Export feature unavailable. Please check your internet connection and refresh.");
        document.head.appendChild(script);
        return () => {
            const el = document.getElementById(scriptId);
            if(el) document.head.removeChild(el);
        };
    }, [showToast]);

    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                const savedState = localStorage.getItem('depreciationAppStateV3');
                const savedTheme = localStorage.getItem('depreciationAppTheme');
                setTheme(savedTheme || 'light');

                if (savedState) {
                    const { assets: savedAssets, method: savedMethod } = JSON.parse(savedState);
                    setAssets(savedAssets.map(a => ({...a, isSelected: false, isNew: false })) || []);
                    setMethod(savedMethod || 'WDV');
                } else {
                     setAssets([]); // Start with an empty list for the new empty state
                }
            } catch (error) {
                console.error("Failed to load state from localStorage", error);
                 setAssets([]); // Default to empty on error
            }
            setIsLoading(false);
        }, 1000); 
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!isLoading) {
            saveState({ assets: debouncedAssets, method: debouncedMethod, theme: debouncedTheme });
        }
    }, [debouncedAssets, debouncedMethod, debouncedTheme, isLoading, saveState]);
    
    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };
    
    const addAsset = useCallback(() => {
        const newId = Date.now();
        const newAsset = { 
            id: newId, name: '', openingGrossBlock: '', openingAccumulatedDepreciation: '', residualValue: '', additions: [], 
            assetType: '', isNew: true, isSelected: false,
            purchaseDate: '', disposalDate: '', saleValue: ''
        };
        const newAssets = [...assets, newAsset];
        setAssets(newAssets);
        setSelectedAssetId(newId);
        setFilterType(null);
        showToast("Asset added successfully!");
    }, [assets, showToast]);
    
    const updateAsset = useCallback((id, updatedData) => {
        setAssets(prev => prev.map(asset => (asset.id === id ? updatedData : asset)));
    }, []);
    
    const handleSelectAsset = useCallback((id, isSelected) => {
        setAssets(prev => prev.map(asset => asset.id === id ? {...asset, isSelected} : asset));
    }, []);
    
    const handleDeleteRequest = () => {
        if (selectedAssetCount > 0) {
            setIsDeleteModalOpen(true);
        }
    };

    const handleConfirmDelete = useCallback(() => {
      const selectedCount = assets.filter(a => a.isSelected).length;
      if(selectedCount > 0){
          const newAssets = assets.filter(asset => !asset.isSelected);
          setAssets(newAssets);
          showToast(`${selectedCount} asset(s) deleted.`);
          setIsDeleteModalOpen(false);
          setSelectedAssetId(null);
      }
    }, [assets, showToast]);

    const handleMethodChange = (newMethod) => {
        if (method !== newMethod && assets.some(a => a.openingGrossBlock || a.additions.length > 0)) {
            showToast("Method switched. Please review assets as Residual Value requirements may have changed.");
        }
        setMethod(newMethod);
    };
    
    const calculationResults = useMemo(() => {
        return assets.map(asset => ({
            id: asset.id,
            asset,
            details: calculateAssetDetails(asset, method)
        }));
    }, [assets, method]);

    const summaryData = useMemo(() => {
        const summary = { byType: {} };
        calculationResults.forEach(({asset, details}) => {
            const type = asset.assetType || 'unclassified';
            if (!summary.byType[type]) {
                summary.byType[type] = { 
                    name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    internalName: type, 
                    openingGrossBlock: 0, additions: 0, disposalsCost: 0, closingGrossBlock: 0,
                    openingAccumulatedDepreciation: 0, openingNetBlock: 0, depreciationForYear: 0,
                    closingAccumulatedDepreciation: 0, closingNetBlock: 0 
                };
            }
            const calc = details;
            summary.byType[type].openingGrossBlock += calc.openingGrossBlock;
            summary.byType[type].additions += calc.grossBlockAdditions;
            summary.byType[type].disposalsCost += calc.disposalsCost;
            summary.byType[type].closingGrossBlock += calc.closingGrossBlock;
            summary.byType[type].openingAccumulatedDepreciation += calc.openingAccumulatedDepreciation;
            summary.byType[type].openingNetBlock += (calc.openingGrossBlock - calc.openingAccumulatedDepreciation);
            summary.byType[type].depreciationForYear += calc.depreciationForYear;
            summary.byType[type].closingAccumulatedDepreciation += calc.closingAccumulatedDepreciation;
            summary.byType[type].closingNetBlock += calc.closingWDV;
        });
        const totals = Object.values(summary.byType).reduce((acc, curr) => {
            Object.keys(acc).forEach(key => {
                if (typeof acc[key] === 'number' && key !== 'name' && key !== 'internalName') {
                    acc[key] += curr[key];
                }
            });
            return acc;
        }, { openingGrossBlock: 0, additions: 0, disposalsCost: 0, closingGrossBlock: 0, openingAccumulatedDepreciation: 0, openingNetBlock: 0, depreciationForYear: 0, closingAccumulatedDepreciation: 0, closingNetBlock: 0 });
        summary.totals = totals;
        return summary;
    }, [calculationResults]);

    const filteredAssets = useMemo(() => {
        let results = calculationResults;
        if (filterType) {
            results = results.filter(result => result.asset.assetType === filterType);
        }
        if (searchTerm) {
            results = results.filter(result => 
                result.asset.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return results;
    }, [calculationResults, filterType, searchTerm]);

    const selectedAssetCount = useMemo(() => assets.filter(a => a.isSelected).length, [assets]);

    const selectedAssetData = useMemo(() => {
        return calculationResults.find(r => r.id === selectedAssetId);
    }, [selectedAssetId, calculationResults]);
    
    const allVisibleSelected = useMemo(() => {
        const visibleIds = new Set(filteredAssets.map(a => a.id));
        if (visibleIds.size === 0) return false;
        const selectedVisible = assets.filter(a => a.isSelected && visibleIds.has(a.id));
        return selectedVisible.length === visibleIds.size;
    }, [assets, filteredAssets]);

    const handleSelectAll = useCallback(() => {
        const visibleIds = new Set(filteredAssets.map(a => a.id));
        const shouldSelectAll = !allVisibleSelected;
        setAssets(prevAssets => 
            prevAssets.map(asset => {
                if (visibleIds.has(asset.id)) {
                    return {...asset, isSelected: shouldSelectAll};
                }
                return asset;
            })
        );
    }, [filteredAssets, allVisibleSelected]);

    return (
        <div className={theme}>
            <PrintStyles />
            
            <div className="print-only">
                 <PrintLayout 
                    calculationResults={calculationResults}
                    method={method}
                    FY_LABEL={FY_LABEL}
                    summaryData={summaryData}
                />
            </div>
            
            <div className="no-print bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 min-h-screen text-slate-800 font-sans">
                <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
                    <Toast message={toast.message} show={toast.show} onClose={() => setToast({ ...toast, show: false })} />
                    <ConfirmationModal
                        isOpen={isDeleteModalOpen}
                        onClose={() => setIsDeleteModalOpen(false)}
                        onConfirm={handleConfirmDelete}
                        title="Confirm Deletion"
                    >
                        Are you sure you want to delete the selected {selectedAssetCount} asset(s)? This action cannot be undone.
                    </ConfirmationModal>

                    <header className="mb-8 relative flex flex-col sm:justify-center">
                        <div className="w-full flex justify-end mb-4 sm:absolute sm:top-0 sm:right-0 sm:mb-0">
                           <button onClick={toggleTheme} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-lg shadow-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-sm">
                                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                            </button>
                        </div>
                        <div className="text-center">
                            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100">Depreciation Calculator</h1>
                            <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">For the Financial Year {FY_LABEL}</p>
                        </div>
                    </header>
                    
                    {isLoading ? <SkeletonSummary /> : <SummaryReport summaryData={summaryData} onFilterChange={setFilterType} showToast={showToast} filterType={filterType} theme={theme}/>}

                    <div className="max-w-lg mx-auto mb-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg p-2 rounded-xl flex space-x-2 border border-white/30 dark:border-slate-700/50 shadow-sm">
                        <button onClick={() => handleMethodChange('WDV')} className={`w-1/2 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${method === 'WDV' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}>Written Down Value (WDV)</button>
                        <button onClick={() => handleMethodChange('SLM')} className={`w-1/2 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${method === 'SLM' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}>Straight-Line Method (SLM)</button>
                    </div>

                    <main>
                        <div className="mb-4">
                           <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Assets</h2>
                           
                            {selectedAssetCount > 0 && (
                                <div className="flex items-center gap-4 mb-4">
                                    <button onClick={handleSelectAll} className="px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-sm hover:bg-slate-700 transition-colors text-sm">
                                        {allVisibleSelected ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <button onClick={handleDeleteRequest} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-sm hover:bg-red-700 transition-colors text-sm">
                                        Delete ({selectedAssetCount})
                                    </button>
                                </div>
                            )}

                           <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                                <div className="relative w-full md:max-w-md">
                                     <input
                                        type="text"
                                        placeholder="Search assets by name..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border-2 border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition"
                                    />
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

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {isLoading ? (
                                [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
                            ) : assets.length === 0 ? (
                                <div className="md:col-span-2 lg:col-span-3">
                                   <EmptyState addAsset={addAsset} />
                                </div>
                            ) : filteredAssets.length === 0 ? (
                                <div className="md:col-span-2 lg:col-span-3 text-center p-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg rounded-2xl shadow-lg">
                                    <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">No assets match your search or filter.</h3>
                                    <p className="text-slate-500 dark:text-slate-400 mt-2">Try clearing your search term or filter.</p>
                                </div>
                            ) : (
                                filteredAssets.map((result, index) => 
                                    <AssetCard 
                                        key={result.id} 
                                        asset={result.asset}
                                        details={result.details}
                                        onSelect={handleSelectAsset}
                                        onEdit={() => setSelectedAssetId(result.id)}
                                        animationDelay={index * 50}
                                    />
                                )
                            )}
                        </div>
                    </main>
                    
                    {!isLoading && assets.length > 0 && (
                         <button onClick={addAsset} className="fixed bottom-6 right-6 md:bottom-8 md:right-8 h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center" title="Add New Asset" aria-label="Add new asset">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                    )}
                    
                    {selectedAssetData && (
                        <AssetDetailPanel
                           key={selectedAssetData.id}
                           asset={selectedAssetData.asset}
                           details={selectedAssetData.details}
                           updateAsset={updateAsset}
                           method={method}
                           onClose={() => setSelectedAssetId(null)}
                        />
                    )}

                </div>
            </div>
        </div>
    );
}
