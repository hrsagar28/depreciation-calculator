import React from 'react';
import { FY_LABEL } from '../config';

const ActSelectionScreen = ({ onSelectCalculationMode, theme, toggleTheme, openHelpModal }) => {
    return (
        <div className={theme}>
            <div className="bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950 min-h-screen text-slate-800 font-sans flex flex-col justify-center items-center p-4">
                 
                 {/* --- UPDATED RESPONSIVE HEADER --- */}
                 <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button onClick={() => openHelpModal('introduction')} className="px-3 py-2 md:px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition-colors text-xs md:text-sm">Help</button>
                    <button onClick={toggleTheme} className="px-3 py-2 md:px-4 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-lg shadow-sm hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-xs md:text-sm">
                        {theme === 'light' ? 'Dark' : 'Light'}
                    </button>
                 </div>

                <div className="text-center mb-12 animate-fade-in-down pt-16 md:pt-0">
                     <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100">Depreciation Calculator</h1>
                     <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">For the Financial Year {FY_LABEL}</p>
                </div>
                <div className="w-full max-w-5xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-lg border border-white/30 dark:border-slate-700/50 rounded-2xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-100 mb-8 animate-fade-in-down" style={{ animationDelay: '200ms' }}>Choose a Tool</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Companies Act */}
                        <div className="flex flex-col animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                            <button onClick={() => onSelectCalculationMode('companies')} className="p-6 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 flex flex-col items-center justify-center text-center h-full">
                                <svg className="h-12 w-12 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h6m-6 4h6m-6 4h6" /></svg>
                                <h3 className="text-xl font-bold">Companies Act, 2013</h3>
                                <p className="text-sm mt-1 opacity-80">Calculate book depreciation on individual assets.</p>
                            </button>
                        </div>
                        {/* Income Tax Act */}
                         <div className="flex flex-col animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                           <button onClick={() => onSelectCalculationMode('income_tax')} className="p-6 bg-teal-600 text-white rounded-xl shadow-lg hover:bg-teal-700 transition-all duration-300 transform hover:scale-105 flex flex-col items-center justify-center text-center h-full">
                                <svg className="h-12 w-12 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                <h3 className="text-xl font-bold">Income Tax Act, 1961</h3>
                                <p className="text-sm mt-1 opacity-80">Calculate tax depreciation on asset blocks.</p>
                            </button>
                        </div>
                        {/* Deferred Tax Calculator Button */}
                        <div className="flex flex-col md:col-span-2 lg:col-span-1 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
                           <button onClick={() => onSelectCalculationMode('deferred_tax')} className="p-6 bg-purple-600 text-white rounded-xl shadow-lg hover:bg-purple-700 transition-all duration-300 transform hover:scale-105 flex flex-col items-center justify-center text-center h-full">
                                <svg className="h-12 w-12 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                                <h3 className="text-xl font-bold">Deferred Tax Calculator</h3>
                                <p className="text-sm mt-1 opacity-80">Analyze timing differences and calculate DTA/DTL.</p>
                            </button>
                        </div>
                    </div>
                    <div className="text-center mt-8 animate-fade-in-up" style={{ animationDelay: '700ms' }}>
                        <button onClick={() => openHelpModal('generalTerms')} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                            Confused by the terms? Click here for a glossary.
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActSelectionScreen;
