/**
 * Conflict Timeline Chart
 * Stacked dual-panel visualization comparing media coverage vs. conflict intensity
 * for Liberia and Sierra Leone civil wars (1989-1997)
 */

export class ConflictTimelineChart {
    constructor(container, data, options = {}) {
        // Handle container
        this.container = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        if (!this.container) {
            console.error('ConflictTimelineChart: Container not found');
            return;
        }
        
        this.data = data;
        
        // Default country configuration (Liberia/Sierra Leone for backward compatibility)
        const defaultCountries = {
            country1: {
                name: 'Liberia',
                color: '#d62728',
                fieldPrefix: 'liberia'
            },
            country2: {
                name: 'Sierra Leone', 
                color: '#2ca02c',
                fieldPrefix: 'sierraLeone'
            }
        };
        
        this.options = {
            margin: { top: 80, right: 100, bottom: 50, left: 70 },
            panelGap: 60,
            animate: true,
            animationDuration: 1500,
            responsive: true,
            countries: defaultCountries,
            title: 'Conflict Timeline',
            subtitle: '',
            ...options
        };
        
        // Override country config from data metadata if available
        if (data?.metadata) {
            if (data.metadata.country1) {
                this.options.countries.country1 = {
                    name: data.metadata.country1.name || defaultCountries.country1.name,
                    color: data.metadata.country1.color || defaultCountries.country1.color,
                    fieldPrefix: 'country1'
                };
            }
            if (data.metadata.country2) {
                this.options.countries.country2 = {
                    name: data.metadata.country2.name || defaultCountries.country2.name,
                    color: data.metadata.country2.color || defaultCountries.country2.color,
                    fieldPrefix: 'country2'
                };
            }
            if (data.metadata.period) {
                this.options.subtitle = data.metadata.period;
            }
        }
        
        this.tooltip = options.tooltip;
        
        // Initialize
        this.setup();
        
        if (this.data) {
            this.render();
        }
        
        // Setup resize observer
        if (this.options.responsive) {
            this.setupResizeObserver();
        }
    }

    setup() {
        // Clear container
        this.container.innerHTML = '';
        
        // Get dimensions
        this.updateDimensions();
        
        // Calculate panel heights (two stacked panels)
        this.panelHeight = (this.height - this.options.panelGap) / 2;
        
        // Create SVG
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('class', 'conflict-timeline-svg')
            .attr('width', this.width + this.options.margin.left + this.options.margin.right)
            .attr('height', this.height + this.options.margin.top + this.options.margin.bottom)
            .attr('viewBox', `0 0 ${this.width + this.options.margin.left + this.options.margin.right} ${this.height + this.options.margin.top + this.options.margin.bottom}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        // Defs for gradients and patterns
        this.defs = this.svg.append('defs');
        this.createGradients();

        // Main chart group
        this.chartGroup = this.svg.append('g')
            .attr('class', 'chart-group')
            .attr('transform', `translate(${this.options.margin.left}, ${this.options.margin.top})`);

        // Create panel groups
        this.topPanel = this.chartGroup.append('g')
            .attr('class', 'panel panel-top');
        
        this.bottomPanel = this.chartGroup.append('g')
            .attr('class', 'panel panel-bottom')
            .attr('transform', `translate(0, ${this.panelHeight + this.options.panelGap})`);

        // Legend group
        this.legendGroup = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.options.margin.left + this.width - 200}, 25)`);
        
        // Title group
        this.titleGroup = this.svg.append('g')
            .attr('class', 'chart-title-group')
            .attr('transform', `translate(${this.options.margin.left}, 25)`);
    }
    
    setupResizeObserver() {
        this.resizeObserver = new ResizeObserver(entries => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.resize();
            }, 100);
        });
        this.resizeObserver.observe(this.container);
    }

    createGradients() {
        // Disparity zone gradient
        const disparityGradient = this.defs.append('linearGradient')
            .attr('id', 'disparity-gradient')
            .attr('x1', '0%')
            .attr('x2', '0%')
            .attr('y1', '0%')
            .attr('y2', '100%');
        
        disparityGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#FFC107')
            .attr('stop-opacity', 0.15);
        
        disparityGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#FFC107')
            .attr('stop-opacity', 0.05);
    }

    render() {
        if (!this.data || !this.data.timeline) return;

        const timeline = this.data.timeline;
        const annotations = this.data.annotations || [];
        const disparityZone = this.data.disparityZone;
        
        // Get field prefixes from config
        const c1 = this.options.countries.country1.fieldPrefix;
        const c2 = this.options.countries.country2.fieldPrefix;
        
        // Field name getters
        this.getEventsField = (prefix) => `${prefix}Events`;
        this.getDeathsField = (prefix) => `${prefix}Deaths`;
        this.getCasualtiesField = (prefix) => `${prefix}CasualtiesPerEvent`;

        // Create scales
        this.xScale = d3.scaleLinear()
            .domain(d3.extent(timeline, d => d.year))
            .range([0, this.width]);

        // Y scales for each panel
        const maxDeaths = d3.max(timeline, d => Math.max(
            d[this.getDeathsField(c1)] || 0, 
            d[this.getDeathsField(c2)] || 0
        ));
        const maxEvents = d3.max(timeline, d => Math.max(
            d[this.getEventsField(c1)] || 0, 
            d[this.getEventsField(c2)] || 0
        ));

        this.yScaleDeaths = d3.scaleLinear()
            .domain([0, maxDeaths * 1.1])
            .range([this.panelHeight, 0])
            .nice();

        this.yScaleEvents = d3.scaleLinear()
            .domain([0, maxEvents * 1.1])
            .range([this.panelHeight, 0])
            .nice();

        // Clear previous content
        this.topPanel.selectAll('*').remove();
        this.bottomPanel.selectAll('*').remove();

        // Add title
        this.addChartTitle();

        // Render both panels - Deaths on top, Events on bottom (like the notebook)
        this.renderPanel(this.topPanel, timeline, 'deaths', this.yScaleDeaths, 
            'Total Deaths per Year', 'Deaths');
        this.renderPanel(this.bottomPanel, timeline, 'events', this.yScaleEvents, 
            'Number of Conflict Events per Year', 'Events');

        // Add conflict period zones (transparent background areas)
        this.renderConflictPeriods(annotations);

        // Add disparity zone highlight
        if (disparityZone) {
            this.renderDisparityZone(disparityZone);
        }

        // Add conflict start annotations (vertical lines and labels)
        this.renderAnnotations(annotations);

        // Add legend
        this.renderLegend();
    }

    addChartTitle() {
        // Clear existing title
        this.titleGroup.selectAll('*').remove();
        
        const c1Name = this.options.countries.country1.name;
        const c2Name = this.options.countries.country2.name;
        const title = this.options.title || `${c1Name} vs ${c2Name}: Coverage vs. Casualties`;
        const subtitle = this.options.subtitle || `${c1Name} & ${c2Name}`;

        this.titleGroup.append('text')
            .attr('class', 'chart-title-text')
            .text(title);
        
        this.titleGroup.append('text')
            .attr('class', 'chart-subtitle-text')
            .attr('y', 20)
            .text(subtitle);
    }

    renderPanel(panel, data, type, yScale, title, yLabel) {
        const c1 = this.options.countries.country1.fieldPrefix;
        const c2 = this.options.countries.country2.fieldPrefix;
        const c1Color = this.options.countries.country1.color;
        const c2Color = this.options.countries.country2.color;
        
        // Determine value keys based on type
        let valueKey;
        if (type === 'deaths') {
            valueKey = { country1: this.getDeathsField(c1), country2: this.getDeathsField(c2) };
        } else if (type === 'events') {
            valueKey = { country1: this.getEventsField(c1), country2: this.getEventsField(c2) };
        } else {
            valueKey = { country1: this.getCasualtiesField(c1), country2: this.getCasualtiesField(c2) };
        }

        // Panel background
        panel.append('rect')
            .attr('class', 'panel-background')
            .attr('width', this.width)
            .attr('height', this.panelHeight)
            .attr('fill', 'transparent');

        // Panel title
        panel.append('text')
            .attr('class', 'panel-title')
            .attr('x', 0)
            .attr('y', -8)
            .text(title);

        // Grid
        this.renderGrid(panel, yScale);

        // X Axis
        const xAxis = d3.axisBottom(this.xScale)
            .tickFormat(d3.format('d'))
            .ticks(9);

        panel.append('g')
            .attr('class', 'axis axis-x')
            .attr('transform', `translate(0, ${this.panelHeight})`)
            .call(xAxis);

        // Y Axis
        const yAxis = d3.axisLeft(yScale)
            .ticks(5);

        const yAxisGroup = panel.append('g')
            .attr('class', 'axis axis-y')
            .call(yAxis);

        // Y Axis label
        yAxisGroup.append('text')
            .attr('class', 'axis-label axis-label-y')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.panelHeight / 2)
            .attr('y', -50)
            .text(yLabel);

        // Line generators
        const country1Line = d3.line()
            .x(d => this.xScale(d.year))
            .y(d => yScale(d[valueKey.country1] || 0))
            .curve(d3.curveMonotoneX);

        const country2Line = d3.line()
            .x(d => this.xScale(d.year))
            .y(d => yScale(d[valueKey.country2] || 0))
            .curve(d3.curveMonotoneX);

        // Draw Country 1 line
        const country1Path = panel.append('path')
            .datum(data)
            .attr('class', 'line country1-line')
            .attr('d', country1Line)
            .attr('fill', 'none')
            .attr('stroke', c1Color)
            .attr('stroke-width', 2.5);

        // Draw Country 2 line
        const country2Path = panel.append('path')
            .datum(data)
            .attr('class', 'line country2-line')
            .attr('d', country2Line)
            .attr('fill', 'none')
            .attr('stroke', c2Color)
            .attr('stroke-width', 2.5);

        // Animate lines
        if (this.options.animate) {
            this.animateLine(country1Path);
            this.animateLine(country2Path);
        }

        // Add data points with hover
        this.addDataPoints(panel, data, valueKey, yScale, type);
    }

    renderGrid(panel, yScale) {
        const gridGroup = panel.append('g')
            .attr('class', 'grid');

        // Horizontal grid lines
        gridGroup.append('g')
            .attr('class', 'grid grid-y')
            .call(d3.axisLeft(yScale)
                .tickSize(-this.width)
                .tickFormat('')
                .ticks(5)
            );
    }

    animateLine(path) {
        const totalLength = path.node().getTotalLength();
        
        // Set initial state for animation
        path
            .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
            .attr('stroke-dashoffset', totalLength);
        
        // Animate the line
        path.transition()
            .duration(this.options.animationDuration || 1500)
            .ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0)
            .on('end', () => {
                // Clean up after animation
                path.attr('stroke-dasharray', null);
            });
    }

    addDataPoints(panel, data, valueKey, yScale, type) {
        const c1 = this.options.countries.country1;
        const c2 = this.options.countries.country2;
        
        const countries = [
            { key: 'country1', class: 'country1-dot', valueKey: valueKey.country1, color: c1.color, name: c1.name, fieldPrefix: c1.fieldPrefix },
            { key: 'country2', class: 'country2-dot', valueKey: valueKey.country2, color: c2.color, name: c2.name, fieldPrefix: c2.fieldPrefix }
        ];

        countries.forEach(country => {
            panel.selectAll(`.${country.class}`)
                .data(data.filter(d => (d[country.valueKey] || 0) > 0))
                .join('circle')
                .attr('class', `dot ${country.class}`)
                .attr('cx', d => this.xScale(d.year))
                .attr('cy', d => yScale(d[country.valueKey]))
                .attr('r', 5)
                .attr('fill', country.color)
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
                .style('cursor', 'pointer')
                .on('mouseenter', (event, d) => this.handleDotHover(event, d, country, type))
                .on('mousemove', (event) => this.moveTooltip(event))
                .on('mouseleave', () => this.hideTooltip());
        });
    }

    handleDotHover(event, d, countryInfo, type) {
        const countryName = countryInfo.name;
        const prefix = countryInfo.fieldPrefix;
        
        const eventsField = this.getEventsField(prefix);
        const deathsField = this.getDeathsField(prefix);
        const casualtiesField = this.getCasualtiesField(prefix);
        
        const events = d[eventsField] || 0;
        const deaths = d[deathsField] || 0;
        const intensity = d[casualtiesField] || 0;
        
        let content;
        if (type === 'deaths') {
            content = {
                title: `${countryName} - ${d.year}`,
                rows: [
                    { label: 'Total Deaths', value: deaths.toLocaleString(), format: 'text' },
                    { label: 'Events', value: events, format: 'number' },
                    { label: 'Avg per Event', value: intensity.toFixed(1), format: 'text' }
                ]
            };
        } else if (type === 'events') {
            content = {
                title: `${countryName} - ${d.year}`,
                rows: [
                    { label: 'Conflict Events', value: events, format: 'number' },
                    { label: 'Total Deaths', value: deaths.toLocaleString(), format: 'text' }
                ]
            };
        } else {
            content = {
                title: `${countryName} - ${d.year}`,
                rows: [
                    { label: 'Casualties per Event', value: intensity.toFixed(1), format: 'text' },
                    { label: 'Total Deaths', value: deaths.toLocaleString(), format: 'text' },
                    { label: 'Events', value: events, format: 'number' }
                ]
            };
        }

        // Add disparity insight if in disparity zone
        const disparityZone = this.data.disparityZone;
        if (disparityZone && d.year >= disparityZone.start && d.year <= disparityZone.end && type === 'intensity') {
            const c1Prefix = this.options.countries.country1.fieldPrefix;
            const c2Prefix = this.options.countries.country2.fieldPrefix;
            const c1Intensity = d[this.getCasualtiesField(c1Prefix)] || 0;
            const c2Intensity = d[this.getCasualtiesField(c2Prefix)] || 0;
            if (c1Intensity > 0 && c2Intensity > 0) {
                const ratio = (c1Intensity / c2Intensity).toFixed(1);
                const c1Name = this.options.countries.country1.name;
                content.rows.push({
                    label: '⚠️ Intensity Ratio',
                    value: `${c1Name} ${ratio}× deadlier`,
                    format: 'text',
                    highlight: true
                });
            }
        }

        this.showTooltip(content, event);
    }

    renderDisparityZone(zone) {
        const x1 = this.xScale(zone.start);
        const x2 = this.xScale(zone.end);
        const zoneWidth = x2 - x1;

        // Top panel disparity zone
        this.topPanel.insert('rect', ':first-child')
            .attr('class', 'disparity-zone')
            .attr('x', x1)
            .attr('y', 0)
            .attr('width', zoneWidth)
            .attr('height', this.panelHeight)
            .attr('fill', 'url(#disparity-gradient)')
            .attr('stroke', '#FFC107')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '4,2')
            .attr('opacity', 0)
            .transition()
            .delay(this.options.animationDuration)
            .duration(500)
            .attr('opacity', 1);

        // Bottom panel disparity zone
        this.bottomPanel.insert('rect', ':first-child')
            .attr('class', 'disparity-zone')
            .attr('x', x1)
            .attr('y', 0)
            .attr('width', zoneWidth)
            .attr('height', this.panelHeight)
            .attr('fill', 'url(#disparity-gradient)')
            .attr('stroke', '#FFC107')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '4,2')
            .attr('opacity', 0)
            .transition()
            .delay(this.options.animationDuration)
            .duration(500)
            .attr('opacity', 1);

        // Disparity label (positioned between panels)
        const labelY = this.panelHeight + this.options.panelGap / 2;
        
        const labelGroup = this.chartGroup.append('g')
            .attr('class', 'disparity-label-group')
            .attr('transform', `translate(${x1 + zoneWidth / 2}, ${labelY})`)
            .style('opacity', 0);

        labelGroup.append('rect')
            .attr('class', 'disparity-label-bg')
            .attr('x', -140)
            .attr('y', -12)
            .attr('width', 280)
            .attr('height', 24)
            .attr('rx', 4)
            .attr('fill', '#FFF8E1')
            .attr('stroke', '#FFC107');

        labelGroup.append('text')
            .attr('class', 'disparity-label-text')
            .attr('text-anchor', 'middle')
            .attr('dy', 4)
            .text(`⚠️ ${zone.label || 'Coverage Gap: High deaths, low documentation'}`);

        labelGroup.transition()
            .delay(this.options.animationDuration + 500)
            .duration(500)
            .style('opacity', 1);
    }

    renderConflictPeriods(annotations) {
        const c1Color = this.options.countries.country1.color;
        const c2Color = this.options.countries.country2.color;
        const timeline = this.data.timeline;
        const endYear = d3.max(timeline, d => d.year);
        
        // Sort annotations by year to handle overlapping properly
        const sortedAnnotations = [...annotations].sort((a, b) => a.year - b.year);
        
        sortedAnnotations.forEach((annotation, index) => {
            const startX = this.xScale(annotation.year);
            const endX = this.xScale(endYear);
            const zoneWidth = endX - startX;
            
            // Determine color based on country
            let color;
            if (annotation.country === 'country1' || annotation.country === 'liberia') {
                color = c1Color;
            } else {
                color = c2Color;
            }
            
            // Add transparent filled area to both panels
            [this.topPanel, this.bottomPanel].forEach(panel => {
                panel.insert('rect', ':first-child')
                    .attr('class', `conflict-period-zone conflict-${annotation.country}`)
                    .attr('x', startX)
                    .attr('y', 0)
                    .attr('width', zoneWidth)
                    .attr('height', this.panelHeight)
                    .attr('fill', color)
                    .attr('opacity', 0)
                    .transition()
                    .delay(this.options.animationDuration * 0.5 + index * 300)
                    .duration(800)
                    .attr('opacity', 0.08);
            });
        });
    }

    renderAnnotations(annotations) {
        const c1Color = this.options.countries.country1.color;
        const c2Color = this.options.countries.country2.color;
        
        annotations.forEach((annotation, index) => {
            const x = this.xScale(annotation.year);
            // Support both old format (liberia/sierraLeone) and new format (country1/country2)
            let color;
            if (annotation.country === 'country1' || annotation.country === 'liberia') {
                color = c1Color;
            } else {
                color = c2Color;
            }

            // Vertical line spanning both panels (animated)
            [this.topPanel, this.bottomPanel].forEach(panel => {
                const line = panel.append('line')
                    .attr('class', `annotation-line annotation-${annotation.country}`)
                    .attr('x1', x)
                    .attr('x2', x)
                    .attr('y1', 0)
                    .attr('y2', 0)
                    .attr('stroke', color)
                    .attr('stroke-width', 2)
                    .attr('stroke-dasharray', '6,3')
                    .attr('opacity', 0.8);
                
                // Animate line growing down
                line.transition()
                    .delay(this.options.animationDuration * 0.5 + index * 300)
                    .duration(600)
                    .attr('y2', this.panelHeight);
            });

            // Annotation label - positioned inside the chart area at the top
            const labelGroup = this.topPanel.append('g')
                .attr('class', 'annotation-label-group')
                .attr('transform', `translate(${x + 5}, 15)`)
                .style('opacity', 0);
            
            // Background for better readability
            const text = labelGroup.append('text')
                .attr('class', 'annotation-text')
                .attr('text-anchor', 'start')
                .attr('fill', color)
                .attr('font-weight', 600)
                .attr('font-size', '11px')
                .text(annotation.label);
            
            // Get text dimensions for background
            const bbox = text.node().getBBox();
            
            labelGroup.insert('rect', 'text')
                .attr('x', bbox.x - 3)
                .attr('y', bbox.y - 2)
                .attr('width', bbox.width + 6)
                .attr('height', bbox.height + 4)
                .attr('rx', 2)
                .attr('fill', 'white')
                .attr('opacity', 0.85);
            
            // Animate label appearing
            labelGroup.transition()
                .delay(this.options.animationDuration * 0.5 + index * 300 + 400)
                .duration(400)
                .style('opacity', 1);
        });
    }

    renderLegend() {
        this.legendGroup.selectAll('*').remove();

        const legendItems = [
            { label: this.options.countries.country1.name, color: this.options.countries.country1.color },
            { label: this.options.countries.country2.name, color: this.options.countries.country2.color }
        ];

        const legendItem = this.legendGroup.selectAll('.legend-item')
            .data(legendItems)
            .join('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(${i * 100}, 0)`);

        legendItem.append('line')
            .attr('x1', 0)
            .attr('x2', 25)
            .attr('y1', 0)
            .attr('y2', 0)
            .attr('stroke', d => d.color)
            .attr('stroke-width', 2.5);

        legendItem.append('circle')
            .attr('cx', 12.5)
            .attr('cy', 0)
            .attr('r', 4)
            .attr('fill', d => d.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5);

        legendItem.append('text')
            .attr('x', 30)
            .attr('y', 4)
            .attr('class', 'legend-text')
            .text(d => d.label);
    }

    updateDimensions() {
        const containerRect = this.container.getBoundingClientRect();
        this.width = (containerRect.width || 800) - this.options.margin.left - this.options.margin.right;
        this.height = (containerRect.height || 600) - this.options.margin.top - this.options.margin.bottom;
        
        // Ensure minimum dimensions
        this.width = Math.max(this.width, 400);
        this.height = Math.max(this.height, 400);
        
        // Recalculate panel height
        this.panelHeight = (this.height - this.options.panelGap) / 2;
    }
    
    resize() {
        this.updateDimensions();
        this.setup();
        if (this.data) {
            this.render();
        }
    }
    
    showTooltip(content, event) {
        if (this.tooltip) {
            this.tooltip.show(content, event);
        }
    }
    
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.hide();
        }
    }
    
    moveTooltip(event) {
        if (this.tooltip) {
            this.tooltip.move(event);
        }
    }
    
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        this.container.innerHTML = '';
    }
}
