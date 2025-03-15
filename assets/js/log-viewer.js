/**
 * GWAS.tools Log Viewer
 * 
 * A comprehensive log viewing and filtering component for the GWAS.tools logging system.
 * This component provides functionality to fetch, display, filter, and analyze log data
 * from various sources in the GWAS ecosystem.
 * 
 * Features:
 * - Real-time log updates
 * - Advanced filtering by type, source, and time range
 * - Search functionality
 * - Pagination
 * - Statistics and metrics
 * - Export capabilities
 * 
 * @version 1.0.0
 * @author GWAS Team
 */

class LogViewer {
    /**
     * Initialize the LogViewer
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        // Default settings
        this.settings = {
            // DOM element to render the log viewer
            container: options.container || '#log-viewer',

            // GitHub Gist ID for fetching logs
            gistId: options.gistId || '',

            // Gist filename (usually gwas_logs.csv)
            gistFilename: options.gistFilename || 'gwas_logs.csv',

            // How often to refresh the logs (in milliseconds)
            refreshInterval: options.refreshInterval || 30000,

            // Maximum number of entries to display
            maxEntries: options.maxEntries || 1000,

            // Default page size for pagination
            pageSize: options.pageSize || 50,

            // Default page number
            currentPage: options.currentPage || 1,

            // Default time range
            timeRange: options.timeRange || 'last-day',

            // Log types to include
            logTypes: options.logTypes || [
                'system', 'user', 'api', 'error', 'warning', 'info'
            ],

            // Sources to include
            sources: options.sources || [
                'gwas.engineer', 'gwas.app', 'gwas.ai',
                'gwas.dev', 'gwas.network', 'gwas.wiki'
            ],

            // Default sort order
            sortOrder: options.sortOrder || 'newest',

            // Default theme
            theme: options.theme || 'system',

            // Show timestamps by default
            showTimestamps: options.showTimestamps !== undefined ? options.showTimestamps : true,

            // Enable real-time updates
            realTimeUpdates: options.realTimeUpdates !== undefined ? options.realTimeUpdates : true,

            // Enable local storage of preferences
            useLocalStorage: options.useLocalStorage !== undefined ? options.useLocalStorage : true
        };

        // Internal state
        this.state = {
            // Raw logs data
            logs: [],

            // Filtered logs based on current filters
            filteredLogs: [],

            // Current page of logs being displayed
            displayedLogs: [],

            // Whether logs are currently being fetched
            isLoading: false,

            // Any error that occurred during loading
            error: null,

            // When logs were last updated
            lastUpdated: null,

            // Current search text
            searchText: '',

            // Active filters
            activeFilters: {
                types: new Set(this.settings.logTypes),
                sources: new Set(this.settings.sources),
                timeRange: this.settings.timeRange,
                dateFrom: null,
                dateTo: null
            },

            // Statistics
            stats: {
                totalLogs: 0,
                errorRate: 0,
                activeSources: 0,
                logsByType: {},
                logsBySource: {}
            },

            // Pagination state
            pagination: {
                currentPage: this.settings.currentPage,
                pageSize: this.settings.pageSize,
                totalPages: 1
            }
        };

        // Initialize
        this.init();
    }

    /**
     * Initialize the log viewer component
     */
    init() {
        // Get container element
        this.container = document.querySelector(this.settings.container);

        if (!this.container) {
            console.error(`Log viewer container not found: ${this.settings.container}`);
            return;
        }

        // Load saved preferences from local storage
        if (this.settings.useLocalStorage) {
            this.loadPreferences();
        }

        // Set up event handlers
        this.setupEventHandlers();

        // Fetch initial log data
        this.fetchLogs();

        // Set up auto-refresh if enabled
        if (this.settings.realTimeUpdates && this.settings.refreshInterval > 0) {
            this.startAutoRefresh();
        }

        // Set up theme based on preference
        this.applyTheme(this.settings.theme);

        console.log('GWAS.tools Log Viewer initialized');
    }

    /**
     * Set up event handlers for interactive elements
     */
    setupEventHandlers() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-logs');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.fetchLogs());
        }

        // Export button
        const exportBtn = document.getElementById('export-logs');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportLogs());
        }

        // Search input
        const searchInput = document.getElementById('log-search');
        const searchButton = document.getElementById('search-button');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.state.searchText = e.target.value;
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.applyFilters();
                }
            });
        }

        if (searchButton) {
            searchButton.addEventListener('click', () => this.applyFilters());
        }

        // Log type filters
        const typeCheckboxes = document.querySelectorAll('input[name="log-type"]');
        typeCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.value === 'all') {
                    // Handle 'All Types' checkbox
                    const isChecked = e.target.checked;
                    typeCheckboxes.forEach(cb => {
                        if (cb.value !== 'all') {
                            cb.checked = isChecked;

                            if (isChecked) {
                                this.state.activeFilters.types.add(cb.value);
                            } else {
                                this.state.activeFilters.types.delete(cb.value);
                            }
                        }
                    });
                } else {
                    // Handle individual type checkbox
                    if (e.target.checked) {
                        this.state.activeFilters.types.add(e.target.value);
                    } else {
                        this.state.activeFilters.types.delete(e.target.value);

                        // Uncheck 'All Types' if any individual type is unchecked
                        const allTypesCheckbox = document.querySelector('input[name="log-type"][value="all"]');
                        if (allTypesCheckbox) {
                            allTypesCheckbox.checked = false;
                        }
                    }
                }
            });
        });

        // Source filters
        const sourceCheckboxes = document.querySelectorAll('input[name="source"]');
        sourceCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.value === 'all') {
                    // Handle 'All Sources' checkbox
                    const isChecked = e.target.checked;
                    sourceCheckboxes.forEach(cb => {
                        if (cb.value !== 'all') {
                            cb.checked = isChecked;

                            if (isChecked) {
                                this.state.activeFilters.sources.add(cb.value);
                            } else {
                                this.state.activeFilters.sources.delete(cb.value);
                            }
                        }
                    });
                } else {
                    // Handle individual source checkbox
                    if (e.target.checked) {
                        this.state.activeFilters.sources.add(e.target.value);
                    } else {
                        this.state.activeFilters.sources.delete(e.target.value);

                        // Uncheck 'All Sources' if any individual source is unchecked
                        const allSourcesCheckbox = document.querySelector('input[name="source"][value="all"]');
                        if (allSourcesCheckbox) {
                            allSourcesCheckbox.checked = false;
                        }
                    }
                }
            });
        });

        // Time range selector
        const timeRangeSelect = document.getElementById('time-range');
        const customDateRange = document.getElementById('custom-date-range');
        const dateFromInput = document.getElementById('date-from');
        const dateToInput = document.getElementById('date-to');

        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', (e) => {
                this.state.activeFilters.timeRange = e.target.value;

                if (e.target.value === 'custom' && customDateRange) {
                    customDateRange.style.display = 'block';
                } else if (customDateRange) {
                    customDateRange.style.display = 'none';
                }
            });
        }

        if (dateFromInput) {
            dateFromInput.addEventListener('change', (e) => {
                this.state.activeFilters.dateFrom = e.target.value;
            });
        }

        if (dateToInput) {
            dateToInput.addEventListener('change', (e) => {
                this.state.activeFilters.dateTo = e.target.value;
            });
        }

        // Apply filters button
        const applyFiltersBtn = document.getElementById('apply-filters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        }

        // Reset filters button
        const resetFiltersBtn = document.getElementById('reset-filters');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => this.resetFilters());
        }

        // Pagination controls
        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');
        const pageSizeSelect = document.getElementById('page-size');

        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                if (this.state.pagination.currentPage > 1) {
                    this.state.pagination.currentPage--;
                    this.updateDisplayedLogs();
                }
            });
        }

        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                if (this.state.pagination.currentPage < this.state.pagination.totalPages) {
                    this.state.pagination.currentPage++;
                    this.updateDisplayedLogs();
                }
            });
        }

        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.state.pagination.pageSize = parseInt(e.target.value);
                this.state.pagination.currentPage = 1; // Reset to first page
                this.updatePagination();
                this.updateDisplayedLogs();
            });
        }
    }

    /**
     * Start automatic refresh of logs
     */
    startAutoRefresh() {
        this.refreshTimer = setInterval(() => {
            this.fetchLogs();
        }, this.settings.refreshInterval);

        console.log(`Auto-refresh enabled, interval: ${this.settings.refreshInterval}ms`);
    }

    /**
     * Stop automatic refresh of logs
     */
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
            console.log('Auto-refresh disabled');
        }
    }

    /**
     * Apply the selected theme
     * @param {string} theme - 'light', 'dark', or 'system'
     */
    applyTheme(theme) {
        document.body.classList.remove('theme-light', 'theme-dark');

        if (theme === 'system') {
            // Check system preference
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
        } else {
            document.body.classList.add(`theme-${theme}`);
        }

        this.settings.theme = theme;
    }

    /**
     * Fetch logs from the GitHub Gist
     */
    async fetchLogs() {
        if (this.state.isLoading) return;

        this.state.isLoading = true;
        this.updateLoadingState();

        try {
            let logs = [];
            let foundGist = false;

            // Try to get logs from Gist if we have an ID
            if (this.settings.gistId && this.settings.gistId !== '<!-- YOUR_GIST_ID_GOES_HERE -->') {
                try {
                    logs = await this.fetchLogsFromGist(this.settings.gistId, this.settings.gistFilename);
                    foundGist = true;
                } catch (gistError) {
                    console.warn('Error fetching from Gist:', gistError);
                    foundGist = false;
                }
            } else {
                // Look for Gist ID embedded in page
                const gistIdElement = document.getElementById('gist-id');
                if (gistIdElement && gistIdElement.textContent &&
                    gistIdElement.textContent.trim() !== '' &&
                    gistIdElement.textContent.trim() !== '<!-- YOUR_GIST_ID_GOES_HERE -->') {
                    try {
                        this.settings.gistId = gistIdElement.textContent.trim();
                        logs = await this.fetchLogsFromGist(this.settings.gistId, this.settings.gistFilename);
                        foundGist = true;
                    } catch (gistError) {
                        console.warn('Error fetching from embedded Gist ID:', gistError);
                        foundGist = false;
                    }
                }
            }

            // If no Gist logs found, use dummy data
            if (!foundGist) {
                console.log('No valid Gist ID found, using dummy data');
                logs = this.getDummyLogs();
            }

            this.state.logs = logs;
            this.state.lastUpdated = new Date();
            this.state.error = null;

            // Update statistics
            this.calculateStatistics();

            // Apply filters to the new logs
            this.applyFilters();

            console.log(`Fetched ${logs.length} logs (${foundGist ? 'from Gist' : 'dummy data'})`);
        } catch (error) {
            console.error('Error in fetchLogs:', error);
            this.state.error = error.message || 'Failed to fetch logs';

            // Always ensure we have some data to display
            if (this.state.logs.length === 0) {
                console.warn('Falling back to dummy data');
                this.state.logs = this.getDummyLogs();
                this.calculateStatistics();
                this.applyFilters();
            }
        } finally {
            this.state.isLoading = false;
            this.updateLoadingState();
            this.updateLastUpdateTime();
        }
    }

    /**
     * Fetch logs from a GitHub Gist
     * @param {string} gistId - The ID of the GitHub Gist
     * @param {string} filename - The filename within the Gist
     * @returns {Array} - Array of log objects
     */
    async fetchLogsFromGist(gistId, filename) {
        console.log(`Fetching logs from Gist ${gistId}, file: ${filename}`);

        // Fetch the Gist data
        const response = await fetch(`https://api.github.com/gists/${gistId}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch Gist: ${response.status} ${response.statusText}`);
        }

        const gistData = await response.json();

        // Check if the file exists in the Gist
        if (!gistData.files || !gistData.files[filename]) {
            throw new Error(`File ${filename} not found in Gist`);
        }

        // Get the raw content URL for the file
        const rawUrl = gistData.files[filename].raw_url;

        // Fetch the raw content
        const rawResponse = await fetch(rawUrl);

        if (!rawResponse.ok) {
            throw new Error(`Failed to fetch raw file: ${rawResponse.status} ${rawResponse.statusText}`);
        }

        const csvContent = await rawResponse.text();

        // Parse the CSV data into log objects
        return this.parseCSVToLogs(csvContent);
    }

    /**
     * Parse CSV content into log objects
     * @param {string} csvContent - CSV content from the Gist
     * @returns {Array} - Array of log objects
     */
    parseCSVToLogs(csvContent) {
        // Split by lines
        const lines = csvContent.trim().split('\n');

        // Ensure there's at least a header and one line of data
        if (lines.length < 2) {
            return [];
        }

        // Skip the header row and process each line
        const logs = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue; // Skip empty lines

            // Parse the CSV line, handling quoted values properly
            const values = this.parseCSVLine(line);

            if (values.length >= 5) {
                const [timestamp, type, source, message, detailsStr] = values;

                // Parse details if available
                let details = null;
                if (detailsStr && detailsStr.trim()) {
                    details = {};
                    const detailPairs = detailsStr.split(',');
                    detailPairs.forEach(pair => {
                        const [key, value] = pair.split('=');
                        if (key && value) {
                            details[key.trim()] = value.trim();
                        }
                    });
                }

                logs.push({
                    timestamp,
                    type: type.replace(/"/g, ''),
                    source: source.replace(/"/g, ''),
                    message: message.replace(/"/g, ''),
                    details
                });
            }
        }

        return logs;
    }

    /**
     * Parse a CSV line, handling quoted values properly
     * @param {string} line - A line from the CSV file
     * @returns {Array} - Array of field values
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                // If we have a double quote inside quotes, it's an escaped quote
                if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++; // Skip the next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // End of field
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        // Don't forget the last field
        result.push(current);

        return result;
    }

    /**
     * Apply current filters to the logs
     */
    applyFilters() {
        const { searchText, activeFilters } = this.state;

        // Start with all logs
        let filtered = this.state.logs;

        // Filter by type
        if (activeFilters.types.size > 0) {
            filtered = filtered.filter(log => activeFilters.types.has(log.type));
        }

        // Filter by source
        if (activeFilters.sources.size > 0) {
            filtered = filtered.filter(log => activeFilters.sources.has(log.source));
        }

        // Filter by time range
        filtered = this.filterByTimeRange(filtered);

        // Filter by search text
        if (searchText) {
            const searchLower = searchText.toLowerCase();
            filtered = filtered.filter(log => {
                return (
                    (log.message && log.message.toLowerCase().includes(searchLower)) ||
                    (log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower)) ||
                    (log.source && log.source.toLowerCase().includes(searchLower)) ||
                    (log.type && log.type.toLowerCase().includes(searchLower))
                );
            });
        }

        // Sort logs (newest first by default)
        if (this.settings.sortOrder === 'newest') {
            filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } else {
            filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }

        this.state.filteredLogs = filtered;

        // Update pagination
        this.updatePagination();

        // Update displayed logs
        this.updateDisplayedLogs();

        console.log(`Applied filters: ${filtered.length} logs match current criteria`);
    }

    /**
     * Filter logs by the selected time range
     * @param {Array} logs - The logs to filter
     * @returns {Array} - Filtered logs
     */
    filterByTimeRange(logs) {
        const { timeRange, dateFrom, dateTo } = this.state.activeFilters;
        const now = new Date();

        if (timeRange === 'custom' && dateFrom && dateTo) {
            // Custom date range
            const fromDate = new Date(dateFrom);
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999); // End of day

            return logs.filter(log => {
                const logDate = new Date(log.timestamp);
                return logDate >= fromDate && logDate <= toDate;
            });
        }

        // Predefined time ranges
        let cutoffDate;

        switch (timeRange) {
            case 'last-hour':
                cutoffDate = new Date(now.getTime() - 60 * 60 * 1000);
                break;
            case 'last-day':
                cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'last-week':
                cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'last-month':
                cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                return logs; // No filtering if invalid range
        }

        return logs.filter(log => new Date(log.timestamp) >= cutoffDate);
    }

    /**
     * Update pagination information
     */
    updatePagination() {
        const { filteredLogs } = this.state;
        const { pageSize } = this.state.pagination;

        // Calculate total pages
        const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));

        // Update pagination state
        this.state.pagination.totalPages = totalPages;

        // Ensure current page is valid
        if (this.state.pagination.currentPage > totalPages) {
            this.state.pagination.currentPage = totalPages;
        }

        // Update UI
        const pageInfo = document.getElementById('page-info');
        if (pageInfo) {
            pageInfo.textContent = `Page ${this.state.pagination.currentPage} of ${totalPages}`;
        }

        // Update button states
        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');

        if (prevPageBtn) {
            prevPageBtn.disabled = this.state.pagination.currentPage <= 1;
        }

        if (nextPageBtn) {
            nextPageBtn.disabled = this.state.pagination.currentPage >= totalPages;
        }
    }

    /**
     * Update the displayed logs based on current page
     */
    updateDisplayedLogs() {
        const { filteredLogs } = this.state;
        const { currentPage, pageSize } = this.state.pagination;

        // Calculate start and end indices
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, filteredLogs.length);

        // Get logs for the current page
        this.state.displayedLogs = filteredLogs.slice(startIndex, endIndex);

        // Render logs
        this.renderLogs();
    }

    /**
     * Reset all filters to their default values
     */
    resetFilters() {
        // Reset checkboxes
        const allTypeCheckboxes = document.querySelectorAll('input[name="log-type"]');
        const allSourceCheckboxes = document.querySelectorAll('input[name="source"]');

        allTypeCheckboxes.forEach(cb => { cb.checked = true; });
        allSourceCheckboxes.forEach(cb => { cb.checked = true; });

        // Reset search
        const searchInput = document.getElementById('log-search');
        if (searchInput) {
            searchInput.value = '';
        }

        // Reset time range
        const timeRangeSelect = document.getElementById('time-range');
        if (timeRangeSelect) {
            timeRangeSelect.value = 'last-day';
        }

        // Hide custom date range
        const customDateRange = document.getElementById('custom-date-range');
        if (customDateRange) {
            customDateRange.style.display = 'none';
        }

        // Reset state
        this.state.searchText = '';
        this.state.activeFilters = {
            types: new Set(this.settings.logTypes),
            sources: new Set(this.settings.sources),
            timeRange: 'last-day',
            dateFrom: null,
            dateTo: null
        };

        // Apply reset filters
        this.applyFilters();

        console.log('Filters reset to defaults');
    }

    /**
     * Calculate statistics from the current logs
     */
    calculateStatistics() {
        const { logs } = this.state;

        // Total number of logs
        this.state.stats.totalLogs = logs.length;

        // Error rate
        const errorLogs = logs.filter(log => log.type === 'error');
        this.state.stats.errorRate = logs.length > 0 ? (errorLogs.length / logs.length) * 100 : 0;

        // Count active sources
        const uniqueSources = new Set(logs.map(log => log.source));
        this.state.stats.activeSources = uniqueSources.size;

        // Count logs by type
        const logsByType = {};
        logs.forEach(log => {
            logsByType[log.type] = (logsByType[log.type] || 0) + 1;
        });
        this.state.stats.logsByType = logsByType;

        // Count logs by source
        const logsBySource = {};
        logs.forEach(log => {
            logsBySource[log.source] = (logsBySource[log.source] || 0) + 1;
        });
        this.state.stats.logsBySource = logsBySource;

        // Update statistics display
        this.updateStatisticsDisplay();
    }

    /**
     * Update the statistics display in the UI
     */
    updateStatisticsDisplay() {
        const { stats } = this.state;

        // Update total logs
        const totalLogsElement = document.querySelector('.stat-card:nth-child(1) .stat-value');
        if (totalLogsElement) {
            totalLogsElement.textContent = stats.totalLogs.toLocaleString();
        }

        // Update error rate
        const errorRateElement = document.querySelector('.stat-card:nth-child(2) .stat-value');
        if (errorRateElement) {
            errorRateElement.textContent = stats.errorRate.toFixed(1) + '%';
        }

        // Update active sources
        const activeSourcesElement = document.querySelector('.stat-card:nth-child(3) .stat-value');
        if (activeSourcesElement) {
            activeSourcesElement.textContent = stats.activeSources;
        }
    }

    /**
     * Update the last update time display
     */
    updateLastUpdateTime() {
        const lastUpdateElement = document.getElementById('last-update-time');
        if (lastUpdateElement && this.state.lastUpdated) {
            const timeDiff = Math.floor((new Date() - this.state.lastUpdated) / 1000);

            if (timeDiff < 60) {
                lastUpdateElement.textContent = `${timeDiff} seconds ago`;
            } else if (timeDiff < 3600) {
                lastUpdateElement.textContent = `${Math.floor(timeDiff / 60)} minutes ago`;
            } else {
                lastUpdateElement.textContent = this.state.lastUpdated.toLocaleTimeString();
            }
        }
    }

    /**
     * Update the loading state UI
     */
    updateLoadingState() {
        const loadingSpinner = document.querySelector('.loading-spinner');

        if (loadingSpinner) {
            loadingSpinner.style.display = this.state.isLoading ? 'block' : 'none';
        }

        // Show error if any
        if (this.state.error) {
            this.showErrorMessage(this.state.error);
        } else {
            this.clearErrorMessage();
        }
    }

    /**
     * Show an error message
     * @param {string} message - The error message to display
     */
    showErrorMessage(message) {
        let errorElement = document.querySelector('.log-error-message');

        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'log-error-message';
            this.container.appendChild(errorElement);
        }

        errorElement.textContent = `Error: ${message}`;
        errorElement.style.display = 'block';
    }

    /**
     * Clear any displayed error message
     */
    clearErrorMessage() {
        const errorElement = document.querySelector('.log-error-message');

        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    /**
     * Render the current logs to the UI
     */
    renderLogs() {
        const logContainer = document.querySelector('.log-viewer');

        if (!logContainer) {
            console.error('Log container not found');
            return;
        }

        // Clear previous logs while preserving the loading spinner
        const loadingSpinner = logContainer.querySelector('.loading-spinner');
        logContainer.innerHTML = '';

        // Add back the spinner (it will be hidden through CSS if not loading)
        if (loadingSpinner) {
            logContainer.appendChild(loadingSpinner);
        }

        // If no logs, show a message
        if (this.state.displayedLogs.length === 0) {
            const noLogsMessage = document.createElement('div');
            noLogsMessage.className = 'no-logs-message';
            noLogsMessage.textContent = 'No logs match your current filters.';
            logContainer.appendChild(noLogsMessage);
            return;
        }

        // Create a table for the logs
        const table = document.createElement('table');
        table.className = 'log-table';

        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        // Define columns
        const columns = [
            { id: 'timestamp', label: 'Timestamp' },
            { id: 'source', label: 'Source' },
            { id: 'type', label: 'Type' },
            { id: 'message', label: 'Message' },
            { id: 'details', label: 'Details' }
        ];

        columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column.label;
            th.dataset.column = column.id;
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');

        // Add log entries
        this.state.displayedLogs.forEach(log => {
            const row = document.createElement('tr');
            row.className = `log-entry log-type-${log.type}`;

            // Timestamp
            const timestampCell = document.createElement('td');
            timestampCell.className = 'log-timestamp';
            timestampCell.textContent = this.formatTimestamp(log.timestamp);
            row.appendChild(timestampCell);

            // Source
            const sourceCell = document.createElement('td');
            sourceCell.className = 'log-source';
            sourceCell.textContent = log.source;
            row.appendChild(sourceCell);

            // Type
            const typeCell = document.createElement('td');
            typeCell.className = 'log-type';
            typeCell.textContent = log.type;
            row.appendChild(typeCell);

            // Message
            const messageCell = document.createElement('td');
            messageCell.className = 'log-message';
            messageCell.textContent = log.message;
            row.appendChild(messageCell);

            // Details
            const detailsCell = document.createElement('td');
            detailsCell.className = 'log-details';

            if (log.details && Object.keys(log.details).length > 0) {
                const detailsText = this.formatDetails(log.details);
                detailsCell.innerHTML = detailsText;
            } else {
                detailsCell.textContent = '-';
            }

            row.appendChild(detailsCell);

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        logContainer.appendChild(table);

        console.log(`Rendered ${this.state.displayedLogs.length} logs`);
    }

    /**
     * Format a timestamp for display
     * @param {string} timestamp - ISO timestamp
     * @returns {string} - Formatted timestamp
     */
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    /**
     * Format log details for display
     * @param {Object} details - Log details object
     * @returns {string} - Formatted HTML
     */
    formatDetails(details) {
        if (!details) return '';

        return Object.entries(details)
            .map(([key, value]) => {
                const valueStr = typeof value === 'object'
                    ? JSON.stringify(value)
                    : this.escapeHTML(String(value));

                return `<span class="detail-item">
                    <span class="detail-key">${this.escapeHTML(key)}:</span>
                    <span class="detail-value">${valueStr}</span>
                </span>`;
            })
            .join(' ');
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} - Escaped string
     */
    escapeHTML(str) {
        if (!str) return '';

        return str.replace(/[&<>"']/g, (match) => {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }

    /**
     * Export logs to a file
     */
    exportLogs() {
        const logs = this.state.filteredLogs;
        const filename = `gwas-logs-export-${new Date().toISOString().split('T')[0]}.json`;

        // Create a Blob with the logs data
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });

        // Create a download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;

        // Append to body, click, and remove
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        console.log(`Exported ${logs.length} logs to ${filename}`);
    }

    /**
     * Save user preferences to local storage
     */
    savePreferences() {
        if (!this.settings.useLocalStorage) return;

        const preferences = {
            theme: this.settings.theme,
            pageSize: this.state.pagination.pageSize,
            timeRange: this.state.activeFilters.timeRange,
            showTimestamps: this.settings.showTimestamps
        };

        try {
            localStorage.setItem('gwas-log-viewer-prefs', JSON.stringify(preferences));
        } catch (error) {
            console.warn('Failed to save preferences to local storage:', error);
        }
    }

    /**
     * Load user preferences from local storage
     */
    loadPreferences() {
        if (!this.settings.useLocalStorage) return;

        try {
            const savedPrefs = localStorage.getItem('gwas-log-viewer-prefs');

            if (savedPrefs) {
                const prefs = JSON.parse(savedPrefs);

                // Apply saved preferences
                if (prefs.theme) this.settings.theme = prefs.theme;
                if (prefs.pageSize) this.state.pagination.pageSize = prefs.pageSize;
                if (prefs.timeRange) this.state.activeFilters.timeRange = prefs.timeRange;
                if (prefs.showTimestamps !== undefined) this.settings.showTimestamps = prefs.showTimestamps;

                console.log('Loaded saved preferences');
            }
        } catch (error) {
            console.warn('Failed to load preferences from local storage:', error);
        }
    }

    /**
     * Generate dummy log data for testing
     * @returns {Array} - Array of log objects
     */
    getDummyLogs() {
        const types = ['system', 'user', 'api', 'error', 'warning', 'info'];
        const sources = ['gwas.engineer', 'gwas.app', 'gwas.ai', 'gwas.dev', 'gwas.network', 'gwas.wiki'];

        const messages = [
            'User logged in successfully',
            'API request completed',
            'Database query executed',
            'File upload completed',
            'User session expired',
            'Failed to connect to database',
            'Invalid authentication token',
            'System update completed',
            'Cache cleared successfully',
            'Data synchronization started',
            'Configuration file updated',
            'Scheduled task executed',
            'Memory usage exceeds threshold',
            'CPU usage normal',
            'Network connectivity restored',
            'Service restarted automatically',
            'New user registered',
            'Password reset requested',
            'File not found',
            'Permission denied for operation'
        ];

        const now = new Date();
        const logs = [];

        // Generate 1000 random log entries
        for (let i = 0; i < 1000; i++) {
            // Random timestamp within the last month
            const timestamp = new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000);

            // Randomly select type, source, and message
            const type = types[Math.floor(Math.random() * types.length)];
            const source = sources[Math.floor(Math.random() * sources.length)];
            const message = messages[Math.floor(Math.random() * messages.length)];

            // Create some random details
            const details = {};

            if (Math.random() > 0.3) {
                details.duration = Math.floor(Math.random() * 1000);
            }

            if (Math.random() > 0.5) {
                details.userId = `user-${Math.floor(Math.random() * 1000)}`;
            }

            if (Math.random() > 0.7) {
                details.status = Math.random() > 0.9 ? 'error' : 'success';
            }

            if (type === 'error' && Math.random() > 0.5) {
                details.errorCode = Math.floor(Math.random() * 500) + 100;
                details.stackTrace = 'at Function.Module._load (internal/modules/cjs/loader.js:807:14)';
            }

            logs.push({
                timestamp: timestamp.toISOString(),
                type,
                source,
                message,
                details: Object.keys(details).length > 0 ? details : null
            });
        }

        // Sort by timestamp (newest first)
        return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Stop auto-refresh
        this.stopAutoRefresh();

        // Save preferences
        this.savePreferences();

        // Log
        console.log('GWAS.tools Log Viewer destroyed');
    }
}

// Initialize the log viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check for a Gist ID in the page
    let gistId = '';
    const gistIdElement = document.getElementById('gist-id');
    if (gistIdElement) {
        gistId = gistIdElement.textContent.trim();
    }

    // Create and initialize the log viewer
    const logViewer = new LogViewer({
        container: '#log-viewer',
        gistId: gistId,
        gistFilename: 'gwas_logs.csv',
        theme: 'system',
        realTimeUpdates: true,
        refreshInterval: 30000, // 30 seconds
        useLocalStorage: true
    });

    // Keep a reference to the log viewer instance
    window.gwasLogViewer = logViewer;
}); 