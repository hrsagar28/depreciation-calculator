// --- Config & Data ---
export const FINANCIAL_YEAR_CONFIG = {
  start: '2024-04-01',
  end: '2025-03-31',
  label: '2024-25',
};

export const { start: FY_START_DATE, end: FY_END_DATE, label: FY_LABEL } = FINANCIAL_YEAR_CONFIG;

// Companies Act Data
export const SCHEDULE_II_WDV_RATES = {
  general_machinery: 0.1810, computers_laptops: 0.6316, servers_networks: 0.3930,
  general_furniture: 0.2589, office_equipment: 0.4507, motor_cars: 0.2589,
  buildings_rcc: 0.0487, buildings_non_rcc: 0.0950,
};

export const SCHEDULE_II_SLM_USEFUL_LIFE = {
  general_machinery: 15, computers_laptops: 3, servers_networks: 6,
  general_furniture: 10, office_equipment: 5, motor_cars: 8,
  buildings_rcc: 60, buildings_non_rcc: 30,
};

// Income Tax Act Data (Updated)
export const INCOME_TAX_BLOCKS = {
  'building_residential': { name: 'Building (Residential)', rate: 0.05 },
  'building_general': { name: 'Building (Office, Factory, etc.)', rate: 0.10 },
  'furniture_fittings': { name: 'Furniture & Fittings', rate: 0.10 },
  'machinery_general': { name: 'Plant & Machinery (General)', rate: 0.15 },
  'motor_cars': { name: 'Motor Cars', rate: 0.15 },
  'office_equipment': { name: 'Office Equipment', rate: 0.15 },
  'ships_vessels': { name: 'Ships, Vessels', rate: 0.20 },
  'intangibles': { name: 'Intangible Assets (Patents, Copyrights)', rate: 0.25 },
  'motor_buses_lorries_taxis_hire': { name: 'Motor Buses, Lorries & Taxis (Hiring Business)', rate: 0.30 },
  'building_temporary': { name: 'Buildings (Temporary Structures)', rate: 0.40 },
  'aircraft': { name: 'Aircraft', rate: 0.40 },
  'computers_software': { name: 'Computers & Software', rate: 0.40 },
  'energy_saving_devices': { name: 'Energy Saving Devices', rate: 0.40 },
  'pollution_control': { name: 'Pollution Control Equipment', rate: 0.40 },
  'books_professional': { name: 'Books (for Professionals)', rate: 0.40 },
  'books_annual': { name: 'Books (Annual Publications)', rate: 1.00 },
};

// List of block types statutorily excluded from additional depreciation
export const EXCLUDED_BLOCK_TYPES_FOR_ADDITIONAL_DEP = [
    'ships_vessels',
    'motor_cars',
    'motor_buses_lorries_taxis_hire',
    'aircraft',
    'intangibles',
    'building_residential',
    'building_general',
    'building_temporary',
];