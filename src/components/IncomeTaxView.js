import React from 'react';
import EmptyState from './EmptyState';
import BlockCard from './BlockCard';
import BlockDetailPanel from './BlockDetailPanel';
import { INCOME_TAX_BLOCKS } from '../config';

const IncomeTaxView = ({
  assetBlocks,
  addBlock,
  filteredItems,
  handleSelectBlock,
  setSelectedBlockId,
  selectedBlockCount,
  allVisibleBlocksSelected,
  handleSelectAllBlocks,
  handleDeleteBlockRequest,
  blockSearchTerm,
  setBlockSearchTerm,
  filterType,
  setFilterType,
  isLoading,
  selectedBlockData,
  updateBlock
}) => {
  return (
    <>
        <main>
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Asset Blocks</h2>
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

            {assetBlocks.length > 0 && filteredItems.length === 0 ? (
                <div className="text-center p-8 text-slate-500 dark:text-slate-400">
                    No search results found for "{blockSearchTerm}".
                </div>
            ) : assetBlocks.length === 0 ? (
                <EmptyState addAsset={addBlock} act={'income_tax'} />
            ) : (
                // THIS IS THE UPDATED LINE - ADDED pb-24 for padding-bottom
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
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

            {!isLoading && <button onClick={addBlock} className="fixed bottom-6 right-6 md:bottom-8 md:right-8 h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center z-30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>}
        </main>
        {selectedBlockData && <BlockDetailPanel key={selectedBlockData.id} block={selectedBlockData.block} details={selectedBlockData.details} updateBlock={updateBlock} onClose={() => setSelectedBlockId(null)} />}
    </>
  );
};

export default IncomeTaxView;
