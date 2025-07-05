import React, { useState, useRef, useEffect } from 'react';
import { SCHEDULE_II_SLM_USEFUL_LIFE, SCHEDULE_II_WDV_RATES, FY_START_DATE, FY_END_DATE } from '../config';
import { formatCurrency, isValidDate } from '../utils/helpers';
import Tooltip from './Tooltip';

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

export default AssetDetailPanel;