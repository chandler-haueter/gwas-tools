/**
 * GWAS.tools - Main JavaScript
 * 
 * Handles core functionality for the GWAS.tools logging site
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize date inputs with today's date
    initializeDateInputs();

    // Set up mobile navigation toggle
    setupMobileNav();

    // Set up custom date range toggle
    setupCustomDateRange();

    // Initialize theme based on system preference or stored preference
    initializeTheme();

    // Set up automatic last update time refresher
    setupLastUpdateTimeRefresher();

    console.log('GWAS.tools main.js initialized');
});

/**
 * Initialize date inputs with sensible defaults
 */
function initializeDateInputs() {
    const dateFromInput = document.getElementById('date-from');
    const dateToInput = document.getElementById('date-to');

    if (dateFromInput && dateToInput) {
        // Set "from" date to 7 days ago
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 7);
        dateFromInput.value = formatDateForInput(fromDate);

        // Set "to" date to today
        const toDate = new Date();
        dateToInput.value = formatDateForInput(toDate);
    }
}

/**
 * Format a date for use in date input fields (YYYY-MM-DD)
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string
 */
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Set up mobile navigation menu toggle
 */
function setupMobileNav() {
    const menuToggle = document.createElement('button');
    menuToggle.className = 'mobile-menu-toggle';
    menuToggle.setAttribute('aria-label', 'Toggle navigation menu');
    menuToggle.innerHTML = '<span></span><span></span><span></span>';

    const header = document.querySelector('header .container');
    const nav = document.querySelector('header nav');

    if (header && nav) {
        // Insert toggle button before navigation
        header.insertBefore(menuToggle, nav);

        // Add event listener to toggle navigation
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('nav-open');
            menuToggle.classList.toggle('open');

            // Update ARIA attributes for accessibility
            const isExpanded = nav.classList.contains('nav-open');
            menuToggle.setAttribute('aria-expanded', isExpanded.toString());
        });

        // Close menu when clicking outside
        document.addEventListener('click', (event) => {
            if (nav.classList.contains('nav-open') &&
                !nav.contains(event.target) &&
                !menuToggle.contains(event.target)) {
                nav.classList.remove('nav-open');
                menuToggle.classList.remove('open');
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
}

/**
 * Set up custom date range visibility toggle
 */
function setupCustomDateRange() {
    const timeRangeSelect = document.getElementById('time-range');
    const customDateRange = document.getElementById('custom-date-range');

    if (timeRangeSelect && customDateRange) {
        // Initial state based on selected option
        customDateRange.style.display =
            timeRangeSelect.value === 'custom' ? 'block' : 'none';

        // Update when selection changes
        timeRangeSelect.addEventListener('change', () => {
            customDateRange.style.display =
                timeRangeSelect.value === 'custom' ? 'block' : 'none';
        });
    }
}

/**
 * Initialize theme based on system preference or stored preference
 */
function initializeTheme() {
    // Check for stored preference
    let theme = localStorage.getItem('gwas-theme');

    // If no stored preference, use system default
    if (!theme) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Apply theme
    document.body.classList.add(`theme-${theme}`);

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (localStorage.getItem('gwas-theme') === null) {
            // Only update if user hasn't set a preference
            document.body.classList.remove('theme-light', 'theme-dark');
            document.body.classList.add(`theme-${e.matches ? 'dark' : 'light'}`);
        }
    });
}

/**
 * Set up automatic refresher for "last update time" display
 */
function setupLastUpdateTimeRefresher() {
    const lastUpdateElement = document.getElementById('last-update-time');

    if (lastUpdateElement) {
        // Update the time display every 30 seconds
        setInterval(() => {
            // If the log viewer has set a data attribute with the actual timestamp,
            // we can use that to calculate a relative time
            const timestampStr = lastUpdateElement.getAttribute('data-timestamp');

            if (timestampStr) {
                const timestamp = new Date(timestampStr);
                const now = new Date();
                const diffSeconds = Math.floor((now - timestamp) / 1000);

                if (diffSeconds < 60) {
                    lastUpdateElement.textContent = `${diffSeconds} seconds ago`;
                } else if (diffSeconds < 3600) {
                    const minutes = Math.floor(diffSeconds / 60);
                    lastUpdateElement.textContent = `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
                } else if (diffSeconds < 86400) {
                    const hours = Math.floor(diffSeconds / 3600);
                    lastUpdateElement.textContent = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
                } else {
                    // Just show the actual time/date
                    lastUpdateElement.textContent = timestamp.toLocaleString();
                }
            }
        }, 30000);
    }
}

/**
 * Smooth scroll to target element when clicking anchor links
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        // Get the target element
        const targetId = this.getAttribute('href');

        if (targetId !== '#') {
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                e.preventDefault();

                // Smooth scroll to target
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                // Update URL without causing a page jump
                history.pushState(null, null, targetId);
            }
        }
    });
});

/**
 * Add additional CSS classes for table row hover effects
 */
document.addEventListener('mouseover', function (e) {
    if (e.target.tagName === 'TD') {
        const row = e.target.parentNode;
        if (row.tagName === 'TR') {
            row.classList.add('hover');
        }
    }
});

document.addEventListener('mouseout', function (e) {
    if (e.target.tagName === 'TD') {
        const row = e.target.parentNode;
        if (row.tagName === 'TR') {
            row.classList.remove('hover');
        }
    }
});