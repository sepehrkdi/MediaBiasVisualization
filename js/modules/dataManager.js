/**
 * Data Manager Module
 * Handles data loading, caching, and transformations
 */

export class DataManager {
    constructor() {
        this.cache = new Map();
        this.loadingPromises = new Map();
    }

    /**
     * Load JSON data with caching
     * @param {string} path - Path to JSON file
     * @returns {Promise<Object>} Parsed JSON data
     */
    async loadJSON(path) {
        // Return cached data if available
        if (this.cache.has(path)) {
            return this.cache.get(path);
        }

        // Return existing promise if already loading
        if (this.loadingPromises.has(path)) {
            return this.loadingPromises.get(path);
        }

        // Create new loading promise
        const loadPromise = this._fetchJSON(path);
        this.loadingPromises.set(path, loadPromise);

        try {
            const data = await loadPromise;
            this.cache.set(path, data);
            return data;
        } finally {
            this.loadingPromises.delete(path);
        }
    }

    /**
     * Fetch JSON from path
     * @private
     */
    async _fetchJSON(path) {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load ${path}: ${response.status}`);
        }
        return response.json();
    }

    /**
     * Load CSV data
     * @param {string} path - Path to CSV file
     * @returns {Promise<Array>} Parsed CSV data
     */
    async loadCSV(path) {
        if (this.cache.has(path)) {
            return this.cache.get(path);
        }

        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load ${path}: ${response.status}`);
        }

        const text = await response.text();
        const data = this.parseCSV(text);
        this.cache.set(path, data);
        return data;
    }

    /**
     * Parse CSV text to array of objects
     * @param {string} text - CSV text
     * @returns {Array} Array of objects
     */
    parseCSV(text) {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

        return lines.slice(1).map(line => {
            const values = this.parseCSVLine(line);
            const obj = {};
            headers.forEach((header, i) => {
                let value = values[i];
                // Try to parse numbers
                if (!isNaN(value) && value !== '') {
                    value = parseFloat(value);
                }
                obj[header] = value;
            });
            return obj;
        });
    }

    /**
     * Parse a single CSV line handling quoted values
     * @param {string} line - CSV line
     * @returns {Array} Array of values
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        return values;
    }

    /**
     * Clear cache for a specific path or all data
     * @param {string} [path] - Optional specific path to clear
     */
    clearCache(path) {
        if (path) {
            this.cache.delete(path);
        } else {
            this.cache.clear();
        }
    }

    /**
     * Transform data for specific chart types
     */

    /**
     * Aggregate data by a key field
     * @param {Array} data - Array of data objects
     * @param {string} key - Key to group by
     * @param {string} valueField - Field to aggregate
     * @param {string} [aggregation='sum'] - Aggregation type
     * @returns {Array} Aggregated data
     */
    aggregateBy(data, key, valueField, aggregation = 'sum') {
        const groups = new Map();

        data.forEach(item => {
            const groupKey = item[key];
            if (!groups.has(groupKey)) {
                groups.set(groupKey, []);
            }
            groups.get(groupKey).push(item[valueField]);
        });

        const aggregators = {
            sum: arr => arr.reduce((a, b) => a + b, 0),
            mean: arr => arr.reduce((a, b) => a + b, 0) / arr.length,
            count: arr => arr.length,
            min: arr => Math.min(...arr),
            max: arr => Math.max(...arr),
            median: arr => {
                const sorted = [...arr].sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
            }
        };

        const aggregate = aggregators[aggregation] || aggregators.sum;

        return Array.from(groups.entries()).map(([k, values]) => ({
            [key]: k,
            value: aggregate(values),
            count: values.length
        }));
    }

    /**
     * Calculate moving average
     * @param {Array} data - Array of values
     * @param {number} window - Window size
     * @returns {Array} Moving average values
     */
    movingAverage(data, window) {
        return data.map((_, i) => {
            const start = Math.max(0, i - Math.floor(window / 2));
            const end = Math.min(data.length, i + Math.ceil(window / 2));
            const slice = data.slice(start, end);
            return slice.reduce((a, b) => a + b, 0) / slice.length;
        });
    }

    /**
     * Normalize values to 0-1 range
     * @param {Array} data - Array of values
     * @returns {Array} Normalized values
     */
    normalize(data) {
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min;

        if (range === 0) return data.map(() => 0.5);

        return data.map(v => (v - min) / range);
    }

    /**
     * Calculate confidence interval
     * @param {Array} data - Array of values
     * @param {number} [confidence=0.95] - Confidence level
     * @returns {Object} Object with mean, lower, upper
     */
    confidenceInterval(data, confidence = 0.95) {
        const n = data.length;
        const mean = data.reduce((a, b) => a + b, 0) / n;
        const stdDev = Math.sqrt(
            data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / (n - 1)
        );

        // Z-score for confidence level (approximation)
        const zScores = { 0.90: 1.645, 0.95: 1.96, 0.99: 2.576 };
        const z = zScores[confidence] || 1.96;

        const margin = z * (stdDev / Math.sqrt(n));

        return {
            mean,
            lower: mean - margin,
            upper: mean + margin,
            stdDev,
            n
        };
    }

    /**
     * Filter data by date range
     * @param {Array} data - Array of data objects
     * @param {string} dateField - Name of date field
     * @param {Date|string} start - Start date
     * @param {Date|string} end - End date
     * @returns {Array} Filtered data
     */
    filterByDateRange(data, dateField, start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);

        return data.filter(item => {
            const date = new Date(item[dateField]);
            return date >= startDate && date <= endDate;
        });
    }

    /**
     * Bin continuous data into categories
     * @param {Array} data - Array of values
     * @param {number} bins - Number of bins
     * @returns {Array} Binned data with counts
     */
    binData(data, bins = 10) {
        const min = Math.min(...data);
        const max = Math.max(...data);
        const binWidth = (max - min) / bins;

        const binned = Array(bins).fill(0).map((_, i) => ({
            binStart: min + i * binWidth,
            binEnd: min + (i + 1) * binWidth,
            count: 0,
            values: []
        }));

        data.forEach(value => {
            const binIndex = Math.min(
                Math.floor((value - min) / binWidth),
                bins - 1
            );
            binned[binIndex].count++;
            binned[binIndex].values.push(value);
        });

        return binned;
    }
}
