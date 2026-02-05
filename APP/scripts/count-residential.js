import fs from 'fs';
import { parse } from 'csv-parse';

const CSV_PATH = './Assessment_Parcels.csv';

const countResidential = async () => {
    let total = 0;
    let residentialOnly = 0;
    const breakdown = {};

    const parser = fs.createReadStream(CSV_PATH).pipe(parse({
        columns: true,
        skip_empty_lines: true
    }));

    for await (const row of parser) {
        total++;
        const pClass = row["Property Class 1"] || "";

        if (/RESIDENTIAL [123]/.test(pClass)) {
            residentialOnly++;
            breakdown[pClass] = (breakdown[pClass] || 0) + 1;
        }
    }

    console.log(`Total Records: ${total.toLocaleString()}`);
    console.log(`Residential Properties: ${residentialOnly.toLocaleString()}`);
    console.log(`Breakdown:`);
    Object.entries(breakdown).forEach(([k, v]) => {
        console.log(`  - ${k}: ${v.toLocaleString()}`);
    });
};

countResidential();
