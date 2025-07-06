import React, { useState, useEffect } from 'react';
import { INCOME_TAX_BLOCKS, EXCLUDED_BLOCK_TYPES_FOR_ADDITIONAL_DEP, FY_START_DATE, FY_END_DATE } from '../config';
import { formatCurrency, isValidDate } from '../utils/helpers';
import ConfirmationModal from './ConfirmationModal';
import AdditionalDepreciationModal from './AdditionalDepreciationModal';

const BlockDetailPanel = ({ block, details, updateBlock, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [newAddition, setNewAddition] = useState({ date: '', cost: '' });

    const [isCessationModalOpen, setCessationModalOpen] = useState(false);
    const [isAdditionalDepModalOpen, setAdditionalDepModalOpen] = useState(false);
    const [tempEligibility, setTempEligibility] = useState(block.additionalDepEligibility || { isNewPlantMachinery: false, isManufacturing: false, isNotExcluded: false });

    const isBlockTypeEligibleForAdditionalDep = block.blockType && !EXCLUDED_BLOCK_TYPES_FOR_ADDITIONAL_DEP.includes(block.blockType);
    
    // Updated validation flag for new addition date
    const isAdditionDateInvalid = newAddition.date && !isValidDate(newAddition.date);

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

        if (name === 'blockCeased' && checked) {
            setCessationModalOpen(true);
            return;
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
                updatedBlock.rate = blockDetails.rate;
            }
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
        if (!newAddition.date || !newAddition.cost || isAdditionDateInvalid) return;
        const updatedAdditions = [...(block.additions || []), newAddition];
        updateBlock(block.id, { ...block, additions: updatedAdditions });
        setNewAddition({ date: '', cost: '' });
    };

    const removeAddition = (index) => {
        const updatedAdditions = block.additions.filter((_, i) => i !== index);
        updateBlock(block.id, { ...block, additions: updatedAdditions });
    };

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
                        <input type="text" value={block.name} placeholder="Enter Block Name" onChange={(e) => updateBlock(block.id, {...block, name: e.target.value})} className="text-2xl font-bold text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none focus:ring-0 border-none p-0 w-full placeholder-slate-400 dark:placeholder-slate-500"/>
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
                             {(block.additions || []).map((add, index) => {
                                 const isExistingAdditionInvalid = !isValidDate(add.date);
                                 return (
                                     <div key={index} className={`flex items-center gap-2 mb-2 p-2 rounded-md text-sm ${isExistingAdditionInvalid ? 'bg-red-100 dark:bg-red-900/30' : 'bg-indigo-50 dark:bg-indigo-900/30'}`}>
                                         <span className={`flex-grow ${isExistingAdditionInvalid ? 'text-red-800 dark:text-red-300' : 'text-indigo-800 dark:text-indigo-300'}`}>Purchased on {add.date ? new Date(add.date).toLocaleDateString('en-GB') : '??'} for {formatCurrency(add.cost)} {isExistingAdditionInvalid && '(Invalid Date)'}</span>
                                        <button onClick={() => removeAddition(index)} className="p-1 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50" title="Remove Addition" aria-label={`Remove addition on ${add.date}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        </button>
                                     </div>
                                 );
                             })}
                             <div className="flex flex-col sm:flex-row items-center gap-2 mt-3">
                                <input type="date" aria-label="New addition date" value={newAddition.date} onChange={(e) => setNewAddition(p => ({...p, date: e.target.value}))} className={`${inputFieldClass} flex-1 ${isAdditionDateInvalid ? 'border-red-500 ring-1 ring-red-500' : ''}`} min={FY_START_DATE} max={FY_END_DATE}/>
                                <input type="number" aria-label="New addition cost" value={newAddition.cost} onChange={(e) => setNewAddition(p => ({...p, cost: e.target.value}))} placeholder="Cost of Addition (₹)" className={`${inputFieldClass} flex-1`}/>
                                <button onClick={handleAddAddition} disabled={!newAddition.date || !newAddition.cost || isAdditionDateInvalid} className="w-full sm:w-auto px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors flex-shrink-0 text-base shadow-md disabled:bg-indigo-400 disabled:cursor-not-allowed">Add</button>
                            </div>
                            {isAdditionDateInvalid && <p className="text-xs text-red-600 mt-1">Addition date is invalid or outside the financial year.</p>}
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

export default BlockDetailPanel;
