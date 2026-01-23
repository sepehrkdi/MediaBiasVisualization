/**
 * Animated Choropleth Map
 * Yearly animated geographic visualization with playback controls
 */

import { ChoroplethMap } from './ChoroplethMap.js';

export class AnimatedChoroplethMap extends ChoroplethMap {
    constructor(container, data, options = {}) {
        super(container, data, {
            animationSpeed: 1000,
            autoPlay: false,
            loop: true,
            metric: 'fatalities', // 'events' or 'fatalities'
            colorScheme: 'interpolateYlOrRd', // Red-yellow for conflict intensity
            ...options
        });

        this.years = data?.years || [];
        this.coverageByYear = data?.coverageByYear || {};
        this.yearStats = data?.yearStats || {};
        this.metadata = data?.metadata || {};

        this.currentYearIndex = 0;
        this.currentYear = this.years[0];
        this.isPlaying = false;
        this.animationTimer = null;

        // Store references for updates
        this.colorScale = null;
        this.coverageMap = new Map();
        this.path = null;
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

        // Create projection and path
        const projection = this.getProjection();
        this.path = d3.geoPath().projection(projection);

        // Extract countries from topology
        const countries = topojson.feature(this.worldData, this.worldData.objects.countries);

        // Create country name to ISO3 mapping for the world-atlas data
        // World-atlas uses numeric IDs, we need to map them
        this.countryFeatures = countries.features;

        // Setup color scale based on global max
        this.setupColorScale();

        // Initialize with first year's data
        this.updateCoverageMap(this.currentYear);

        // Draw countries
        this.countryPaths = this.dataGroup.selectAll('.country')
            .data(this.countryFeatures)
            .join('path')
            .attr('class', 'country')
            .attr('d', this.path)
            .attr('fill', d => this.getCountryColor(d))
            .attr('stroke', '#fff')
            .attr('stroke-width', 0.5);

        // Interactivity
        this.countryPaths
            .on('mouseenter', (event, d) => {
                d3.select(event.currentTarget)
                    .classed('is-highlighted', true)
                    .attr('stroke-width', 2);

                this.showCountryTooltip(d, event);
            })
            .on('mousemove', (event) => this.moveTooltip(event))
            .on('mouseleave', (event) => {
                d3.select(event.currentTarget)
                    .classed('is-highlighted', false)
                    .attr('stroke-width', 0.5);
                this.hideTooltip();
            });

        // Zoom functionality
        if (this.options.zoomable) {
            this.setupZoom(projection, this.path);
        }

        // Create animated legend
        this.createAnimatedLegend();

        // Create playback controls
        this.createPlaybackControls();

        // Auto-play if enabled
        if (this.options.autoPlay) {
            setTimeout(() => this.play(), 500);
        }
    }

    setupColorScale() {
        const metric = this.options.metric;
        let maxValue;

        if (metric === 'events') {
            maxValue = this.metadata.globalMaxEvents || 1000;
        } else {
            maxValue = this.metadata.globalMaxFatalities || 10000;
        }

        // Use a sequential color scale - red tones for conflict intensity
        this.colorScale = d3.scaleSequentialLog(d3[this.options.colorScheme])
            .domain([1, maxValue])
            .clamp(true);
    }

    updateCoverageMap(year) {
        const yearData = this.coverageByYear[year] || [];
        this.coverageMap = new Map(yearData.map(d => [d.id, d]));
    }

    getCountryColor(feature) {
        // Try to match by ISO3 code from our data
        const countryData = this.findCountryData(feature);

        if (!countryData) {
            return '#e0e0e0'; // No data - gray
        }

        const value = this.options.metric === 'events'
            ? countryData.events
            : countryData.fatalities;

        return value > 0 ? this.colorScale(value) : '#e0e0e0';
    }

    findCountryData(feature) {
        // World-atlas uses numeric IDs that correspond to ISO 3166-1 numeric codes
        // We need to map these to our ISO3 alpha codes
        const numericId = feature.id;
        const iso3 = this.numericToISO3(numericId);

        return this.coverageMap.get(iso3);
    }

    numericToISO3(numericId) {
        // ISO 3166-1 numeric to alpha-3 mapping
        const numericToAlpha3 = {
            '4': 'AFG', '8': 'ALB', '12': 'DZA', '24': 'AGO', '32': 'ARG',
            '51': 'ARM', '36': 'AUS', '40': 'AUT', '31': 'AZE', '48': 'BHR',
            '50': 'BGD', '56': 'BEL', '204': 'BEN', '64': 'BTN', '68': 'BOL',
            '70': 'BIH', '72': 'BWA', '76': 'BRA', '854': 'BFA', '108': 'BDI',
            '116': 'KHM', '120': 'CMR', '124': 'CAN', '140': 'CAF', '148': 'TCD',
            '152': 'CHL', '156': 'CHN', '170': 'COL', '174': 'COM', '178': 'COG',
            '180': 'COD', '188': 'CRI', '191': 'HRV', '192': 'CUB', '196': 'CYP',
            '203': 'CZE', '208': 'DNK', '262': 'DJI', '214': 'DOM', '218': 'ECU',
            '818': 'EGY', '222': 'SLV', '226': 'GNQ', '232': 'ERI', '233': 'EST',
            '231': 'ETH', '246': 'FIN', '250': 'FRA', '266': 'GAB', '270': 'GMB',
            '268': 'GEO', '276': 'DEU', '288': 'GHA', '300': 'GRC', '320': 'GTM',
            '324': 'GIN', '624': 'GNB', '328': 'GUY', '332': 'HTI', '340': 'HND',
            '348': 'HUN', '356': 'IND', '360': 'IDN', '364': 'IRN', '368': 'IRQ',
            '372': 'IRL', '376': 'ISR', '380': 'ITA', '384': 'CIV', '388': 'JAM',
            '392': 'JPN', '400': 'JOR', '398': 'KAZ', '404': 'KEN', '414': 'KWT',
            '417': 'KGZ', '418': 'LAO', '428': 'LVA', '422': 'LBN', '426': 'LSO',
            '430': 'LBR', '434': 'LBY', '440': 'LTU', '807': 'MKD', '450': 'MDG',
            '454': 'MWI', '458': 'MYS', '466': 'MLI', '470': 'MLT', '478': 'MRT',
            '484': 'MEX', '498': 'MDA', '504': 'MAR', '508': 'MOZ', '104': 'MMR',
            '516': 'NAM', '524': 'NPL', '528': 'NLD', '554': 'NZL', '558': 'NIC',
            '562': 'NER', '566': 'NGA', '408': 'PRK', '578': 'NOR', '512': 'OMN',
            '586': 'PAK', '275': 'PSE', '591': 'PAN', '598': 'PNG', '600': 'PRY',
            '604': 'PER', '608': 'PHL', '616': 'POL', '620': 'PRT', '634': 'QAT',
            '642': 'ROU', '643': 'RUS', '646': 'RWA', '682': 'SAU', '686': 'SEN',
            '688': 'SRB', '694': 'SLE', '703': 'SVK', '705': 'SVN', '90': 'SLB',
            '706': 'SOM', '710': 'ZAF', '410': 'KOR', '728': 'SSD', '724': 'ESP',
            '144': 'LKA', '729': 'SDN', '752': 'SWE', '756': 'CHE', '760': 'SYR',
            '158': 'TWN', '762': 'TJK', '834': 'TZA', '764': 'THA', '768': 'TGO',
            '780': 'TTO', '788': 'TUN', '792': 'TUR', '795': 'TKM', '800': 'UGA',
            '804': 'UKR', '784': 'ARE', '826': 'GBR', '840': 'USA', '858': 'URY',
            '860': 'UZB', '862': 'VEN', '704': 'VNM', '887': 'YEM', '894': 'ZMB',
            '716': 'ZWE', '748': 'SWZ', '-99': 'XKX'
        };

        return numericToAlpha3[String(numericId)] || null;
    }

    showCountryTooltip(feature, event) {
        const countryData = this.findCountryData(feature);
        const countryName = feature.properties?.name || 'Unknown';

        if (countryData) {
            this.showTooltip({
                title: `${countryName} (${this.currentYear})`,
                rows: [
                    { label: 'Events', value: countryData.events, format: 'number' },
                    { label: 'Fatalities', value: countryData.fatalities, format: 'number' },
                    { label: 'Civilian Deaths', value: countryData.civilianDeaths, format: 'number' }
                ]
            }, event);
        } else {
            this.showTooltip({
                title: countryName,
                secondary: `No conflict data for ${this.currentYear}`
            }, event);
        }
    }

    createAnimatedLegend() {
        const legendWidth = 200;
        const legendHeight = 12;

        // Remove existing legend
        this.svg.selectAll('.legend-gradient').remove();
        this.svg.selectAll('.year-display').remove();

        // Year display - prominent year indicator
        this.yearDisplay = this.svg.append('g')
            .attr('class', 'year-display')
            .attr('transform', `translate(${this.width / 2 + this.options.margin.left}, ${this.options.margin.top - 10})`);

        this.yearText = this.yearDisplay.append('text')
            .attr('class', 'year-text')
            .attr('text-anchor', 'middle')
            .attr('font-size', '28px')
            .attr('font-weight', 'bold')
            .attr('fill', '#333')
            .text(this.currentYear);

        // Legend group
        const legendGroup = this.svg.append('g')
            .attr('class', 'legend-gradient')
            .attr('transform', `translate(${this.options.margin.left}, ${this.height + this.options.margin.top + 30})`);

        // Create gradient
        const defs = this.svg.select('defs').empty() ? this.svg.append('defs') : this.svg.select('defs');

        defs.selectAll('#animated-coverage-gradient').remove();
        const gradient = defs.append('linearGradient')
            .attr('id', 'animated-coverage-gradient')
            .attr('x1', '0%')
            .attr('x2', '100%');

        // Add color stops
        const domain = this.colorScale.domain();
        const numStops = 10;
        for (let i = 0; i <= numStops; i++) {
            const t = i / numStops;
            // Use logarithmic interpolation for the value
            const value = Math.exp(Math.log(domain[0]) + t * (Math.log(domain[1]) - Math.log(domain[0])));
            gradient.append('stop')
                .attr('offset', `${t * 100}%`)
                .attr('stop-color', this.colorScale(value));
        }

        // Draw gradient bar
        legendGroup.append('rect')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .attr('rx', 2)
            .style('fill', 'url(#animated-coverage-gradient)');

        // Add labels
        const metricLabel = this.options.metric === 'events' ? 'Conflict Events' : 'Fatalities';

        legendGroup.append('text')
            .attr('class', 'legend-gradient-label')
            .attr('x', 0)
            .attr('y', legendHeight + 15)
            .attr('font-size', '11px')
            .text('1');

        legendGroup.append('text')
            .attr('class', 'legend-gradient-label')
            .attr('x', legendWidth)
            .attr('y', legendHeight + 15)
            .attr('text-anchor', 'end')
            .attr('font-size', '11px')
            .text(this.formatNumber(this.colorScale.domain()[1]));

        // Title
        legendGroup.append('text')
            .attr('class', 'legend-title')
            .attr('y', -5)
            .attr('font-size', '12px')
            .attr('font-weight', '600')
            .text(metricLabel);

        // Stats display
        this.statsDisplay = legendGroup.append('g')
            .attr('class', 'stats-display')
            .attr('transform', `translate(${legendWidth + 40}, 0)`);

        this.updateStatsDisplay();
    }

    updateStatsDisplay() {
        const stats = this.yearStats[this.currentYear] || {};

        this.statsDisplay.selectAll('*').remove();

        this.statsDisplay.append('text')
            .attr('font-size', '11px')
            .attr('fill', '#666')
            .text(`${stats.countryCount || 0} countries affected`);

        this.statsDisplay.append('text')
            .attr('y', 15)
            .attr('font-size', '11px')
            .attr('fill', '#666')
            .text(`${this.formatNumber(stats.totalEvents || 0)} events, ${this.formatNumber(stats.totalFatalities || 0)} fatalities`);
    }

    createPlaybackControls() {
        // Remove existing controls
        d3.select(this.container).selectAll('.playback-controls').remove();

        // Create controls container
        const controlsDiv = d3.select(this.container)
            .append('div')
            .attr('class', 'playback-controls')
            .style('position', 'absolute')
            .style('bottom', '60px')
            .style('left', '50%')
            .style('transform', 'translateX(-50%)')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '15px')
            .style('background', 'rgba(255,255,255,0.95)')
            .style('padding', '10px 20px')
            .style('border-radius', '25px')
            .style('box-shadow', '0 2px 10px rgba(0,0,0,0.15)');

        // Play/Pause button
        this.playButton = controlsDiv.append('button')
            .attr('class', 'play-btn')
            .style('width', '36px')
            .style('height', '36px')
            .style('border-radius', '50%')
            .style('border', 'none')
            .style('background', '#3498db')
            .style('color', 'white')
            .style('cursor', 'pointer')
            .style('font-size', '14px')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('justify-content', 'center')
            .html('▶')
            .on('click', () => this.togglePlay());

        // Year slider
        const sliderContainer = controlsDiv.append('div')
            .style('display', 'flex')
            .style('flex-direction', 'column')
            .style('align-items', 'center');

        this.yearSlider = sliderContainer.append('input')
            .attr('type', 'range')
            .attr('min', 0)
            .attr('max', this.years.length - 1)
            .attr('value', 0)
            .style('width', '200px')
            .style('cursor', 'pointer')
            .on('input', (event) => {
                this.pause();
                this.setYearByIndex(parseInt(event.target.value));
            });

        // Year range labels
        const labelsDiv = sliderContainer.append('div')
            .style('display', 'flex')
            .style('justify-content', 'space-between')
            .style('width', '200px')
            .style('font-size', '11px')
            .style('color', '#666');

        labelsDiv.append('span').text(this.years[0] || '');
        labelsDiv.append('span').text(this.years[this.years.length - 1] || '');

        // Speed control
        controlsDiv.append('select')
            .attr('class', 'speed-select')
            .style('padding', '5px 10px')
            .style('border-radius', '5px')
            .style('border', '1px solid #ddd')
            .style('cursor', 'pointer')
            .on('change', (event) => {
                this.options.animationSpeed = parseInt(event.target.value);
            })
            .selectAll('option')
            .data([
                { value: 2000, label: '0.5x' },
                { value: 1000, label: '1x' },
                { value: 500, label: '2x' },
                { value: 250, label: '4x' }
            ])
            .join('option')
            .attr('value', d => d.value)
            .attr('selected', d => d.value === this.options.animationSpeed ? '' : null)
            .text(d => d.label);
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.playButton.html('⏸');

        const animate = () => {
            if (!this.isPlaying) return;

            // Move to next year
            this.currentYearIndex++;

            // Loop or stop at end
            if (this.currentYearIndex >= this.years.length) {
                if (this.options.loop) {
                    this.currentYearIndex = 0;
                } else {
                    this.pause();
                    return;
                }
            }

            this.animateToYear(this.years[this.currentYearIndex]);

            // Schedule next frame
            this.animationTimer = setTimeout(animate, this.options.animationSpeed);
        };

        animate();
    }

    pause() {
        this.isPlaying = false;
        this.playButton?.html('▶');

        if (this.animationTimer) {
            clearTimeout(this.animationTimer);
            this.animationTimer = null;
        }
    }

    setYearByIndex(index) {
        if (index < 0 || index >= this.years.length) return;

        this.currentYearIndex = index;
        this.animateToYear(this.years[index]);
    }

    setYear(year) {
        const index = this.years.indexOf(String(year));
        if (index !== -1) {
            this.setYearByIndex(index);
        }
    }

    animateToYear(year) {
        this.currentYear = year;
        this.updateCoverageMap(year);

        // Update year display
        this.yearText?.text(year);

        // Update slider
        this.yearSlider?.property('value', this.currentYearIndex);

        // Animate country colors
        this.countryPaths
            .transition()
            .duration(this.options.animationSpeed * 0.6)
            .attr('fill', d => this.getCountryColor(d));

        // Update stats
        this.updateStatsDisplay();
    }

    // Override destroy to clean up animation
    destroy() {
        this.pause();
        super.destroy?.();
    }
}
