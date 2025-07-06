import { FY_START_DATE, FY_END_DATE } from '../config';
import React, { useState, useEffect } from 'react';

export const formatCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

export const round = (value) => parseFloat(value.toFixed(2));

export const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

const getDaysInFY = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const fyEndYear = month >= 3 ? year + 1 : year;
    return isLeapYear(fyEndYear) ? 366 : 365;
};

export const isValidDate = (dateString) => {
    // Check for YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return false;
    }

    const date = new Date(dateString);
    const latestDate = new Date(FY_END_DATE);
    const earliestDate = new Date('1900-01-01');

    // Check if the date object is valid at all
    if (isNaN(date.getTime())) {
        return false;
    }

    // The crucial check: does the created date match the input string?
    // This catches invalid dates like '2025-02-30' which JS parses to March.
    // The toISOString() method returns a string in YYYY-MM-DDTHH:mm:ss.sssZ format. We slice the date part.
    if (date.toISOString().slice(0, 10) !== dateString) {
        return false;
    }

    // Finally, check if it's within our allowed range.
    return date <= latestDate && date >= earliestDate;
};


export const getDaysUsed = (purchaseDateStr, disposalDateStr = null) => {
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

export function useDebounce(value, delay) {
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
