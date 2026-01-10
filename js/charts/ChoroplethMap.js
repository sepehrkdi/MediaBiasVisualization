/**
 * Choropleth Map
 * Geographic visualization using D3 and TopoJSON
 */

import { BaseChart } from './BaseChart.js';

export class ChoroplethMap extends BaseChart {
    constructor(container, data, options = {}) {
        super(container, data, {
            projection: 'naturalEarth1',
            colorScale: 'sequential',
            showGraticule: false,
            zoomable: true,
            ...options
        });
    }
    
    async render() {
        // Load world topology if not provided
        if (!this.worldData) {
            try {
                const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
                this.worldData = await response.json();
            } catch (error) {
                console.error('Failed to load world map data:', error);
                this.showMapPlaceholder();
                return;
            }
        }
        
        // Create projection
        const projection = this.getProjection();
        const path = d3.geoPath().projection(projection);
        
        // Extract countries from topology
        const countries = topojson.feature(this.worldData, this.worldData.objects.countries);
        
        // Create color scale
        const coverageData = this.data?.countries || [];
        const coverageMap = new Map(coverageData.map(d => [d.id, d]));
        
        const maxCoverage = d3.max(coverageData, d => d.coverage) || 1;
        const colorScale = d3.scaleSequential(d3.interpolateMagma)
            .domain([0, maxCoverage]);
        
        // Graticule
        if (this.options.showGraticule) {
            const graticule = d3.geoGraticule();
            this.dataGroup.append('path')
                .datum(graticule())
                .attr('class', 'graticule')
                .attr('d', path);
        }
        
        // Draw countries
        const countryPaths = this.dataGroup.selectAll('.country')
            .data(countries.features)
            .join('path')
            .attr('class', 'country')
            .attr('d', path)
            .attr('fill', d => {
                const data = coverageMap.get(d.id) || coverageMap.get(d.properties?.name);
                return data ? colorScale(data.coverage) : '#e0e0e0';
            });
        
        // Interactivity
        countryPaths
            .on('mouseenter', (event, d) => {
                d3.select(event.currentTarget).classed('is-highlighted', true);
                
                const data = coverageMap.get(d.id) || coverageMap.get(d.properties?.name);
                const name = d.properties?.name || d.id;
                
                this.showTooltip({
                    title: name,
                    value: data?.coverage,
                    format: 'number',
                    rows: data ? [
                        { label: 'Sentiment', value: data.sentiment, format: 'sentiment' }
                    ] : [],
                    secondary: data ? null : 'No data available'
                }, event);
            })
            .on('mousemove', (event) => this.moveTooltip(event))
            .on('mouseleave', (event) => {
                d3.select(event.currentTarget).classed('is-highlighted', false);
                this.hideTooltip();
            })
            .on('click', (event, d) => {
                if (this.options.onCountryClick) {
                    this.options.onCountryClick(d);
                }
            });
        
        // Zoom functionality
        if (this.options.zoomable) {
            this.setupZoom(projection, path);
        }
        
        // Legend
        this.createColorLegend(colorScale, [0, maxCoverage]);
        
        if (this.options.title) {
            this.addTitle(this.options.title);
        }
    }
    
    getProjection() {
        const projections = {
            naturalEarth1: d3.geoNaturalEarth1(),
            mercator: d3.geoMercator(),
            equalEarth: d3.geoEqualEarth(),
            orthographic: d3.geoOrthographic()
        };
        
        const projection = projections[this.options.projection] || projections.naturalEarth1;
        
        return projection
            .fitSize([this.width, this.height], { type: 'Sphere' })
            .translate([this.width / 2, this.height / 2]);
    }
    
    setupZoom(projection, path) {
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on('zoom', (event) => {
                this.dataGroup.selectAll('path')
                    .attr('transform', event.transform);
            });
        
        this.svg.call(zoom);
        
        // Double-click to reset
        this.svg.on('dblclick.zoom', () => {
            this.svg.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity);
        });
    }
    
    createColorLegend(colorScale, domain) {
        const legendWidth = 200;
        const legendHeight = 10;
        
        const legendGroup = this.svg.append('g')
            .attr('class', 'legend-gradient')
            .attr('transform', `translate(${this.options.margin.left}, ${this.height + this.options.margin.top + 20})`);
        
        // Create gradient
        const defs = this.svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'coverage-gradient')
            .attr('x1', '0%')
            .attr('x2', '100%');
        
        // Add color stops
        const numStops = 10;
        for (let i = 0; i <= numStops; i++) {
            const offset = i / numStops;
            const value = domain[0] + offset * (domain[1] - domain[0]);
            gradient.append('stop')
                .attr('offset', `${offset * 100}%`)
                .attr('stop-color', colorScale(value));
        }
        
        // Draw gradient bar
        legendGroup.append('rect')
            .attr('class', 'legend-gradient-bar')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#coverage-gradient)');
        
        // Add labels
        legendGroup.append('text')
            .attr('class', 'legend-gradient-label')
            .attr('x', 0)
            .attr('y', legendHeight + 15)
            .text(this.formatNumber(domain[0]));
        
        legendGroup.append('text')
            .attr('class', 'legend-gradient-label')
            .attr('x', legendWidth)
            .attr('y', legendHeight + 15)
            .attr('text-anchor', 'end')
            .text(this.formatNumber(domain[1]));
        
        // Title
        legendGroup.append('text')
            .attr('class', 'legend-title')
            .attr('y', -5)
            .text('Coverage Volume');
    }
    
    showMapPlaceholder() {
        this.dataGroup.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height / 2)
            .attr('text-anchor', 'middle')
            .attr('class', 'placeholder-text')
            .text('Map data loading...');
    }
    
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
    
    // Method to highlight specific countries
    highlightCountries(countryIds) {
        this.dataGroup.selectAll('.country')
            .classed('is-highlighted', d => countryIds.includes(d.id))
            .classed('is-dimmed', d => !countryIds.includes(d.id));
    }
    
    clearCountryHighlight() {
        this.dataGroup.selectAll('.country')
            .classed('is-highlighted', false)
            .classed('is-dimmed', false);
    }
}
