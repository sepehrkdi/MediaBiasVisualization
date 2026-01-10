/**
 * Intensity Comparison Chart
 * Single-panel visualization showing average casualties per event
 * with horizontal reference lines for overall averages
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
            margin: { top: 60, right: 120, bottom: 60, left: 80 },
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
        
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('class', 'intensity-comparison-svg')
            .attr('width', this.width + this.options.margin.left + this.options.margin.right)
            .attr('height', this.height + this.options.margin.top + this.options.margin.bottom)
            .attr('viewBox', `0 0 ${this.width + this.options.margin.left + this.options.margin.right} ${this.height + this.options.margin.top + this.options.margin.bottom}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        this.chartGroup = this.svg.append('g')
            .attr('class', 'chart-group')
            .attr('transform', `translate(${this.options.margin.left}, ${this.options.margin.top})`);

        this.legendGroup = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.options.margin.left + this.width + 15}, ${this.options.margin.top + 20})`);
        
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
        this.width = Math.max((rect.width || 800) - this.options.margin.left - this.options.margin.right, 400);
        this.height = Math.max((rect.height || 500) - this.options.margin.top - this.options.margin.bottom, 300);
    }

    render() {
        if (!this.data?.timeline) return;

        const timeline = this.data.timeline;
        const c1 = this.options.countries.country1;
        const c2 = this.options.countries.country2;
        
        // Field names
        const c1Field = `${c1.fieldPrefix}CasualtiesPerEvent`;
        const c2Field = `${c2.fieldPrefix}CasualtiesPerEvent`;
        
        // Calculate averages (only where there's data)
        const c1Data = timeline.filter(d => d[c1Field] > 0);
        const c2Data = timeline.filter(d => d[c2Field] > 0);
        const c1Avg = d3.mean(c1Data, d => d[c1Field]) || 0;
        const c2Avg = d3.mean(c2Data, d => d[c2Field]) || 0;

        // Scales
        this.xScale = d3.scaleLinear()
            .domain(d3.extent(timeline, d => d.year))
            .range([0, this.width]);

        const maxIntensity = d3.max(timeline, d => Math.max(d[c1Field] || 0, d[c2Field] || 0));
        this.yScale = d3.scaleLinear()
            .domain([0, maxIntensity * 1.15])
            .range([this.height, 0])
            .nice();

        // Clear previous
        this.chartGroup.selectAll('*').remove();
        this.titleGroup.selectAll('*').remove();
        this.legendGroup.selectAll('*').remove();

        // Add title
        this.addTitle();

        // Grid
        this.renderGrid();

        // Axes
        this.renderAxes();

        // Average reference lines (render first, behind data lines)
        this.renderAverageLines(c1Avg, c2Avg, c1, c2);

        // Data lines
        this.renderDataLines(timeline, c1Field, c2Field, c1, c2);

        // Legend
        this.renderLegend(c1, c2, c1Avg, c2Avg);
    }

    addTitle() {
        const c1Name = this.options.countries.country1.name;
        const c2Name = this.options.countries.country2.name;
        
        this.titleGroup.append('text')
            .attr('class', 'chart-title-text')
            .attr('font-size', '18px')
            .attr('font-weight', 'bold')
            .text(this.options.title);
        
        this.titleGroup.append('text')
            .attr('class', 'chart-subtitle-text')
            .attr('y', 22)
            .attr('font-size', '14px')
            .attr('fill', '#666')
            .text(`${c1Name} vs ${c2Name} (${this.options.subtitle})`);
    }

    renderGrid() {
        this.chartGroup.append('g')
            .attr('class', 'grid grid-y')
            .call(d3.axisLeft(this.yScale)
                .tickSize(-this.width)
                .tickFormat('')
                .ticks(6)
            )
            .selectAll('line')
            .attr('stroke', '#e0e0e0')
            .attr('stroke-dasharray', '2,2');
    }

    renderAxes() {
        // X Axis
        const xAxis = d3.axisBottom(this.xScale)
            .tickFormat(d3.format('d'))
            .ticks(9);

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
            .text('Year');

        // Y Axis
        const yAxis = d3.axisLeft(this.yScale).ticks(6);

        this.chartGroup.append('g')
            .attr('class', 'axis axis-y')
            .call(yAxis);

        // Y Axis label
        this.chartGroup.append('text')
            .attr('class', 'axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -this.height / 2)
            .attr('y', -55)
            .attr('text-anchor', 'middle')
            .attr('fill', '#666')
            .text('Average Casualties per Event');
    }

    renderAverageLines(c1Avg, c2Avg, c1, c2) {
        // Country 1 average line
        const c1AvgGroup = this.chartGroup.append('g')
            .attr('class', 'avg-line-group c1-avg');

        c1AvgGroup.append('line')
            .attr('x1', 0)
            .attr('x2', this.width)
            .attr('y1', this.yScale(c1Avg))
            .attr('y2', this.yScale(c1Avg))
            .attr('stroke', c1.color)
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '8,4')
            .attr('opacity', 0.7);

        c1AvgGroup.append('text')
            .attr('x', this.width + 5)
            .attr('y', this.yScale(c1Avg) + 4)
            .attr('fill', c1.color)
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .text(`Avg: ${c1Avg.toFixed(1)}`);

        // Country 2 average line
        const c2AvgGroup = this.chartGroup.append('g')
            .attr('class', 'avg-line-group c2-avg');

        c2AvgGroup.append('line')
            .attr('x1', 0)
            .attr('x2', this.width)
            .attr('y1', this.yScale(c2Avg))
            .attr('y2', this.yScale(c2Avg))
            .attr('stroke', c2.color)
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '8,4')
            .attr('opacity', 0.7);

        c2AvgGroup.append('text')
            .attr('x', this.width + 5)
            .attr('y', this.yScale(c2Avg) + 4)
            .attr('fill', c2.color)
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .text(`Avg: ${c2Avg.toFixed(1)}`);
    }

    renderDataLines(timeline, c1Field, c2Field, c1, c2) {
        // Line generators
        const c1Line = d3.line()
            .x(d => this.xScale(d.year))
            .y(d => this.yScale(d[c1Field] || 0))
            .curve(d3.curveMonotoneX);

        const c2Line = d3.line()
            .x(d => this.xScale(d.year))
            .y(d => this.yScale(d[c2Field] || 0))
            .curve(d3.curveMonotoneX);

        // Country 1 line
        const c1Path = this.chartGroup.append('path')
            .datum(timeline)
            .attr('class', 'line c1-line')
            .attr('d', c1Line)
            .attr('fill', 'none')
            .attr('stroke', c1.color)
            .attr('stroke-width', 2.5);

        // Country 2 line
        const c2Path = this.chartGroup.append('path')
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
        this.renderDataPoints(timeline, c1Field, c1);
        this.renderDataPoints(timeline, c2Field, c2);
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

    renderDataPoints(timeline, field, country) {
        const c1 = this.options.countries.country1;
        const c2 = this.options.countries.country2;
        const c1Field = `${c1.fieldPrefix}CasualtiesPerEvent`;
        const c2Field = `${c2.fieldPrefix}CasualtiesPerEvent`;
        
        this.chartGroup.selectAll(`.dot-${country.fieldPrefix}`)
            .data(timeline.filter(d => d[field] > 0))
            .join('circle')
            .attr('class', `dot dot-${country.fieldPrefix}`)
            .attr('cx', d => this.xScale(d.year))
            .attr('cy', d => this.yScale(d[field]))
            .attr('r', 5)
            .attr('fill', country.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseenter', (event, d) => {
                const content = {
                    title: `${country.name} - ${d.year}`,
                    rows: [
                        { label: 'Casualties per Event', value: d[field].toFixed(1), format: 'text' },
                        { label: 'Total Deaths', value: (d[`${country.fieldPrefix}Deaths`] || 0).toLocaleString(), format: 'text' },
                        { label: 'Events', value: d[`${country.fieldPrefix}Events`] || 0, format: 'number' }
                    ]
                };
                
                // Add comparison insight
                const otherField = field === c1Field ? c2Field : c1Field;
                const otherValue = d[otherField] || 0;
                if (otherValue > 0) {
                    const ratio = (d[field] / otherValue).toFixed(1);
                    const otherName = field === c1Field ? c2.name : c1.name;
                    if (ratio > 1) {
                        content.rows.push({
                            label: '⚠️ Comparison',
                            value: `${ratio}× more deadly than ${otherName}`,
                            format: 'text',
                            highlight: true
                        });
                    }
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

    renderLegend(c1, c2, c1Avg, c2Avg) {
        const items = [
            { label: c1.name, color: c1.color, avg: c1Avg },
            { label: c2.name, color: c2.color, avg: c2Avg }
        ];

        const legendItem = this.legendGroup.selectAll('.legend-item')
            .data(items)
            .join('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 25})`);

        legendItem.append('line')
            .attr('x1', 0)
            .attr('x2', 20)
            .attr('y1', 0)
            .attr('y2', 0)
            .attr('stroke', d => d.color)
            .attr('stroke-width', 2.5);

        legendItem.append('circle')
            .attr('cx', 10)
            .attr('cy', 0)
            .attr('r', 4)
            .attr('fill', d => d.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5);

        legendItem.append('text')
            .attr('x', 28)
            .attr('y', 4)
            .attr('font-size', '12px')
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
