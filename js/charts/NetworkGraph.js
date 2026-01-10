/**
 * Network Graph
 * Force-directed network visualization
 */

import { BaseChart } from './BaseChart.js';

export class NetworkGraph extends BaseChart {
    constructor(container, data, options = {}) {
        super(container, data, {
            nodeRadius: 8,
            linkDistance: 100,
            chargeStrength: -300,
            ...options
        });
        
        this.simulation = null;
    }
    
    render() {
        if (!this.data || !this.data.nodes || !this.data.links) return;
        
        // Deep copy data to avoid mutation
        const nodes = this.data.nodes.map(d => ({ ...d }));
        const links = this.data.links.map(d => ({ ...d }));
        
        // Color scale for node groups
        const groups = [...new Set(nodes.map(d => d.group))];
        const colorScale = this.getColorScale('categorical', groups);
        
        // Size scale for nodes
        const sizeScale = d3.scaleSqrt()
            .domain(d3.extent(nodes, d => d.size || 1))
            .range([5, 25]);
        
        // Link width scale
        const linkScale = d3.scaleLinear()
            .domain(d3.extent(links, d => d.weight || 1))
            .range([1, 5]);
        
        // Create simulation
        this.simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links)
                .id(d => d.id)
                .distance(this.options.linkDistance))
            .force('charge', d3.forceManyBody()
                .strength(this.options.chargeStrength))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide()
                .radius(d => sizeScale(d.size || 1) + 5));
        
        // Draw links
        const linkElements = this.dataGroup.selectAll('.network-link')
            .data(links)
            .join('line')
            .attr('class', 'network-link')
            .attr('stroke-width', d => linkScale(d.weight || 1));
        
        // Draw nodes
        const nodeElements = this.dataGroup.selectAll('.network-node')
            .data(nodes)
            .join('circle')
            .attr('class', 'network-node')
            .attr('r', d => sizeScale(d.size || 1))
            .attr('fill', d => colorScale(d.group))
            .call(this.drag());
        
        // Draw labels
        const labelElements = this.dataGroup.selectAll('.network-label')
            .data(nodes)
            .join('text')
            .attr('class', 'network-label')
            .text(d => d.name || d.id);
        
        // Simulation tick
        this.simulation.on('tick', () => {
            linkElements
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
            
            nodeElements
                .attr('cx', d => d.x = Math.max(20, Math.min(this.width - 20, d.x)))
                .attr('cy', d => d.y = Math.max(20, Math.min(this.height - 20, d.y)));
            
            labelElements
                .attr('x', d => d.x + sizeScale(d.size || 1) + 5)
                .attr('y', d => d.y + 4);
        });
        
        // Interactivity
        nodeElements
            .on('mouseenter', (event, d) => {
                this.highlightNode(d, nodes, links);
                this.showTooltip({
                    title: d.name || d.id,
                    rows: [
                        { label: 'Type', value: d.group },
                        { label: 'Connections', value: links.filter(l => 
                            l.source.id === d.id || l.target.id === d.id
                        ).length }
                    ]
                }, event);
            })
            .on('mousemove', (event) => this.moveTooltip(event))
            .on('mouseleave', () => {
                this.clearNodeHighlight();
                this.hideTooltip();
            });
        
        // Legend
        this.createLegend(groups, colorScale);
        
        if (this.options.title) {
            this.addTitle(this.options.title);
        }
    }
    
    drag() {
        const simulation = this.simulation;
        
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
        
        return d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);
    }
    
    highlightNode(node, nodes, links) {
        // Find connected nodes
        const connectedIds = new Set([node.id]);
        links.forEach(link => {
            if (link.source.id === node.id) connectedIds.add(link.target.id);
            if (link.target.id === node.id) connectedIds.add(link.source.id);
        });
        
        // Highlight nodes
        this.dataGroup.selectAll('.network-node')
            .classed('is-highlighted', d => d.id === node.id)
            .classed('is-dimmed', d => !connectedIds.has(d.id));
        
        // Highlight links
        this.dataGroup.selectAll('.network-link')
            .classed('is-highlighted', d => 
                d.source.id === node.id || d.target.id === node.id)
            .classed('is-dimmed', d => 
                d.source.id !== node.id && d.target.id !== node.id);
        
        // Highlight labels
        this.dataGroup.selectAll('.network-label')
            .classed('is-dimmed', d => !connectedIds.has(d.id));
    }
    
    clearNodeHighlight() {
        this.dataGroup.selectAll('.network-node, .network-link, .network-label')
            .classed('is-highlighted', false)
            .classed('is-dimmed', false);
    }
    
    createLegend(groups, colorScale) {
        const legendGroup = this.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.width + this.options.margin.left - 100}, ${this.options.margin.top})`);
        
        legendGroup.append('text')
            .attr('class', 'legend-title')
            .attr('y', -10)
            .text('Node Type');
        
        const items = legendGroup.selectAll('.legend-item')
            .data(groups)
            .join('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 20})`);
        
        items.append('circle')
            .attr('class', 'legend-swatch')
            .attr('cx', 6)
            .attr('cy', 6)
            .attr('r', 6)
            .attr('fill', d => colorScale(d));
        
        items.append('text')
            .attr('class', 'legend-label')
            .attr('x', 18)
            .attr('y', 10)
            .text(d => d);
    }
    
    destroy() {
        if (this.simulation) {
            this.simulation.stop();
        }
        super.destroy();
    }
}
