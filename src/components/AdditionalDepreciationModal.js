import React from 'react';

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

export default AdditionalDepreciationModal;