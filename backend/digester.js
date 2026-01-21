import fs from "fs";
import path from "path";
import crypto from "crypto";
import { parse } from "csv-parse/sync";

/**
 * CSVDigester handles the ingestion, type inference, normalization, 
 * data quality checks, and compaction of CSV files.
 */
export class CSVDigester {
    constructor(filePath) {
        this.filePath = filePath;
        this.fileName = path.basename(filePath);
        this.rawContent = null;
        this.delimiter = null;
        this.encoding = "utf-8";
        
        // Internal table representation
        this.table = {
            columns: [], // Original column names
            rows: [],    // Array of objects with _row index
            meta: {
                id: crypto.randomUUID?.() || Math.random().toString(36).substring(7),
                name: this.fileName,
                createdAt: new Date().toISOString(),
                delimiter: null,
                encoding: "utf-8",
                rowCount: 0,
                colCount: 0
            }
        };

        // Digest Package output
        this.digest = {
            meta: {},
            shape: {},
            schema: [],
            issues: [],
            samples: {},
            summaries: {},
            reference: {
                citationFormat: "(_row, columnName)",
                method: "exact_match"
            },
            digestVersion: 1
        };
    }

    /**
     * Phase 1: Ingest & Parse
     */
    async ingest() {
        console.log(`[Phase 1] Ingesting: ${this.fileName}`);

        // Read file with UTF-8, fallback if necessary
        try {
            this.rawContent = fs.readFileSync(this.filePath, { encoding: this.encoding });
        } catch (e) {
            console.warn(`Failed to read with ${this.encoding}, trying with buffer...`);
            this.rawContent = fs.readFileSync(this.filePath).toString();
        }

        // Delimiter detection
        this.delimiter = this.detectDelimiter(this.rawContent);
        this.table.meta.delimiter = this.delimiter;

        // Robust parsing
        let records;
        try {
            records = parse(this.rawContent, {
                delimiter: this.delimiter,
                skip_empty_lines: true,
                relax_quotes: true,
                relax_column_count: true,
                trim: true
            });
        } catch (error) {
            throw new Error(`Failed to parse CSV: ${error.message}`);
        }

        if (records.length === 0) {
            throw new Error("CSV file is empty.");
        }

        // Determine headers
        let headers = records[0];
        let dataStartIndex = 1;

        if (this.shouldGenerateHeaders(headers)) {
            console.log("[Phase 1] No headers detected. Generating generic names.");
            headers = headers.map((_, i) => `column_${i + 1}`);
            dataStartIndex = 0;
        }

        // Deduplicate headers to ensure stability
        headers = this.deduplicateHeaders(headers);

        this.table.columns = headers;
        this.table.meta.colCount = headers.length;

        // Build internal rows with stable _row index
        const rawRows = records.slice(dataStartIndex);
        this.table.rows = rawRows.map((row, index) => {
            const rowObj = { _row: index };
            headers.forEach((h, i) => {
                rowObj[h] = row[i] !== undefined ? row[i] : null;
            });
            return rowObj;
        });

        this.table.meta.rowCount = this.table.rows.length;
        this.digest.meta = this.table.meta;
        this.digest.shape = {
            rows: this.table.meta.rowCount,
            cols: this.table.meta.colCount
        };

        console.log(`[Phase 1] Done. Parsed ${this.table.meta.rowCount} rows.`);
        return this;
    }

    /**
     * Phase 2: Type Inference
     */
    async profileTypes() {
        console.log("[Phase 2] Profiling column types...");
        const rowCount = this.table.rows.length;
        if (rowCount === 0) return this;

        const schema = this.table.columns.map(col => {
            return {
                name: col,
                inferredType: "string",
                confidence: 0,
                missingRate: 0,
                distinctCount: 0,
                stats: {
                    empty: 0,
                    boolean: 0,
                    integer: 0,
                    number: 0,
                    date: 0,
                    string: 0
                }
            };
        });

        this.table.columns.forEach((col, colIdx) => {
            const profile = schema[colIdx];
            const distinctValues = new Set();

            this.table.rows.forEach(row => {
                const val = row[col];
                const type = this.detectValueType(val);
                profile.stats[type]++;
                if (type !== "empty") {
                    distinctValues.add(val.toString().trim());
                }
            });

            profile.missingRate = profile.stats.empty / rowCount;
            profile.distinctCount = distinctValues.size;

            const totalPopulated = rowCount - profile.stats.empty;
            if (totalPopulated === 0) {
                profile.inferredType = "empty";
                profile.confidence = 1.0;
            } else {
                const candidates = ["integer", "number", "boolean", "date", "string"];
                let bestType = "string";
                let maxCount = 0;

                candidates.forEach(t => {
                    // Integer is also a number, so we prioritize the more specific one
                    let count = profile.stats[t];
                    if (t === "number") count += profile.stats["integer"];
                    
                    if (count > maxCount) {
                        maxCount = count;
                        bestType = t;
                    }
                });

                profile.inferredType = bestType;
                profile.confidence = maxCount / totalPopulated;
                
                // If confidence is low, call it mixed
                if (profile.confidence < 0.7) {
                    profile.inferredType = "mixed";
                }
            }
        });

        this.digest.schema = schema;
        console.log("[Phase 2] Done.");
        return this;
    }

    /**
     * Phase 3: Normalization
     */
    async normalize() {
        console.log("[Phase 3] Normalizing data...");
        
        const schemaMap = {};
        this.digest.schema.forEach(s => schemaMap[s.name] = s);

        this.table.rows = this.table.rows.map(row => {
            const normalizedRow = { _row: row._row };
            
            this.table.columns.forEach(col => {
                const rawValue = row[col];
                const typeInfo = schemaMap[col];
                
                // Keep original raw for safety
                normalizedRow[`${col}_raw`] = rawValue;
                
                // Normalize
                normalizedRow[col] = this.normalizeValue(rawValue, typeInfo.inferredType);
            });
            
            return normalizedRow;
        });

        console.log("[Phase 3] Done.");
        return this;
    }

    /**
     * Phase 4: Data Quality & Anomaly Detection
     */
    async checkDataQuality() {
        console.log("[Phase 4] Checking data quality...");
        const issues = [];
        const rowCount = this.table.rows.length;

        this.digest.schema.forEach(col => {
            // Column-level checks
            if (col.missingRate > 0.5) {
                issues.push({
                    type: "warning",
                    level: "column",
                    target: col.name,
                    message: `High missingness detected: ${(col.missingRate * 100).toFixed(1)}%`
                });
            }

            if (col.confidence < 0.8 && col.inferredType !== "string" && col.inferredType !== "empty") {
                issues.push({
                    type: "warning",
                    level: "column",
                    target: col.name,
                    message: `Type inconsistency: inferred as ${col.inferredType} but confidence is ${(col.confidence * 100).toFixed(1)}%`
                });
            }
            
            // Extreme string lengths
            if (col.inferredType === "string") {
                const lengths = this.table.rows.map(r => r[col.name]?.toString().length || 0);
                const maxLen = Math.max(...lengths, 0);
                if (maxLen > 1000) {
                    issues.push({
                        type: "info",
                        level: "column",
                        target: col.name,
                        message: `Contains long strings (max length ${maxLen})`
                    });
                }
            }
        });

        // Row-level checks
        const colCount = this.table.columns.length;
        this.table.rows.forEach(row => {
            const nullCount = this.table.columns.filter(col => row[col] === null).length;
            if (nullCount / colCount > 0.8) {
                issues.push({
                    type: "warning",
                    level: "row",
                    target: row._row,
                    message: `Row is mostly empty (${(nullCount / colCount * 100).toFixed(1)}% nulls)`
                });
            }
        });

        this.digest.issues = issues.slice(0, 50); // Cap issues for package size
        console.log("[Phase 4] Done.");
        return this;
    }

    /**
     * Phase 5: Compaction
     */
    async compact() {
        console.log("[Phase 5] Generating compaction samples and summaries...");
        const rows = this.table.rows;
        const N = 5;

        // Sampling
        this.digest.samples = {
            head: rows.slice(0, N),
            tail: rows.slice(-N),
            random: this.getRandomSample(rows, N),
            diverse: this.getDiverseSample(rows, N),
            edge: this.getEdgeSample(rows, N)
        };

        // Summaries
        const summaries = {};
        this.digest.schema.forEach(col => {
            if (col.inferredType === "number" || col.inferredType === "integer") {
                const values = rows.map(r => r[col.name]).filter(v => typeof v === 'number');
                if (values.length > 0) {
                    summaries[col.name] = {
                        min: Math.min(...values),
                        max: Math.max(...values),
                        avg: Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
                    };
                }
            } else if (col.inferredType === "string" && col.distinctCount < 20) {
                const counts = {};
                rows.forEach(r => {
                    const val = r[col.name];
                    if (val !== null) counts[val] = (counts[val] || 0) + 1;
                });
                summaries[col.name] = {
                    topValues: Object.entries(counts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([val, count]) => ({ val, count }))
                };
            }
        });
        this.digest.summaries = summaries;

        console.log("[Phase 5] Done.");
        return this;
    }

    getRandomSample(rows, n) {
        if (rows.length <= n) return rows;
        // Seeded random for reproducibility (simple)
        let seed = 42;
        const random = () => {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };
        const shuffled = [...rows].sort(() => 0.5 - random());
        return shuffled.slice(0, n);
    }

    getDiverseSample(rows, n) {
        if (rows.length <= n) return rows;
        const step = Math.floor(rows.length / n);
        return Array.from({ length: n }, (_, i) => rows[i * step]);
    }

    getEdgeSample(rows, n) {
        const sortedByNulls = [...rows].sort((a, b) => {
            const nullsA = Object.values(a).filter(v => v === null).length;
            const nullsB = Object.values(b).filter(v => v === null).length;
            return nullsB - nullsA;
        });
        return sortedByNulls.slice(0, n);
    }

    /**
     * Phase 6: Indexing (Implicit in row structure)
     */
    async index() {
        console.log("[Phase 6] Indexing completed (stable _row refs assigned).");
        return this;
    }

    /**
     * Phase 7: Storage
     */
    async persist() {
        console.log("[Phase 7] Persisting artifacts...");
        const artifactsDir = path.join(path.dirname(this.filePath), "digests", this.digest.meta.id);
        
        if (!fs.existsSync(artifactsDir)) {
            fs.mkdirSync(artifactsDir, { recursive: true });
        }

        // 1. Raw file copy
        const rawPath = path.join(artifactsDir, "original.csv");
        fs.copyFileSync(this.filePath, rawPath);

        // 2. Normalized table
        const tablePath = path.join(artifactsDir, "table.json");
        fs.writeFileSync(tablePath, JSON.stringify(this.table, null, 2));

        // 3. Digest package
        const digestPath = path.join(artifactsDir, "digest.json");
        fs.writeFileSync(digestPath, JSON.stringify(this.digest, null, 2));

        console.log(`[Phase 7] Artifacts saved to: ${artifactsDir}`);
        
        return {
            artifactsDir,
            digest: this.digest
        };
    }

    /**
     * Run all phases
     */
    async run() {
        await this.ingest();
        await this.profileTypes();
        await this.normalize();
        await this.checkDataQuality();
        await this.compact();
        await this.index();
        return await this.persist();
    }

    detectValueType(val) {
        if (val === null || val === undefined) return "empty";
        const str = val.toString().trim();
        if (str === "" || ["NA", "null", "NULL", "nan", "NaN", "-", "N/A"].includes(str)) return "empty";

        if (/^-?\d+$/.test(str)) return "integer";
        if (/^-?\d*\.\d+$/.test(str)) return "number";
        if (/^(true|false|yes|no|1|0)$/i.test(str)) return "boolean";
        
        // Simple date check
        if (str.length > 5 && !isNaN(Date.parse(str))) {
            // Also ensure it's not just a number being misparsed as a date
            if (!/^\d+$/.test(str)) return "date";
        }

        return "string";
    }

    normalizeValue(val, inferredType) {
        if (val === null || val === undefined) return null;
        const str = val.toString().trim();
        if (str === "" || ["NA", "null", "NULL", "nan", "NaN", "-", "N/A"].includes(str)) return null;

        switch (inferredType) {
            case "integer":
                const i = parseInt(str, 10);
                return isNaN(i) ? str : i;
            case "number":
                const n = parseFloat(str);
                return isNaN(n) ? str : n;
            case "boolean":
                if (/^(true|yes|1)$/i.test(str)) return true;
                if (/^(false|no|0)$/i.test(str)) return false;
                return str;
            case "date":
                const d = new Date(str);
                return isNaN(d.getTime()) ? str : d.toISOString();
            default:
                return str;
        }
    }

    detectDelimiter(text) {
        const potentialDelimiters = [",", ";", "\t", "|"];
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 5);
        
        let bestDelimiter = ",";
        let maxConsistencyScore = -1;

        potentialDelimiters.forEach(delim => {
            const counts = lines.map(line => line.split(delim).length);
            const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
            
            if (avg <= 1) return; // Not enough columns

            // Score: higher average count and lower standard deviation is better
            const variance = counts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / counts.length;
            const score = avg / (Math.sqrt(variance) + 1);

            if (score > maxConsistencyScore) {
                maxConsistencyScore = score;
                bestDelimiter = delim;
            }
        });

        return bestDelimiter;
    }

    shouldGenerateHeaders(firstRow) {
        // Heuristic: If all cells in first row are strings and don't look like data (numbers, dates), keep as headers.
        // If any cell looks like a pure number or date, might be headerless.
        const isNumeric = (str) => !isNaN(parseFloat(str)) && isFinite(str);
        const looksLikeDate = (str) => !isNaN(Date.parse(str)) && str.length > 5;

        const numericCount = firstRow.filter(cell => isNumeric(cell)).length;
        const dateCount = firstRow.filter(cell => looksLikeDate(cell)).length;

        // If more than 30% of the row is numeric or dates, it's likely a data row
        if ((numericCount + dateCount) / firstRow.length > 0.3) {
            return true;
        }

        // If all are strings but some are empty
        if (firstRow.some(cell => cell === "")) return true;

        return false;
    }

    deduplicateHeaders(headers) {
        const counts = {};
        return headers.map(h => {
            let name = h || "unnamed";
            if (counts[name]) {
                counts[name]++;
                return `${name}_${counts[name]}`;
            }
            counts[name] = 1;
            return name;
        });
    }
}
