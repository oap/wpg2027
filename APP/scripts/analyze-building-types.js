import fs from 'fs';
import { parse } from 'csv-parse';

const CSV_PATH = './Assessment_Parcels.csv';

const analyze = async () => {
    const counts = {};
    const parser = fs.createReadStream(CSV_PATH).pipe(parse({
        columns: true,
        skip_empty_lines: true
    }));

    for await (const row of parser) {
        const type = row["Building Type"] || "(empty)";
        counts[type] = (counts[type] || 0) + 1;
    }

    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1]) // Sort by count desc
        .slice(0, 50); // Top 50

    console.log("Top Building Types:");
    sorted.forEach(([type, count]) => {
        console.log(`${count.toString().padEnd(8)} ${type}`);
    });
};

analyze();
