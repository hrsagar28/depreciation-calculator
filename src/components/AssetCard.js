import React from 'react';
import { formatCurrency } from '../utils/helpers';

const AssetCard = React.memo(({ asset, details, onSelect, onEdit }) => {
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
});

export default AssetCard;