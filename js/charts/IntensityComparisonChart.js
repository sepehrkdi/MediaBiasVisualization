/**
 * Intensity Comparison Chart
 * Dual-panel visualization showing:
 *   Top panel: Average casualties per event (with horizontal average reference lines)
 *   Bottom panel: Number of reportedconflict events per year
 */

export class IntensityComparisonChart {
    constructor(container, data, options = {}) {
        this.container = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        if (!this.container) {
            console.error('IntensityComparisonChart: Container not found');
            return;
        }

        this.data = data;

        // Default configuration
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
            title: 'Average Casualties per Event',
            subtitle: '',
            ...options
        };

        // Override from metadata
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

        this.setup();
        if (this.data) {
            this.render();
        }

        if (this.options.responsive) {
            this.setupResizeObserver();
        }
    }

    setup() {
        this.container.innerHTML = '';
        this.updateDimensions();

        // Calculate panel heights (two stacked panels)
        this.panelHeight = (this.height - this.options.panelGap) / 2;

        this.svg = d3.select(this.container)
            .append('svg')
            .attr('class', 'intensity-comparison-svg')
            .attr('width', this.width + this.options.margin.left + this.options.margin.right)
            .attr('height', this.height + this.options.margin.top + this.options.margin.bottom)
            .attr('viewBox', `0 0 ${this.width + this.options.margin.left + this.options.margin.right} ${this.height + this.options.margin.top + this.options.margin.bottom}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

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

        // Responsive Legend Positioning
        // Increased threshold to 800px to avoid text overlap
        const isCompact = this.width < 800;
        const legendX = isCompact
            ? this.options.margin.left
            : this.options.margin.left + this.width - 200;
        const legendY = isCompact ? 65 : 25;

        // Legend group
        this.legendGroup = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${legendX}, ${legendY})`);

        this.titleGroup = this.svg.append('g')
            .attr('class', 'chart-title-group')
            .attr('transform', `translate(${this.options.margin.left}, 25)`);
    }

    setupResizeObserver() {
        this.resizeObserver = new ResizeObserver(() => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => this.resize(), 100);
        });
        this.resizeObserver.observe(this.container);
    }

    updateDimensions() {
        const rect = this.container.getBoundingClientRect();
        // Use container dimensions but ensure a safe minimum to prevent negative values
        // Reduced minimums allow the chart to scale down to fit the new mobile layout (250px height)
        this.width = Math.max((rect.width || 600) - this.options.margin.left - this.options.margin.right, 200);
        this.height = Math.max((rect.height || 400) - this.options.margin.top - this.options.margin.bottom, 200);

        // Recalculate panel height
        this.panelHeight = Math.max((this.height - this.options.panelGap) / 2, 80);
    }

    render() {
        if (!this.data?.timeline) return;

        const timeline = this.data.timeline;
        const c1 = this.options.countries.country1;
        const c2 = this.options.countries.country2;

        // Detect time format (monthly vs yearly)
        const firstEntry = timeline[0];
        this.isMonthly = !!firstEntry?.year_month;

        if (this.isMonthly) {
            // Parse year_month strings to dates
            this.timeParser = d3.timeParse('%Y-%m');
            this.getTimeValue = (d) => this.timeParser(d.year_month);
        } else {
            this.getTimeValue = (d) => d.year;
        }

        // Field names
        const c1CasualtiesField = `${c1.fieldPrefix}CasualtiesPerEvent`;
        const c2CasualtiesField = `${c2.fieldPrefix}CasualtiesPerEvent`;
        const c1EventsField = `${c1.fieldPrefix}Events`;
        const c2EventsField = `${c2.fieldPrefix}Events`;

        // Calculate averages for casualties per event (only where there's data)
        const c1Data = timeline.filter(d => d[c1CasualtiesField] > 0);
        const c2Data = timeline.filter(d => d[c2CasualtiesField] > 0);
        const c1Avg = d3.mean(c1Data, d => d[c1CasualtiesField]) || 0;
        const c2Avg = d3.mean(c2Data, d => d[c2CasualtiesField]) || 0;

        // X Scale (shared) - time scale for monthly, linear for yearly
        if (this.isMonthly) {
            this.xScale = d3.scaleTime()
                .domain(d3.extent(timeline, d => this.getTimeValue(d)))
                .range([0, this.width]);
        } else {
            this.xScale = d3.scaleLinear()
                .domain(d3.extent(timeline, d => d.year))
                .range([0, this.width]);
        }

        // Y Scale for casualties per event (top panel)
        const maxIntensity = d3.max(timeline, d => Math.max(d[c1CasualtiesField] || 0, d[c2CasualtiesField] || 0));
        this.yScaleCasualties = d3.scaleLinear()
            .domain([0, maxIntensity * 1.15])
            .range([this.panelHeight, 0])
            .nice();

        // Y Scale for events (bottom panel)
        const maxEvents = d3.max(timeline, d => Math.max(d[c1EventsField] || 0, d[c2EventsField] || 0));
        this.yScaleEvents = d3.scaleLinear()
            .domain([0, maxEvents * 1.1])
            .range([this.panelHeight, 0])
            .nice();

        // Clear previous
        this.topPanel.selectAll('*').remove();
        this.bottomPanel.selectAll('*').remove();
        this.titleGroup.selectAll('*').remove();
        this.legendGroup.selectAll('*').remove();

        // Add title
        this.addTitle();

        // Render both panels
        this.renderCasualtiesPanel(timeline, c1CasualtiesField, c2CasualtiesField, c1, c2, c1Avg, c2Avg);
        this.renderEventsPanel(timeline, c1EventsField, c2EventsField, c1, c2);

        // Add conflict period zones (transparent background areas)
        const annotations = this.data.annotations || [];
        this.renderConflictPeriods(annotations, timeline);

        // Add disparity zone highlight
        const disparityZone = this.data.disparityZone;
        if (disparityZone) {
            this.renderDisparityZone(disparityZone);
        }

        // Add conflict start annotations (vertical lines and labels)
        this.renderAnnotations(annotations);

        // Legend
        this.renderLegend(c1, c2, c1Avg, c2Avg);
    }

    addTitle() {
        const c1Name = this.options.countries.country1.name;
        const c2Name = this.options.countries.country2.name;

        this.titleGroup.append('text')
            .attr('class', 'chart-title-text')
            .text(this.options.title);

        this.titleGroup.append('text')
            .attr('class', 'chart-subtitle-text')
            .attr('y', 20)
            .text(`${c1Name} vs ${c2Name} (${this.options.subtitle})`);
    }

    renderCasualtiesPanel(timeline, c1Field, c2Field, c1, c2, c1Avg, c2Avg) {
        const panel = this.topPanel;
        const yScale = this.yScaleCasualties;

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
            .text('Average Casualties per Event');

        // Grid
        this.renderGrid(panel, yScale);

        // X Axis
        const xAxisCasualties = panel.append('g')
            .attr('class', 'axis axis-x')
            .attr('transform', `translate(0, ${this.panelHeight})`);

        if (this.isMonthly) {
            xAxisCasualties.call(d3.axisBottom(this.xScale)
                .ticks(d3.timeMonth.every(6))
                .tickFormat(d3.timeFormat('%b %Y')));
        } else {
            xAxisCasualties.call(d3.axisBottom(this.xScale)
                .tickFormat(d3.format('d'))
                .ticks(9));
        }

        // Y Axis
        const yAxisGroup = panel.append('g')
            .attr('class', 'axis axis-y')
            .call(d3.axisLeft(yScale).ticks(5));

        yAxisGroup.append('text')
            .attr('class', 'axis-label axis-label-y')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.panelHeight / 2)
            .attr('y', -50)
            .text('Casualties/Event');

        // Average reference lines
        this.renderAverageLines(panel, yScale, c1Avg, c2Avg, c1, c2);

        // Data lines
        this.renderDataLines(panel, timeline, c1Field, c2Field, c1, c2, yScale, 'casualties');
    }

    renderEventsPanel(timeline, c1Field, c2Field, c1, c2) {
        const panel = this.bottomPanel;
        const yScale = this.yScaleEvents;

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
            .text(this.isMonthly ? 'Number of Reported Conflict Events per Month' : 'Number of Reported Conflict Events per Year');

        // Grid
        this.renderGrid(panel, yScale);

        // X Axis
        const xAxisEvents = panel.append('g')
            .attr('class', 'axis axis-x')
            .attr('transform', `translate(0, ${this.panelHeight})`);

        if (this.isMonthly) {
            xAxisEvents.call(d3.axisBottom(this.xScale)
                .ticks(d3.timeMonth.every(6))
                .tickFormat(d3.timeFormat('%b %Y')));
        } else {
            xAxisEvents.call(d3.axisBottom(this.xScale)
                .tickFormat(d3.format('d'))
                .ticks(9));
        }

        // Y Axis
        const yAxisGroup = panel.append('g')
            .attr('class', 'axis axis-y')
            .call(d3.axisLeft(yScale).ticks(5));

        yAxisGroup.append('text')
            .attr('class', 'axis-label axis-label-y')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.panelHeight / 2)
            .attr('y', -50)
            .text('Events');

        // Data lines
        this.renderDataLines(panel, timeline, c1Field, c2Field, c1, c2, yScale, 'events');
    }

    renderGrid(panel, yScale) {
        panel.append('g')
            .attr('class', 'grid grid-y')
            .call(d3.axisLeft(yScale)
                .tickSize(-this.width)
                .tickFormat('')
                .ticks(5)
            );
    }

    renderAverageLines(panel, yScale, c1Avg, c2Avg, c1, c2) {
        // Country 1 average line
        const c1AvgGroup = panel.append('g')
            .attr('class', 'avg-line-group c1-avg');

        c1AvgGroup.append('line')
            .attr('x1', 0)
            .attr('x2', this.width)
            .attr('y1', yScale(c1Avg))
            .attr('y2', yScale(c1Avg))
            .attr('stroke', c1.color)
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '8,4')
            .attr('opacity', 0.7);

        c1AvgGroup.append('text')
            .attr('x', this.width + 5)
            .attr('y', yScale(c1Avg) + 4)
            .attr('fill', c1.color)
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .text(`Avg: ${c1Avg.toFixed(1)}`);

        // Country 2 average line
        const c2AvgGroup = panel.append('g')
            .attr('class', 'avg-line-group c2-avg');

        c2AvgGroup.append('line')
            .attr('x1', 0)
            .attr('x2', this.width)
            .attr('y1', yScale(c2Avg))
            .attr('y2', yScale(c2Avg))
            .attr('stroke', c2.color)
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '8,4')
            .attr('opacity', 0.7);

        c2AvgGroup.append('text')
            .attr('x', this.width + 5)
            .attr('y', yScale(c2Avg) + 4)
            .attr('fill', c2.color)
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .text(`Avg: ${c2Avg.toFixed(1)}`);
    }

    renderDataLines(panel, timeline, c1Field, c2Field, c1, c2, yScale, type) {
        // Line generators
        const c1Line = d3.line()
            .x(d => this.xScale(this.getTimeValue(d)))
            .y(d => yScale(d[c1Field] || 0))
            .curve(d3.curveMonotoneX);

        const c2Line = d3.line()
            .x(d => this.xScale(this.getTimeValue(d)))
            .y(d => yScale(d[c2Field] || 0))
            .curve(d3.curveMonotoneX);

        // Country 1 line
        const c1Path = panel.append('path')
            .datum(timeline)
            .attr('class', 'line c1-line')
            .attr('d', c1Line)
            .attr('fill', 'none')
            .attr('stroke', c1.color)
            .attr('stroke-width', 2.5);

        // Country 2 line
        const c2Path = panel.append('path')
            .datum(timeline)
            .attr('class', 'line c2-line')
            .attr('d', c2Line)
            .attr('fill', 'none')
            .attr('stroke', c2.color)
            .attr('stroke-width', 2.5);

        // Animate
        if (this.options.animate) {
            this.animateLine(c1Path);
            this.animateLine(c2Path);
        }

        // Data points
        this.renderDataPoints(panel, timeline, c1Field, c1, yScale, type);
        this.renderDataPoints(panel, timeline, c2Field, c2, yScale, type);
    }

    animateLine(path) {
        const totalLength = path.node().getTotalLength();
        path
            .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
            .attr('stroke-dashoffset', totalLength)
            .transition()
            .duration(this.options.animationDuration)
            .ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0)
            .on('end', () => path.attr('stroke-dasharray', null));
    }

    renderDataPoints(panel, timeline, field, country, yScale, type) {
        const c1 = this.options.countries.country1;
        const c2 = this.options.countries.country2;

        // Filter to only show local maxima and minima (peaks and valleys)
        const dataWithValues = timeline.filter(d => d[field] > 0);
        const extremePoints = dataWithValues.filter((d, i, arr) => {
            if (arr.length <= 2) return true; // Show all if very few points
            if (i === 0 || i === arr.length - 1) return false; // Skip first/last

            const prev = arr[i - 1][field];
            const curr = d[field];
            const next = arr[i + 1][field];

            // Local maximum or minimum
            const isMax = curr > prev && curr > next;
            const isMin = curr < prev && curr < next;

            // Also include significant changes (>50% change from neighbors)
            const avgNeighbor = (prev + next) / 2;
            const isSignificant = Math.abs(curr - avgNeighbor) / avgNeighbor > 0.5;

            return isMax || isMin || isSignificant;
        });

        panel.selectAll(`.dot-${country.fieldPrefix}-${type}`)
            .data(extremePoints)
            .join('circle')
            .attr('class', `dot dot-${country.fieldPrefix}-${type}`)
            .attr('cx', d => this.xScale(this.getTimeValue(d)))
            .attr('cy', d => yScale(d[field]))
            .attr('r', 5)
            .attr('fill', country.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseenter', (event, d) => {
                let content;
                const timeLabel = this.isMonthly ? d.year_month : d.year;
                if (type === 'casualties') {
                    content = {
                        title: `${country.name} - ${timeLabel}`,
                        rows: [
                            { label: 'Casualties per Event', value: d[field].toFixed(1), format: 'text' },
                            { label: 'Total Deaths', value: (d[`${country.fieldPrefix}Deaths`] || 0).toLocaleString(), format: 'text' },
                            { label: 'Events', value: d[`${country.fieldPrefix}Events`] || 0, format: 'number' }
                        ]
                    };

                    // Add comparison insight
                    const otherField = country === c1
                        ? `${c2.fieldPrefix}CasualtiesPerEvent`
                        : `${c1.fieldPrefix}CasualtiesPerEvent`;
                    const otherValue = d[otherField] || 0;
                    if (otherValue > 0) {
                        const ratio = (d[field] / otherValue).toFixed(1);
                        const otherName = country === c1 ? c2.name : c1.name;
                        if (ratio > 1) {
                            content.rows.push({
                                label: '⚠️ Comparison',
                                value: `${ratio}× more deadly than ${otherName}`,
                                format: 'text',
                                highlight: true
                            });
                        }
                    }
                } else {
                    content = {
                        title: `${country.name} - ${timeLabel}`,
                        rows: [
                            { label: 'Conflict Events', value: d[field], format: 'number' },
                            { label: 'Total Deaths', value: (d[`${country.fieldPrefix}Deaths`] || 0).toLocaleString(), format: 'text' }
                        ]
                    };
                }

                if (this.tooltip) this.tooltip.show(content, event);
            })
            .on('mousemove', (event) => {
                if (this.tooltip) this.tooltip.move(event);
            })
            .on('mouseleave', () => {
                if (this.tooltip) this.tooltip.hide();
            });
    }

    renderConflictPeriods(annotations, timeline) {
        const c1Color = this.options.countries.country1.color;
        const c2Color = this.options.countries.country2.color;
        const endTime = this.isMonthly
            ? this.getTimeValue(timeline[timeline.length - 1])
            : d3.max(timeline, d => d.year);

        // Sort annotations
        const sortedAnnotations = [...annotations].sort((a, b) => {
            if (this.isMonthly) {
                return (a.year_month || '').localeCompare(b.year_month || '');
            }
            return a.year - b.year;
        });

        sortedAnnotations.forEach((annotation, index) => {
            const startTime = this.isMonthly
                ? this.timeParser(annotation.year_month)
                : annotation.year;
            const startX = this.xScale(startTime);
            const endX = this.xScale(endTime);
            const zoneWidth = endX - startX;

            // Determine color based on country
            const color = (annotation.country === 'country1' || annotation.country === 'liberia')
                ? c1Color : c2Color;

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

    renderDisparityZone(zone) {
        const start = this.isMonthly ? this.timeParser(zone.start) : zone.start;
        const end = this.isMonthly ? this.timeParser(zone.end) : zone.end;
        const x1 = this.xScale(start);
        const x2 = this.xScale(end);
        const zoneWidth = x2 - x1;

        // Top panel disparity zone
        this.topPanel.insert('rect', ':first-child')
            .attr('class', 'disparity-zone')
            .attr('x', x1)
            .attr('y', 0)
            .attr('width', zoneWidth)
            .attr('height', this.panelHeight)
            .attr('fill', '#FFC107')
            .attr('opacity', 0)
            .transition()
            .delay(this.options.animationDuration)
            .duration(500)
            .attr('opacity', 0.12);

        // Bottom panel disparity zone
        this.bottomPanel.insert('rect', ':first-child')
            .attr('class', 'disparity-zone')
            .attr('x', x1)
            .attr('y', 0)
            .attr('width', zoneWidth)
            .attr('height', this.panelHeight)
            .attr('fill', '#FFC107')
            .attr('opacity', 0)
            .transition()
            .delay(this.options.animationDuration)
            .duration(500)
            .attr('opacity', 0.12);

        // Disparity label (positioned inside top panel to avoid axis overlap)
        const labelY = 40;

        const labelGroup = this.chartGroup.append('g')
            .attr('class', 'disparity-label-group')
            .attr('transform', `translate(${x1 + zoneWidth / 2}, ${labelY})`)
            .style('opacity', 0);

        labelGroup.append('rect')
            .attr('class', 'disparity-label-bg')
            .attr('x', -160)
            .attr('y', -12)
            .attr('width', 320)
            .attr('height', 24)
            .attr('rx', 4)
            .attr('fill', '#FFF8E1')
            .attr('stroke', '#FFC107');

        labelGroup.append('text')
            .attr('class', 'disparity-label-text')
            .attr('text-anchor', 'middle')
            .attr('dy', 4)
            .attr('font-size', '11px')
            .text(`⚠️ ${zone.label || 'Coverage Gap: High deaths, low documentation'}`);

        labelGroup.transition()
            .delay(this.options.animationDuration + 500)
            .duration(500)
            .style('opacity', 1);
    }

    renderAnnotations(annotations) {
        const c1Color = this.options.countries.country1.color;
        const c2Color = this.options.countries.country2.color;

        annotations.forEach((annotation, index) => {
            const annotTime = this.isMonthly
                ? this.timeParser(annotation.year_month)
                : annotation.year;
            const x = this.xScale(annotTime);

            // Determine color based on country
            const color = (annotation.country === 'country1' || annotation.country === 'liberia')
                ? c1Color : c2Color;

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

    renderLegend(c1, c2, c1Avg, c2Avg) {
        const items = [
            { label: c1.name, color: c1.color, avg: c1Avg },
            { label: c2.name, color: c2.color, avg: c2Avg }
        ];

        const legendItem = this.legendGroup.selectAll('.legend-item')
            .data(items)
            .join('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(${i * 140}, 0)`);

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

    resize() {
        this.updateDimensions();
        this.setup();
        if (this.data) this.render();
    }

    destroy() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        this.container.innerHTML = '';
    }
}
