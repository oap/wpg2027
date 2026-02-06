import initSqlJs, { Database } from 'sql.js';
import { Property, FilterState, SortOption, SortDirection } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/csvParser';

export class DatabaseService {
    private db: Database | null = null;
    private static instance: DatabaseService;
    private initPromise: Promise<void> | null = null;

    private constructor() { }

    static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    async init() {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                const SQL = await initSqlJs({
                    // The wasm file is in the public directory, served at root
                    locateFile: (file) => `/${file}`
                });

                console.log("Fetching compressed database...");
                const response = await fetch('/properties.db.gz');

                if (!response.ok) {
                    throw new Error(`Failed to fetch database: ${response.statusText}`);
                }

                // Decompress the stream
                const ds = new DecompressionStream('gzip');
                const decompressedStream = response.body?.pipeThrough(ds);

                if (!decompressedStream) {
                    throw new Error("Browser does not support piping body through DecompressionStream or body is null");
                }

                const newResponse = new Response(decompressedStream);
                const buffer = await newResponse.arrayBuffer();

                this.db = new SQL.Database(new Uint8Array(buffer));
                console.log("Database loaded successfully");
            } catch (error) {
                console.error("Failed to load database:", error);
                throw error;
            }
        })();

        return this.initPromise;
    }

    getMeta(): { neighborhoods: string[], streets: string[], buildingTypes: string[] } {
        if (!this.db) throw new Error("DB not initialized");

        const neighborhoods = this.db.exec("SELECT name FROM neighborhoods ORDER BY name")[0]?.values.flat() as string[] || [];
        const streets = this.db.exec("SELECT name FROM streets ORDER BY name")[0]?.values.flat() as string[] || [];
        const buildingTypes = this.db.exec("SELECT DISTINCT building_type FROM properties ORDER BY building_type")[0]?.values.flat() as string[] || [];

        return { neighborhoods, streets, buildingTypes };
    }

    // Get pre-calculated average for a neighborhood
    getNeighborhoodAvg(neighborhoodName: string): number {
        if (!this.db) return 0;
        const stmt = this.db.prepare("SELECT avg_percent_change FROM neighborhoods WHERE name = $name");
        stmt.bind({ $name: neighborhoodName });
        if (stmt.step()) {
            const val = stmt.get()[0];
            stmt.free();
            return typeof val === 'number' ? val : 0;
        }
        stmt.free();
        return 0;
    }

    getStreets(neighborhoodName: string): string[] {
        if (!this.db) return [];
        if (neighborhoodName === 'All') {
            return this.db.exec("SELECT name FROM streets ORDER BY name")[0]?.values.flat() as string[] || [];
        }

        const stmt = this.db.prepare(`
            SELECT DISTINCT s.name 
            FROM streets s
            JOIN properties p ON s.id = p.street_id
            JOIN neighborhoods n ON p.neighborhood_id = n.id
            WHERE n.name = $name
            ORDER BY s.name
        `);
        stmt.bind({ $name: neighborhoodName });

        const streets: string[] = [];
        while (stmt.step()) {
            streets.push(stmt.get()[0] as string);
        }
        stmt.free();
        return streets;
    }

    private buildQuery(filters: FilterState): { where: string, params: any[] } {
        let where = 'WHERE 1=1';
        const params: any[] = [];

        if (filters.neighborhood !== 'All') {
            where += ` AND n.name = $neigh`;
            params.push({ '$neigh': filters.neighborhood });
        }
        if (filters.streetName !== 'All') {
            where += ` AND s.name = $street`;
            params.push({ '$street': filters.streetName });
        }
        if (filters.buildingType !== 'All') {
            where += ` AND p.building_type = $type`;
            params.push({ '$type': filters.buildingType });
        }
        if (filters.search) {
            where += ` AND p.address LIKE $search`;
            params.push({ '$search': `%${filters.search}%` });
        }
        if (filters.minArea > 0) {
            where += ` AND p.living_area >= $minArea`;
            params.push({ '$minArea': filters.minArea });
        }
        if (filters.maxArea < 10000) {
            where += ` AND p.living_area <= $maxArea`;
            params.push({ '$maxArea': filters.maxArea });
        }
        return { where, params };
    }

    getStats(filters: FilterState): { count: number, avgChange: number, avgValue: number } {
        if (!this.db) return { count: 0, avgChange: 0, avgValue: 0 };

        console.time("StatsQuery");
        const { where, params } = this.buildQuery(filters);

        // We need joins because filters reference neighborhood/street names
        const sql = `
            SELECT 
                COUNT(*) as count, 
                AVG(p.percent_change) as avg_change, 
                AVG(p.proposed_value) as avg_value 
            FROM properties p
            JOIN neighborhoods n ON p.neighborhood_id = n.id
            JOIN streets s ON p.street_id = s.id
            ${where}
            -- Exclude outliers for stats (e.g. data errors or empty lots turning into houses)
            AND p.current_value > 1000 
            AND p.percent_change < 5000
        `;

        const stmt = this.db.prepare(sql);
        const bindObj = params.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        stmt.bind(bindObj);

        let result = { count: 0, avgChange: 0, avgValue: 0 };
        if (stmt.step()) {
            const row = stmt.getAsObject();
            result = {
                count: row.count as number,
                avgChange: row.avg_change as number || 0,
                avgValue: row.avg_value as number || 0
            };
        }
        stmt.free();
        console.timeEnd("StatsQuery");
        return result;
    }

    getHistogram(filters: FilterState): { name: string, count: number, sortKey: number }[] {
        if (!this.db) return [];

        console.time("HistogramQuery");
        const { where, params } = this.buildQuery(filters);

        // SQLite integer division behaves like floor for positive numbers
        // Bucket size = 5. 
        const sql = `
            SELECT 
                (CAST(p.percent_change AS INTEGER) / 5) * 5 as bucket, 
                COUNT(*) as count
            FROM properties p
            JOIN neighborhoods n ON p.neighborhood_id = n.id
            JOIN streets s ON p.street_id = s.id
            ${where}
            AND p.percent_change BETWEEN -100 AND 2000 -- Sanity limits for chart
            GROUP BY bucket
            ORDER BY bucket
        `;

        const stmt = this.db.prepare(sql);
        const bindObj = params.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        stmt.bind(bindObj);

        const results: { name: string, count: number, sortKey: number }[] = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            const bucket = row.bucket as number;
            const count = row.count as number;
            results.push({
                name: `${bucket}% - ${bucket + 5}%`,
                count,
                sortKey: bucket
            });
        }
        stmt.free();
        console.timeEnd("HistogramQuery");
        return results;
    }

    queryProperties(
        filters: FilterState,
        sort: { key: SortOption, direction: SortDirection }
    ): Property[] {
        if (!this.db) throw new Error("DB not initialized");

        console.time("QueryExecution");

        const { where, params } = this.buildQuery(filters);

        // Join with lookup tables
        let query = `
          SELECT p.*, n.name as neighborhood_name, s.name as street_name 
          FROM properties p
          JOIN neighborhoods n ON p.neighborhood_id = n.id
          JOIN streets s ON p.street_id = s.id
          ${where}
        `;

        const sortMap: Record<string, string> = {
            'address': 'p.address',
            'livingArea': 'p.living_area',
            'currentValue': 'p.current_value',
            'proposedValue': 'p.proposed_value',
            'percentChange': 'p.percent_change',
        };

        const orderCol = sortMap[sort.key] || 'p.percent_change';
        const orderDir = sort.direction === 'asc' ? 'ASC' : 'DESC';

        query += ` ORDER BY ${orderCol} ${orderDir}`;
        query += ` LIMIT 2000`;

        const stmt = this.db.prepare(query);
        const bindObj = params.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        stmt.bind(bindObj);

        const results: Property[] = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            results.push({
                id: row.id as string,
                address: row.address as string,
                // Use joined columns
                streetName: row.street_name as string,
                neighborhood: row.neighborhood_name as string,
                livingArea: row.living_area as number,
                buildingType: row.building_type as string,
                yearBuilt: row.year_built as number,
                rooms: row.rooms as number,
                hasBasement: Boolean(row.has_basement),
                currentValue: row.current_value as number,
                proposedValue: row.proposed_value as number,
                valueChange: row.value_change as number,
                percentChange: row.percent_change as number,
                zoning: row.zoning as string
            });
        }
        stmt.free();

        console.timeEnd("QueryExecution");
        return results;
    }
}

export const dbService = DatabaseService.getInstance();
