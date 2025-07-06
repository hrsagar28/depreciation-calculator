import { round, getDaysUsed, formatCurrency } from './helpers';
import { SCHEDULE_II_WDV_RATES, SCHEDULE_II_SLM_USEFUL_LIFE } from '../config';

export const calculateCompaniesActDepreciation = (asset, method, fyStartDate, fyEndDate) => {
    const financialData = asset.companiesAct;
    const openingGrossBlock = Math.max(0, parseFloat(financialData.openingGrossBlock) || 0);
    const openingAccumulatedDepreciation = Math.max(0, parseFloat(financialData.openingAccumulatedDepreciation) || 0);
    const residualValue = Math.max(0, parseFloat(financialData.residualValue) || 0);
    const grossBlockAdditions = asset.additions.reduce((sum, add) => sum + (Math.max(0, parseFloat(add.cost)) || 0), 0);
    const hasValueAtStart = openingGrossBlock > 0 || grossBlockAdditions > 0;
    const saleValue = hasValueAtStart ? Math.max(0, parseFloat(asset.saleValue) || 0) : 0;

    if (!hasValueAtStart) {
        return { depreciationForYear: 0, closingWDV: 0, workings: [], profitOrLoss: 0, openingGrossBlock: 0, grossBlockAdditions: 0, disposalsCost: 0, closingGrossBlock: 0, openingAccumulatedDepreciation: 0, closingAccumulatedDepreciation: 0, openingWDV: 0, saleValue: 0 };
    }

    const isDisposed = !!asset.disposalDate;
    const additionsBeforeDisposal = asset.additions.filter(add => !isDisposed || (add.date && new Date(add.date) <= new Date(asset.disposalDate)));
    const totalAdditionsCostBeforeDisposal = additionsBeforeDisposal.reduce((sum, add) => sum + (Math.max(0, parseFloat(add.cost)) || 0), 0);

    let depreciationForYear = 0;
    let workings = [];
    let calculatedRate = 0;
    let usefulLife = 0;
    const openingWDV = round(openingGrossBlock - openingAccumulatedDepreciation);

    if (method === 'SLM') {
        usefulLife = SCHEDULE_II_SLM_USEFUL_LIFE[asset.assetType] || 0;
        if (usefulLife > 0) {
            const depreciableBase = round(openingGrossBlock - residualValue);
            const maxAllowableDepOpening = Math.max(0, round(openingWDV - residualValue));
            if (depreciableBase > 0 && maxAllowableDepOpening > 0) {
                const { daysUsed, daysInYear } = getDaysUsed(asset.purchaseDate, asset.disposalDate, fyStartDate, fyEndDate);
                const annualDep = round(depreciableBase / usefulLife);
                const depOnOpening = round(Math.min(annualDep * (daysUsed / daysInYear), maxAllowableDepOpening));
                depreciationForYear += depOnOpening;
                workings.push({ description: `Dep on Opening Cost`, calculation: `((${formatCurrency(openingGrossBlock)} - ${formatCurrency(residualValue)}) / ${usefulLife} yrs) × ${daysUsed}/${daysInYear} days`, amount: depOnOpening });
            }
        }
    } else { // WDV
        calculatedRate = SCHEDULE_II_WDV_RATES[asset.assetType] || 0;
        if (openingWDV > 0 && calculatedRate > 0) {
            const { daysUsed, daysInYear } = getDaysUsed(asset.purchaseDate, asset.disposalDate, fyStartDate, fyEndDate);
            const depOnOpening = round(Math.min((openingWDV * calculatedRate) * (daysUsed / daysInYear), openingWDV));
            depreciationForYear += depOnOpening;
            workings.push({ description: `Dep on Opening WDV`, calculation: `(${formatCurrency(openingWDV)} × ${(calculatedRate * 100).toFixed(2)}%) × ${daysUsed}/${daysInYear} days`, amount: depOnOpening });
        }
    }

    additionsBeforeDisposal.forEach((addition, index) => {
        const addCost = Math.max(0, parseFloat(addition.cost) || 0);
        if (addCost <= 0 || !addition.date) return;
        const { daysUsed, daysInYear: daysInAddYear } = getDaysUsed(addition.date, asset.disposalDate, fyStartDate, fyEndDate);
        let proRataDep = 0;
        if (method === 'SLM' && usefulLife > 0) {
            const addResidualValue = Math.max(0, parseFloat(addition.residualValue) || 0);
            const addDepreciable = round(addCost - addResidualValue);
            if (addDepreciable > 0) {
                proRataDep = round((addDepreciable / usefulLife) * (daysUsed / daysInAddYear));
                workings.push({ description: `Dep on Addition #${index + 1}`, calculation: `((${formatCurrency(addCost)} - ${formatCurrency(addResidualValue)}) / ${usefulLife} years) × ${daysUsed}/${daysInAddYear} days`, amount: proRataDep });
            }
        } else if (method === 'WDV' && calculatedRate > 0) {
            proRataDep = round((addCost * calculatedRate) * (daysUsed / daysInAddYear));
            workings.push({ description: `Dep on Addition #${index + 1}`, calculation: `(${formatCurrency(addCost)} × ${(calculatedRate * 100).toFixed(2)}%) × ${daysUsed}/${daysInAddYear} days`, amount: proRataDep });
        }
        depreciationForYear += proRataDep;
    });
    depreciationForYear = round(depreciationForYear);

    let profitOrLoss = 0;
    let finalClosingWDV, finalClosingGrossBlock, finalClosingAccumDep, disposalsCost = 0;

    if(isDisposed) {
        const costOfDisposedAsset = round(openingGrossBlock + totalAdditionsCostBeforeDisposal);
        const wdvOnSaleDate = round(costOfDisposedAsset - (openingAccumulatedDepreciation + depreciationForYear));
        profitOrLoss = round(saleValue - wdvOnSaleDate);
        disposalsCost = costOfDisposedAsset;
        finalClosingGrossBlock = round(openingGrossBlock + grossBlockAdditions - disposalsCost);
        finalClosingAccumDep = 0;
        finalClosingWDV = 0;
    } else {
        finalClosingGrossBlock = round(openingGrossBlock + grossBlockAdditions);
        finalClosingAccumDep = round(openingAccumulatedDepreciation + depreciationForYear);
        finalClosingWDV = round(finalClosingGrossBlock - finalClosingAccumDep);
    }

    return { depreciationForYear, closingWDV: finalClosingWDV, workings, profitOrLoss, openingGrossBlock, grossBlockAdditions, disposalsCost, closingGrossBlock: finalClosingGrossBlock, openingAccumulatedDepreciation, closingAccumulatedDepreciation: finalClosingAccumDep, openingWDV, saleValue };
};

export const calculateIncomeTaxDepreciation = (block, fyStartDate, fyEndDate) => {
    const openingWDV = Math.max(0, parseFloat(block.openingWDV) || 0);
    const blockCeased = block.blockCeased || false;
    const eligibleForAdditional = block.eligibleForAdditional || false;
    const rate = block.rate || 0;

    let additionsFullRate = 0;
    let additionsHalfRate = 0;

    block.additions.forEach(add => {
        const cost = Math.max(0, parseFloat(add.cost) || 0);
        if(cost > 0 && add.date) {
            const { daysUsed } = getDaysUsed(add.date, null, fyStartDate, fyEndDate);
            if (daysUsed >= 180) {
                additionsFullRate += cost;
            } else {
                additionsHalfRate += cost;
            }
        }
    });
    additionsFullRate = round(additionsFullRate);
    additionsHalfRate = round(additionsHalfRate);
    const totalAdditions = round(additionsFullRate + additionsHalfRate);

    const hasValueAtStart = openingWDV > 0 || totalAdditions > 0;
    const saleProceeds = hasValueAtStart ? Math.max(0, parseFloat(block.saleProceeds) || 0) : 0;

    const wdvBeforeDep = round(openingWDV + totalAdditions - saleProceeds);

    let depreciationForYear = 0;
    let additionalDepreciation = 0;
    let shortTermCapitalGainLoss = 0;
    let closingWDV = 0;
    let workings = [];

    if (!block.blockType) {
        return { openingWDV, additions: totalAdditions, saleValue: saleProceeds, wdvForDep: wdvBeforeDep, depreciationForYear: 0, closingWDV: wdvBeforeDep, shortTermCapitalGainLoss: 0, workings: [{description: "Select a block type to calculate depreciation.", calculation: "", amount: 0}] };
    }


    if (blockCeased) {
        shortTermCapitalGainLoss = round(saleProceeds - (openingWDV + totalAdditions));
        closingWDV = 0;
        workings.push({
            description: shortTermCapitalGainLoss >= 0 ? 'Short Term Capital Gain' : 'Short Term Capital Loss',
            calculation: `${formatCurrency(saleProceeds)} - (${formatCurrency(openingWDV)} + ${formatCurrency(totalAdditions)})`,
            amount: shortTermCapitalGainLoss
        });
    } else if (wdvBeforeDep > 0) {
        const depOnAdditionsFull = round(additionsFullRate * rate);
        const depOnAdditionsHalf = round(additionsHalfRate * (rate / 2));
        const wdvForOpeningDep = round(wdvBeforeDep - additionsFullRate - additionsHalfRate);
        const depOnOpening = round(Math.max(0, wdvForOpeningDep * rate));

        depreciationForYear = round(depOnOpening + depOnAdditionsFull + depOnAdditionsHalf);

        if (depOnOpening > 0) workings.push({ description: 'Dep on Opening WDV balance', calculation: `${formatCurrency(wdvForOpeningDep)} × ${rate * 100}%`, amount: depOnOpening });
        if (depOnAdditionsFull > 0) workings.push({ description: 'Dep on Additions (>= 180 days)', calculation: `${formatCurrency(additionsFullRate)} × ${rate * 100}%`, amount: depOnAdditionsFull });
        if (depOnAdditionsHalf > 0) workings.push({ description: 'Dep on Additions (< 180 days)', calculation: `${formatCurrency(additionsHalfRate)} × ${(rate / 2) * 100}%`, amount: depOnAdditionsHalf });

        // Additional Depreciation Calculation
        if (eligibleForAdditional) {
            const addDepOnFull = round(additionsFullRate * 0.20);
            const addDepOnHalf = round(additionsHalfRate * 0.10);
            additionalDepreciation = round(addDepOnFull + addDepOnHalf);
            if(additionalDepreciation > 0) {
                 workings.push({ description: 'Additional Depreciation', calculation: `On new additions`, amount: additionalDepreciation });
                 depreciationForYear = round(depreciationForYear + additionalDepreciation);
            }
        }

        closingWDV = round(wdvBeforeDep - depreciationForYear);
    } else {
        shortTermCapitalGainLoss = round(wdvBeforeDep); // This will be negative, indicating a capital gain
        closingWDV = 0;
        workings.push({
            description: 'Short Term Capital Gain (Sale > WDV)',
            calculation: `(${formatCurrency(openingWDV)} + ${formatCurrency(totalAdditions)}) - ${formatCurrency(saleProceeds)}`,
            amount: -shortTermCapitalGainLoss
        });
    }

    return {
        openingWDV,
        additions: totalAdditions,
        saleValue: saleProceeds,
        wdvForDep: wdvBeforeDep,
        depreciationForYear,
        closingWDV,
        shortTermCapitalGainLoss,
        workings
    };
};
