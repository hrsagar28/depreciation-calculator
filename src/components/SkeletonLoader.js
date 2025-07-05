import React from 'react';

export const SkeletonCard = () => (
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

export const SkeletonSummary = () => (
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