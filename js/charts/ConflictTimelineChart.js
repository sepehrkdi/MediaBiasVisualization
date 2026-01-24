/**
 * Conflict Timeline Chart
 * Single-panel visualization showing Total Deaths per Year
 * for comparing two countries' conflict data
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
            margin: { top: 80, right: 100, bottom: 60, left: 70 },
            animate: true,
            animationDuration: 1500,
            responsive: true,
            countries: defaultCountries,
            title: 'Conflict Timeline',
            subtitle: '',
            chartType: 'line',  // 'line' or 'stacked-area'
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
            // Detect time format (monthly vs yearly)
            if (data.metadata.timeFormat) {
                this.options.timeFormat = data.metadata.timeFormat;
            }
        }

        // Default to yearly if not specified
        if (!this.options.timeFormat) {
            // Auto-detect from data
            const firstEntry = data?.timeline?.[0];
            this.options.timeFormat = firstEntry?.year_month ? 'monthly' : 'yearly';
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

        // Single-panel compatibility: map topPanel/bottomPanel to chartGroup
        this.topPanel = this.chartGroup;
        this.bottomPanel = this.chartGroup;
        this.panelHeight = this.height;
        this.options.panelGap ??= 0;

        // Responsive Legend Positioning
        // If width is constricted, move legend below subtitle to avoid overlap
        // Increased threshold to 800px to cover tablets and smaller desktop windows
        const isCompact = this.width < 800;
        const legendX = isCompact
            ? this.options.margin.left
            : this.options.margin.left + this.width - 220;
        const legendY = isCompact ? 65 : 25;

        // Legend group
        this.legendGroup = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${legendX}, ${legendY})`);

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
        this.getDeathsField = (prefix) => `${prefix}Deaths`;

        // Time accessor based on format
        this.isMonthly = this.options.timeFormat === 'monthly';
        this.getTimeValue = this.isMonthly
            ? (d) => d.year_month
            : (d) => d.year;

        // Create scales based on time format
        if (this.isMonthly) {
            // Parse year_month strings to dates for proper scaling
            const parseTime = d3.timeParse('%Y-%m');
            this.timeParser = parseTime;
            const timeExtent = d3.extent(timeline, d => parseTime(d.year_month));

            this.xScale = d3.scaleTime()
                .domain(timeExtent)
                .range([0, this.width]);

            // Helper to get x position
            this.getXPosition = (d) => this.xScale(parseTime(d.year_month));
        } else {
            this.xScale = d3.scaleLinear()
                .domain(d3.extent(timeline, d => d.year))
                .range([0, this.width]);

            this.getXPosition = (d) => this.xScale(d.year);
        }

        // Y scale for deaths - use stacked total or max based on chartType
        let maxDeaths;
        if (this.options.chartType === 'stacked-area') {
            maxDeaths = d3.max(timeline, d =>
                (d[this.getDeathsField(c1)] || 0) + (d[this.getDeathsField(c2)] || 0)
            );
        } else {
            maxDeaths = d3.max(timeline, d => Math.max(
                d[this.getDeathsField(c1)] || 0,
                d[this.getDeathsField(c2)] || 0
            ));
        }

        this.yScaleDeaths = d3.scaleLinear()
            .domain([0, maxDeaths * 1.1])
            .range([this.height, 0])
            .nice();

        // Clear previous content
        this.chartGroup.selectAll('*').remove();
        this.titleGroup.selectAll('*').remove();
        this.legendGroup.selectAll('*').remove();

        // Add title
        this.addChartTitle();

        // Time period label
        const timePeriod = this.isMonthly ? 'Month' : 'Year';

        // Render single panel for deaths
        this.renderDeathsPanel(timeline, `Total Deaths per ${timePeriod}`);

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
        const title = this.options.title || `${c1Name} vs ${c2Name}: Total Deaths`;
        const subtitle = this.options.subtitle || `${c1Name} & ${c2Name}`;

        this.titleGroup.append('text')
            .attr('class', 'chart-title-text')
            .text(title);

        this.titleGroup.append('text')
            .attr('class', 'chart-subtitle-text')
            .attr('y', 20)
            .text(subtitle);
    }

    renderDeathsPanel(data) {
        const c1 = this.options.countries.country1.fieldPrefix;
        const c2 = this.options.countries.country2.fieldPrefix;
        const c1Color = this.options.countries.country1.color;
        const c2Color = this.options.countries.country2.color;
        const yScale = this.yScaleDeaths;

        const valueKey = {
            country1: this.getDeathsField(c1),
            country2: this.getDeathsField(c2)
        };

        // Panel title
        const timePeriod = this.isMonthly ? 'Month' : 'Year';
        this.chartGroup.append('text')
            .attr('class', 'panel-title')
            .attr('x', 0)
            .attr('y', -8)
            .text(`Total Deaths per ${timePeriod}`);

        // Grid
        this.renderGrid(yScale);

        // X Axis - format based on time type
        const isMonthly = this.options.timeFormat === 'monthly';
        let xAxis;
        if (isMonthly) {
            // For monthly data, show only January of each year for cleaner labels
            xAxis = d3.axisBottom(this.xScale)
                .tickFormat(d3.timeFormat('%Y'))
                .ticks(d3.timeYear.every(1));
        } else {
            xAxis = d3.axisBottom(this.xScale)
                .tickFormat(d3.format('d'))
                .ticks(9);
        }

        this.chartGroup.append('g')
            .attr('class', 'axis axis-x')
            .attr('transform', `translate(0, ${this.height})`)
            .call(xAxis);

        // X Axis label
        this.chartGroup.append('text')
            .attr('class', 'axis-label')
            .attr('x', this.width / 2)
            .attr('y', this.height + 45)
            .attr('text-anchor', 'middle')
            .attr('fill', '#666')
            .text(isMonthly ? 'Year' : 'Year');

        // Y Axis
        const yAxis = d3.axisLeft(yScale)
            .ticks(6);

        const yAxisGroup = this.chartGroup.append('g')
            .attr('class', 'axis axis-y')
            .call(yAxis);

        // Y Axis label
        yAxisGroup.append('text')
            .attr('class', 'axis-label axis-label-y')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.height / 2)
            .attr('y', -50)
            .text('Deaths');

        // Render based on chart type
        if (this.options.chartType === 'stacked-area') {
            this.renderStackedArea(data, valueKey, yScale, c1Color, c2Color);
        } else {
            this.renderLineChart(data, valueKey, yScale, c1Color, c2Color);
        }
    }

    renderLineChart(data, valueKey, yScale, c1Color, c2Color) {
        // Line generators - use getXPosition helper for time-based positioning
        const country1Line = d3.line()
            .x(d => this.getXPosition(d))
            .y(d => yScale(d[valueKey.country1] || 0))
            .curve(d3.curveMonotoneX);

        const country2Line = d3.line()
            .x(d => this.getXPosition(d))
            .y(d => yScale(d[valueKey.country2] || 0))
            .curve(d3.curveMonotoneX);

        // Draw Country 1 line
        const country1Path = this.chartGroup.append('path')
            .datum(data)
            .attr('class', 'line country1-line')
            .attr('d', country1Line)
            .attr('fill', 'none')
            .attr('stroke', c1Color)
            .attr('stroke-width', 2.5);

        // Draw Country 2 line
        const country2Path = this.chartGroup.append('path')
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
        this.addLineDataPoints(data, valueKey, yScale);
    }

    renderStackedArea(data, valueKey, yScale, c1Color, c2Color) {
        // Stack order: country2 on bottom, country1 on top
        const stack = d3.stack()
            .keys([valueKey.country2, valueKey.country1])
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone);

        // Prepare data for stacking (ensure all values exist)
        const stackData = data.map(d => ({
            ...d,
            [valueKey.country1]: d[valueKey.country1] || 0,
            [valueKey.country2]: d[valueKey.country2] || 0
        }));

        const stackedData = stack(stackData);

        // Area generator for stacked areas
        const area = d3.area()
            .x(d => this.getXPosition(d.data))
            .y0(d => yScale(d[0]))
            .y1(d => yScale(d[1]))
            .curve(d3.curveMonotoneX);

        // Colors mapped to stack order: [country2, country1]
        const colors = [c2Color, c1Color];
        const classNames = ['country2-area', 'country1-area'];

        // Draw stacked areas
        const areaPaths = stackedData.map((layer, i) => {
            return this.chartGroup.append('path')
                .datum(layer)
                .attr('class', `area ${classNames[i]}`)
                .attr('d', area)
                .attr('fill', colors[i])
                .attr('fill-opacity', 0.85)
                .attr('stroke', colors[i])
                .attr('stroke-width', 1.5);
        });

        // Animate areas with fade-in
        if (this.options.animate) {
            areaPaths.forEach(path => this.animateArea(path));
        }

        // Store stacked data for dot positioning
        this.stackedData = stackedData;

        // Add data points with hover (positioned on stacked layers)
        this.addStackedDataPoints(data, valueKey, yScale, stackedData);
    }

    renderGrid(yScale) {
        this.chartGroup.append('g')
            .attr('class', 'grid grid-y')
            .call(d3.axisLeft(yScale)
                .tickSize(-this.width)
                .tickFormat('')
                .ticks(6)
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

    animateArea(path) {
        // Fade-in animation for stacked areas
        path
            .attr('fill-opacity', 0)
            .attr('stroke-opacity', 0);

        path.transition()
            .duration(this.options.animationDuration || 1200)
            .ease(d3.easeCubicOut)
            .attr('fill-opacity', 0.85)
            .attr('stroke-opacity', 1);
    }

    addLineDataPoints(data, valueKey, yScale) {
        const c1 = this.options.countries.country1;
        const c2 = this.options.countries.country2;

        const countries = [
            { key: 'country1', class: 'country1-dot', valueKey: valueKey.country1, color: c1.color, name: c1.name, fieldPrefix: c1.fieldPrefix },
            { key: 'country2', class: 'country2-dot', valueKey: valueKey.country2, color: c2.color, name: c2.name, fieldPrefix: c2.fieldPrefix }
        ];

        countries.forEach(country => {
            this.chartGroup.selectAll(`.${country.class}`)
                .data(data.filter(d => (d[country.valueKey] || 0) > 0))
                .join('circle')
                .attr('class', `dot ${country.class}`)
                .attr('cx', d => this.getXPosition(d))
                .attr('cy', d => yScale(d[country.valueKey]))
                .attr('r', this.options.timeFormat === 'monthly' ? 3 : 5)
                .attr('fill', country.color)
                .attr('stroke', '#fff')
                .attr('stroke-width', this.options.timeFormat === 'monthly' ? 1 : 2)
                .style('cursor', 'pointer')
                .on('mouseenter', (event, d) => this.handleDotHover(event, d, country))
                .on('mousemove', (event) => this.moveTooltip(event))
                .on('mouseleave', () => this.hideTooltip());
        });
    }

    addStackedDataPoints(data, valueKey, yScale, stackedData) {
        const c1 = this.options.countries.country1;
        const c2 = this.options.countries.country2;

        // stackedData[0] = country2 (bottom layer), stackedData[1] = country1 (top layer)
        // For each data point, we need to position dots at the TOP of their respective stack layer

        // Country 2 dots (bottom layer) - positioned at y1 of layer 0 (top of country2 area)
        const country2Layer = stackedData[0];
        this.chartGroup.selectAll('.country2-dot')
            .data(country2Layer.filter(d => (d[1] - d[0]) > 0))  // Filter where country2 has data
            .join('circle')
            .attr('class', 'dot country2-dot')
            .attr('cx', d => this.getXPosition(d.data))
            .attr('cy', d => yScale(d[1]))  // Top of country2's stack
            .attr('r', this.options.timeFormat === 'monthly' ? 3 : 5)
            .attr('fill', c2.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', this.options.timeFormat === 'monthly' ? 1 : 2)
            .style('cursor', 'pointer')
            .on('mouseenter', (event, d) => this.handleDotHover(event, d.data, { key: 'country2', name: c2.name, fieldPrefix: c2.fieldPrefix, color: c2.color }))
            .on('mousemove', (event) => this.moveTooltip(event))
            .on('mouseleave', () => this.hideTooltip());

        // Country 1 dots (top layer) - positioned at y1 of layer 1 (top of country1 area = total)
        const country1Layer = stackedData[1];
        this.chartGroup.selectAll('.country1-dot')
            .data(country1Layer.filter(d => (d[1] - d[0]) > 0))  // Filter where country1 has data
            .join('circle')
            .attr('class', 'dot country1-dot')
            .attr('cx', d => this.getXPosition(d.data))
            .attr('cy', d => yScale(d[1]))  // Top of country1's stack (which is total)
            .attr('r', this.options.timeFormat === 'monthly' ? 3 : 5)
            .attr('fill', c1.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', this.options.timeFormat === 'monthly' ? 1 : 2)
            .style('cursor', 'pointer')
            .on('mouseenter', (event, d) => this.handleDotHover(event, d.data, { key: 'country1', name: c1.name, fieldPrefix: c1.fieldPrefix, color: c1.color }))
            .on('mousemove', (event) => this.moveTooltip(event))
            .on('mouseleave', () => this.hideTooltip());
    }

    handleDotHover(event, d, countryInfo) {
        const countryName = countryInfo.name;
        const prefix = countryInfo.fieldPrefix;

        const deathsField = this.getDeathsField(prefix);
        const deaths = d[deathsField] || 0;

        // Get time label based on format
        const isMonthly = this.options.timeFormat === 'monthly';
        const timeLabel = isMonthly ? d.year_month : d.year;

        const content = {
            title: `${countryName} - ${timeLabel}`,
            rows: [
                { label: 'Total Deaths', value: deaths.toLocaleString(), format: 'text' }
            ]
        };

        this.showTooltip(content, event);
    }

    renderDisparityZone(zone) {
        // Handle both yearly (numeric) and monthly (string) formats
        const isMonthly = this.options.timeFormat === 'monthly';
        let x1, x2;

        if (isMonthly && this.timeParser) {
            x1 = this.xScale(this.timeParser(zone.start));
            x2 = this.xScale(this.timeParser(zone.end));
        } else {
            x1 = this.xScale(zone.start);
            x2 = this.xScale(zone.end);
        }
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

        // Disparity label (positioned at top of chart to avoid axis overlap)
        const labelY = 40;

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
        const isMonthly = this.options.timeFormat === 'monthly';

        // Get end time value
        let endTime;
        if (isMonthly) {
            const lastEntry = timeline[timeline.length - 1];
            endTime = this.timeParser(lastEntry.year_month);
        } else {
            endTime = d3.max(timeline, d => d.year);
        }

        // Sort annotations by time to handle overlapping properly
        const sortedAnnotations = [...annotations].sort((a, b) => {
            if (isMonthly) {
                return (a.year_month || '').localeCompare(b.year_month || '');
            }
            return a.year - b.year;
        });

        sortedAnnotations.forEach((annotation, index) => {
            // Get x position based on format
            let startX;
            if (isMonthly && annotation.year_month) {
                startX = this.xScale(this.timeParser(annotation.year_month));
            } else {
                startX = this.xScale(annotation.year);
            }
            const endX = this.xScale(endTime);
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
        const isMonthly = this.options.timeFormat === 'monthly';

        annotations.forEach((annotation, index) => {
            // Get x position based on format
            let x;
            if (isMonthly && annotation.year_month) {
                x = this.xScale(this.timeParser(annotation.year_month));
            } else {
                x = this.xScale(annotation.year);
            }

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
            .attr('transform', (d, i) => `translate(${i * 140}, 0)`);

        if (this.options.chartType === 'stacked-area') {
            // Filled rectangles for stacked area chart legend
            legendItem.append('rect')
                .attr('x', 0)
                .attr('y', -8)
                .attr('width', 20)
                .attr('height', 16)
                .attr('fill', d => d.color)
                .attr('fill-opacity', 0.85)
                .attr('stroke', d => d.color)
                .attr('stroke-width', 1.5)
                .attr('rx', 2);
        } else {
            // Line + circle for line chart legend
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
        }

        legendItem.append('text')
            .attr('x', 30)
            .attr('y', 4)
            .attr('class', 'legend-text')
            .text(d => d.label);
    }

    updateDimensions() {
        const containerRect = this.container.getBoundingClientRect();
        this.width = (containerRect.width || 600) - this.options.margin.left - this.options.margin.right;
        this.height = (containerRect.height || 400) - this.options.margin.top - this.options.margin.bottom;

        // Ensure minimum dimensions - Reduced to prevent overflow on mobile
        this.width = Math.max(this.width, 200);
        this.height = Math.max(this.height, 200);

        // Single-panel: panelHeight equals full chart height
        const panelGap = this.options.panelGap ?? 0;
        this.panelHeight = this.height;
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
