import React from 'react';

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

export default EmptyState;