import { Property, RawPropertyData } from "../types";

const parseCurrency = (value: string): number => {
  if (!value) return 0;
  return parseFloat(value.replace(/[^0-9.-]+/g, ""));
};

const parseNumber = (value: string): number => {
  if (!value) return 0;
  return parseFloat(value.replace(/,/g, ""));
};

// A simple CSV parser that handles the specific quoted format "Value","Value"
export const parseCSV = (csvText: string): Property[] => {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  // Extract headers
  const headers = lines[0].match(/"([^"]*)"/g)?.map(h => h.replace(/"/g, '')) || [];
  
  const properties: Property[] = [];

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i];
    // Split by comma only if it's outside quotes or strictly following the "","" pattern.
    // Since the format is strict "val","val", we can use a regex to extract content between quotes.
    const matches = currentLine.match(/"(.*?)"/g);
    
    if (matches && matches.length === headers.length) {
      const values = matches.map(val => val.replace(/^"|"$/g, ''));
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      const raw = row as RawPropertyData;

      // Transform to cleaner Property object
      const currentValue = parseCurrency(raw["Total Assessed Value"]);
      const proposedValue = parseCurrency(raw["Total Proposed Assessment Value"]);
      
      const changeAmt = proposedValue - currentValue;
      const percentChange = currentValue > 0 ? (changeAmt / currentValue) * 100 : 0;

      properties.push({
        id: raw["Roll Number"],
        address: raw["Full Address"],
        streetName: raw["Street Name"],
        neighborhood: raw["Neighbourhood Area"],
        livingArea: parseNumber(raw["Total Living Area"]),
        buildingType: raw["Building Type"],
        yearBuilt: parseInt(raw["Year Built"]) || 0,
        rooms: parseInt(raw["Rooms"]) || 0,
        hasBasement: raw["Basement"] === "Yes",
        currentValue: currentValue,
        proposedValue: proposedValue,
        valueChange: changeAmt,
        percentChange: percentChange,
        zoning: raw["Zoning"]
      });
    }
  }

  return properties;
};

export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(val);
};

export const formatPercent = (val: number) => {
  return new Intl.NumberFormat('en-CA', { style: 'percent', maximumFractionDigits: 1 }).format(val / 100);
};