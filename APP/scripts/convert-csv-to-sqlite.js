import initSqlJs from 'sql.js';
import fs from 'fs';
import { parse } from 'csv-parse';

const DB_PATH = './public/properties.db';
const CSV_PATH = './Assessment_Parcels.csv';

const processFile = async () => {
  console.log(`Loading sql.js...`);
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // 1. Create Normalized Schema
  console.log("Creating tables...");
  db.run(`
    CREATE TABLE neighborhoods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      avg_percent_change REAL,
      total_properties INTEGER
    );

    CREATE TABLE streets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE
    );

    CREATE TABLE properties (
      id TEXT PRIMARY KEY,
      address TEXT,
      neighborhood_id INTEGER,
      street_id INTEGER,
      living_area INTEGER,
      building_type TEXT,
      year_built INTEGER,
      rooms INTEGER,
      has_basement INTEGER,
      current_value REAL,
      proposed_value REAL,
      value_change REAL,
      percent_change REAL,
      zoning TEXT,
      FOREIGN KEY(neighborhood_id) REFERENCES neighborhoods(id),
      FOREIGN KEY(street_id) REFERENCES streets(id)
    );
    
    -- Indexes for faster filtering
    CREATE INDEX idx_neigh ON properties(neighborhood_id);
    CREATE INDEX idx_street ON properties(street_id);
    CREATE INDEX idx_living ON properties(living_area);
  `);

  console.log(`Reading CSV from ${CSV_PATH}...`);

  const neighborhoodStats = new Map();
  const streetSet = new Set();
  const propertiesData = [];

  const parser = fs.createReadStream(CSV_PATH).pipe(parse({
    columns: true,
    skip_empty_lines: true
  }));

  for await (const row of parser) {
    const neigh = row["Neighbourhood Area"];
    const street = row["Street Name"];
    const bType = row["Building Type"] || "";

    const currentValue = parseFloat(row["Total Assessed Value"].replace(/[^0-9.-]+/g, "")) || 0;
    const proposedValue = parseFloat(row["Total Proposed Assessment Value"].replace(/[^0-9.-]+/g, "")) || 0;
    const changeAmt = proposedValue - currentValue;
    const percentChange = currentValue > 0 ? (changeAmt / currentValue) * 100 : 0;
    const livingArea = parseFloat(row["Total Living Area"].replace(/,/g, "")) || 0;

    const pClass = row["Property Class 1"] || "";

    // Track Neighborhood Stats - ONLY if Residential (Class 1, 2, or 3)
    // "RESIDENTIAL 1" = Single family
    // "RESIDENTIAL 2" = Multi-family / Condo
    // "RESIDENTIAL 3" = Other residential
    if (/RESIDENTIAL [123]/.test(pClass)) {
      if (!neighborhoodStats.has(neigh)) {
        neighborhoodStats.set(neigh, { totalChange: 0, count: 0 });
      }
      const stats = neighborhoodStats.get(neigh);
      stats.totalChange += percentChange;
      stats.count++;
    }

    // Track Streets
    streetSet.add(street);

    // Buffer Property Data
    propertiesData.push({
      id: row["Roll Number"],
      address: row["Full Address"],
      neighborhood: neigh,
      street: street,
      livingArea,
      buildingType: bType,
      yearBuilt: parseInt(row["Year Built"]) || 0,
      rooms: parseInt(row["Rooms"]) || 0,
      hasBasement: row["Basement"] === "Yes" ? 1 : 0,
      currentValue,
      proposedValue,
      valueChange: changeAmt,
      percentChange,
      zoning: row["Zoning"]
    });

    if (propertiesData.length % 10000 === 0) process.stdout.write('.');
  }
  console.log(`\nParsed ${propertiesData.length} records.`);

  // Ensure all neighborhoods are in the map (even those with 0 residential properties)
  for (const p of propertiesData) {
    if (!neighborhoodStats.has(p.neighborhood)) {
      neighborhoodStats.set(p.neighborhood, { totalChange: 0, count: 0 });
    }
  }

  // 2. Insert Neighborhoods
  console.log("Inserting Neighborhoods...");
  db.run("BEGIN TRANSACTION");
  const neighStmt = db.prepare("INSERT INTO neighborhoods (name, avg_percent_change, total_properties) VALUES (?, ?, ?)");
  const neighIdMap = new Map();

  let neighIdCounter = 1;
  const sortedNeighs = Array.from(neighborhoodStats.keys()).sort();

  for (const name of sortedNeighs) {
    const stats = neighborhoodStats.get(name);
    const avg = stats.count > 0 ? stats.totalChange / stats.count : 0;
    neighStmt.run([name, avg, stats.count]);
    neighIdMap.set(name, neighIdCounter++);
  }
  neighStmt.free();
  db.run("COMMIT");

  // 3. Insert Streets
  console.log("Inserting Streets...");
  db.run("BEGIN TRANSACTION");
  const streetStmt = db.prepare("INSERT INTO streets (name) VALUES (?)");
  const streetIdMap = new Map();
  let streetIdCounter = 1;
  const sortedStreets = Array.from(streetSet).sort();
  for (const name of sortedStreets) {
    streetStmt.run([name]);
    streetIdMap.set(name, streetIdCounter++);
  }
  streetStmt.free();
  db.run("COMMIT");

  // 4. Insert Properties
  console.log("Inserting Properties...");
  db.run("BEGIN TRANSACTION");
  const propStmt = db.prepare(`
    INSERT INTO properties (
      id, address, neighborhood_id, street_id, living_area, building_type, 
      year_built, rooms, has_basement, 
      current_value, proposed_value, value_change, percent_change, zoning
    ) VALUES (
      $id, $address, $nid, $sid, $living_area, $building_type,
      $year_built, $rooms, $has_basement,
      $current_value, $proposed_value, $value_change, $percent_change, $zoning
    )
  `);

  let count = 0;
  for (const p of propertiesData) {
    propStmt.run({
      $id: p.id,
      $address: p.address,
      $nid: neighIdMap.get(p.neighborhood),
      $sid: streetIdMap.get(p.street),
      $living_area: p.livingArea,
      $building_type: p.buildingType,
      $year_built: p.yearBuilt,
      $rooms: p.rooms,
      $has_basement: p.hasBasement,
      $current_value: p.currentValue,
      $proposed_value: p.proposedValue,
      $value_change: p.valueChange,
      $percent_change: p.percentChange,
      $zoning: p.zoning
    });
    count++;
    if (count % 10000 === 0) process.stdout.write('.');
  }
  propStmt.free();
  db.run("COMMIT");

  console.log(`\nSaving database...`);
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
  console.log(`Saved database to ${DB_PATH} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

  // GZIP Compression
  // Import zlib
  const zlib = await import('zlib');
  const { promisify } = await import('util');
  const gzip = promisify(zlib.gzip);

  console.log(`Compressing database...`);
  const compressed = await gzip(buffer);
  fs.writeFileSync(`${DB_PATH}.gz`, compressed);
  console.log(`Saved compressed database to ${DB_PATH}.gz (${(compressed.length / 1024 / 1024).toFixed(2)} MB)`);
};

processFile().catch(err => {
  console.error(err);
  process.exit(1);
});
