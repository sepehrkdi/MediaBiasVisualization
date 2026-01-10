/**
 * Tooltip Module
 * Reusable tooltip for all visualizations
 */

export class Tooltip {
    constructor(element) {
        this.element = element || this.createTooltipElement();
        this.isVisible = false;
        this.offset = { x: 15, y: 15 };
        
        // Bind methods
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.move = this.move.bind(this);
    }
    
    /**
     * Create tooltip element if not provided
     */
    createTooltipElement() {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.id = 'tooltip';
        document.body.appendChild(tooltip);
        return tooltip;
    }
    
    /**
     * Show tooltip with content
     * @param {string|Object} content - HTML string or content object
     * @param {MouseEvent} event - Mouse event for positioning
     */
    show(content, event) {
        // Set content
        if (typeof content === 'string') {
            this.element.innerHTML = content;
        } else if (typeof content === 'object') {
            this.element.innerHTML = this.formatContent(content);
        }
        
        // Make visible
        this.element.classList.add('is-visible');
        this.isVisible = true;
        
        // Position
        if (event) {
            this.move(event);
        }
    }
    
    /**
     * Hide tooltip
     */
    hide() {
        this.element.classList.remove('is-visible');
        this.isVisible = false;
    }
    
    /**
     * Move tooltip to follow cursor
     * @param {MouseEvent} event - Mouse event
     */
    move(event) {
        if (!this.isVisible) return;
        
        const x = event.clientX;
        const y = event.clientY;
        
        // Get tooltip dimensions
        const tooltipRect = this.element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate position
        let left = x + this.offset.x;
        let top = y + this.offset.y;
        
        // Prevent overflow on right
        if (left + tooltipRect.width > viewportWidth - 10) {
            left = x - tooltipRect.width - this.offset.x;
        }
        
        // Prevent overflow on bottom
        if (top + tooltipRect.height > viewportHeight - 10) {
            top = y - tooltipRect.height - this.offset.y;
        }
        
        // Prevent overflow on left
        if (left < 10) {
            left = 10;
        }
        
        // Prevent overflow on top
        if (top < 10) {
            top = 10;
        }
        
        this.element.style.left = `${left}px`;
        this.element.style.top = `${top}px`;
    }
    
    /**
     * Format content object to HTML
     * @param {Object} content - Content object
     * @returns {string} HTML string
     */
    formatContent(content) {
        let html = '';
        
        // Title
        if (content.title) {
            html += `<div class="tooltip-title">${content.title}</div>`;
        }
        
        // Main value
        if (content.value !== undefined) {
            const formattedValue = this.formatValue(content.value, content.format);
            html += `<div class="tooltip-value">${formattedValue}</div>`;
        }
        
        // Additional rows
        if (content.rows) {
            html += '<div class="tooltip-rows">';
            content.rows.forEach(row => {
                const formattedValue = this.formatValue(row.value, row.format);
                html += `
                    <div class="tooltip-row">
                        <span class="tooltip-row-label">${row.label}:</span>
                        <span class="tooltip-row-value">${formattedValue}</span>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        // Secondary info
        if (content.secondary) {
            html += `<div class="tooltip-secondary">${content.secondary}</div>`;
        }
        
        // Confidence interval
        if (content.ci) {
            html += `
                <div class="tooltip-ci">
                    95% CI: [${this.formatValue(content.ci.lower)}, ${this.formatValue(content.ci.upper)}]
                </div>
            `;
        }
        
        // Sample size
        if (content.n) {
            html += `<div class="tooltip-n">n = ${content.n.toLocaleString()}</div>`;
        }
        
        return html;
    }
    
    /**
     * Format a value based on type
     * @param {*} value - Value to format
     * @param {string} [format] - Format type
     * @returns {string} Formatted value
     */
    formatValue(value, format) {
        if (value === null || value === undefined) {
            return 'N/A';
        }
        
        switch (format) {
            case 'percent':
                return `${(value * 100).toFixed(1)}%`;
            case 'number':
                return value.toLocaleString();
            case 'decimal':
                return value.toFixed(2);
            case 'date':
                return new Date(value).toLocaleDateString();
            case 'sentiment':
                const sign = value >= 0 ? '+' : '';
                return `${sign}${value.toFixed(2)}`;
            default:
                if (typeof value === 'number') {
                    if (Number.isInteger(value)) {
                        return value.toLocaleString();
                    }
                    return value.toFixed(2);
                }
                return String(value);
        }
    }
    
    /**
     * Create HTML for a simple key-value tooltip
     * @param {string} label - Label
     * @param {*} value - Value
     * @param {string} [format] - Format type
     * @returns {string} HTML string
     */
    simple(label, value, format) {
        return `
            <div class="tooltip-title">${label}</div>
            <div class="tooltip-value">${this.formatValue(value, format)}</div>
        `;
    }
    
    /**
     * Create HTML for a chart data point tooltip
     * @param {Object} data - Data point
     * @returns {string} HTML string
     */
    dataPoint(data) {
        return this.formatContent({
            title: data.name || data.label,
            value: data.value,
            format: data.format,
            secondary: data.description,
            ci: data.ci,
            n: data.n
        });
    }
    
    /**
     * Destroy tooltip
     */
    destroy() {
        this.hide();
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
