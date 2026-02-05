export interface RawPropertyData {
  "Roll Number": string;
  "Street Number": string;
  "Street Name": string;
  "Street Type": string;
  "Full Address": string;
  "Neighbourhood Area": string;
  "Market Region": string;
  "Total Living Area": string;
  "Building Type": string;
  "Basement": string;
  "Year Built": string;
  "Rooms": string;
  "Total Assessed Value": string;
  "Total Proposed Assessment Value": string;
  "Zoning": string;
  "Frontage"?: string; // Derived or mapped
}

export interface Property {
  id: string;
  address: string;
  streetName: string;
  neighborhood: string;
  livingArea: number;
  buildingType: string;
  yearBuilt: number;
  rooms: number;
  hasBasement: boolean;
  currentValue: number;
  proposedValue: number;
  valueChange: number;
  percentChange: number;
  zoning: string;
}

export interface FilterState {
  neighborhood: string | 'All';
  streetName: string | 'All';
  buildingType: string | 'All';
  minArea: number;
  maxArea: number;
  search: string;
}

export enum SortOption {
  Address = 'address',
  CurrentValue = 'currentValue',
  ProposedValue = 'proposedValue',
  PercentChange = 'percentChange',
  LivingArea = 'livingArea'
}

export type SortDirection = 'asc' | 'desc';