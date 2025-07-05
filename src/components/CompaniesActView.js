import React from 'react';
import EmptyState from './EmptyState';
import AssetCard from './AssetCard';
import AssetDetailPanel from './AssetDetailPanel'; // Import the panel

const CompaniesActView = ({
  handleMethodChange,
  method,
  assets,
  addAsset,
  filteredItems,
  handleSelectAsset,
  setSelectedAssetId,
  selectedAssetCount,
  allVisibleAssetsSelected,
  handleSelectAllAssets,
  handleDeleteAssetRequest,
  searchTerm,
  setSearchTerm,
  filterType,
  setFilterType,
  isLoading,
  // Add these new props
  selectedAssetData,
  updateAsset
}) => {
  return (
    <>
        <main>
            <div className="max-w-lg mx-auto mb-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg p-2 rounded-xl flex space-x-2 border border-white/30 dark:border-slate-700/50 shadow-sm">
                <button onClick={() => handleMethodChange('WDV')} className={`w-1/2 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${method === 'WDV' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}>Written Down Value (WDV)</button>
                <button onClick={() => handleMethodChange('SLM')} className={`w-1/2 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-300 ${method === 'SLM' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'}`}>Straight-Line Method (SLM)</button>
            </div>
            <div className="mb-4">
               <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Assets</h2>
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
            {assets.length === 0 ? <EmptyState addAsset={addAsset} act={'companies'} /> : <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredItems.map((result) => <AssetCard key={result.id} asset={result.asset} details={result.details} onSelect={handleSelectAsset} onEdit={() => setSelectedAssetId(result.id)} />)}</div>}
            {!isLoading && <button onClick={addAsset} className="fixed bottom-6 right-6 md:bottom-8 md:right-8 h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center" title="Add New Asset" aria-label="Add new asset"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>}
        </main>
        {/* ADD THIS BACK IN */}
        {selectedAssetData && <AssetDetailPanel key={selectedAssetData.id} asset={selectedAssetData.asset} details={selectedAssetData.details} updateAsset={updateAsset} method={method} act={'companies'} onClose={() => setSelectedAssetId(null)} />}
    </>
  );
};

export default CompaniesActView;