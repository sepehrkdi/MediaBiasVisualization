# Shifting Spotlights: How Global Media Attention Changes During Crises

A data-driven scrollytelling visualization exploring global conflict patterns and media attention disparities using UCDP data, D3.js, and interactive storytelling.

**Team**: EsfViz  
**Course**: Data Visualization 2025-2026, University of Genova  
**Members**: [Sepehr Khodadadi](https://www.linkedin.com/in/sepehr-khodadadi/), [Hesam Mohebi](https://www.linkedin.com/in/hesam-mohebi-579699199), [Bahar Khalilian](https://ir.linkedin.com/in/bahaar-khalilian-a68716198)  
**Repository**: https://github.com/sepehrkdi/MediaBiasVisualization.git  
**Live Demo**: https://sepehrkdi.github.io/MediaBiasVisualization/

---

## 🎯 Project Overview

This project presents an interactive exploration of how global conflicts receive varying levels of media attention, revealing patterns where some crises dominate headlines while others—often deadlier—remain invisible. We analyze data from the **UCDP (Uppsala Conflict Data Program)**, one of the world's most comprehensive datasets on organized violence, spanning **1989 to 2024**.

### Key Questions We Explore

- Which conflicts get attention and which are forgotten?
- Does media coverage correlate with conflict severity?
- How do geographic proximity and geopolitical interests affect reporting?

### Key Features

- **Scroll-driven Storytelling**: 13 narrative steps guiding users through the data
- **Interactive D3.js Visualizations**: Choropleth maps, pie charts, line charts, and stacked area charts
- **Regional Case Studies**: West Africa, Balkans, Central Africa, Middle East, South Asia, Southeast Asia
- **Comparative Analysis**: Side-by-side conflict comparisons (Sierra Leone vs Liberia, Bosnia vs Afghanistan, Yemen vs Myanmar)
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

---

## 📁 Project Structure

```
Project/
├── index.html                 # Main entry point
├── css/
│   ├── main.css              # Core layout and components
│   ├── typography.css        # Font scales and text styles
│   ├── charts.css            # D3.js visualization styling
│   ├── scrollytelling.css    # Scroll-driven narrative styles
│   └── responsive.css        # Mobile-first responsive design
├── js/
│   ├── main.js               # Application entry point & chart logic
│   ├── modules/
│   │   ├── dataManager.js    # Data loading and transformation
│   │   ├── scrollytelling.js # Scroll-based navigation
│   │   ├── tooltip.js        # Reusable tooltip component
│   │   └── navigation.js     # Header and menu behavior
│   └── charts/
│       ├── index.js          # Chart exports
│       ├── BaseChart.js      # Foundation chart class
│       └── ...               # Additional chart modules
├── data/
│   ├── choropleth_yearly.json           # Global fatalities by country/year
│   ├── west_africa_piechart_data.json   # West Africa regional distribution
│   ├── balkans_piechart_data.json       # Balkans regional distribution
│   ├── central_africa_piechart_data.json# Central Africa regional distribution
│   ├── middle_east_piechart_data.json   # Middle East regional distribution
│   ├── south_asia_piechart_data.json    # South Asia regional distribution
│   ├── southeast_asia_piechart_data.json# Southeast Asia regional distribution
│   ├── conflict_timeline.json           # Sierra Leone vs Liberia comparison
│   ├── bosnia_afghanistan_timeline.json # Bosnia vs Afghanistan comparison
│   ├── yemen_myanmar_timeline.json      # Yemen vs Myanmar comparison
│   └── ...                              # Additional data files
├── assets/
│   └── images/               # Visual assets and favicon
├── preprocessing/
│   ├── GED_pythonsearch.ipynb # General UCDP data processing
│   ├── BA.ipynb               # Bosnia vs Afghanistan processing
│   └── SYM.ipynb              # Syria/Yemen/Myanmar processing
└── README.md
```

---

## 🚀 Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/sepehrkdi/MediaBiasVisualization.git
   cd MediaBiasVisualization
   ```

2. **Start a local server**:
   ```bash
   # Using Python
   python -m http.server 8080
   
   # Or using Node.js
   npx serve .
   ```

3. **Open in browser**: Navigate to http://localhost:8080

---

## 📊 Visualizations

The storytelling experience includes 13 interactive steps:

| Step | Visualization | Description |
|------|--------------|-------------|
| 1 | Animated Choropleth Map | Global conflict fatalities timeline (1989-2024) |
| 2-7 | Regional Pie Charts | Distribution of conflicts in 6 regions |
| 8-9 | Intensity & Stacked Area | Africa Deep Dive (Sierra Leone vs Liberia) |
| 10-11 | Intensity & Stacked Area | Modern Contrast (Yemen vs Myanmar) |
| 12-13 | Intensity & Stacked Area | Historical Parallel (Bosnia vs Afghanistan) |

### Chart Types

- **Animated Choropleth**: Shows fatalities by country with year-by-year animation
- **Interactive Pie Charts**: Click to isolate countries, hover for statistics
- **Intensity Comparison Charts**: Compare event frequency vs. casualties per event (Dual Axes)
- **Stacked Area Charts**: Cumulative death tolls over time

---

## 🎨 Design System

### Colors

| Variable | Usage |
|----------|-------|
| `--color-primary` | Primary accent (UniGE Red) |
| `--color-secondary` | Secondary accent (dark blue) |
| `--color-positive` | Positive/low severity |
| `--color-negative` | Negative/high severity |
| Chapter-specific gradients | Background themes for each story chapter |

### Typography

- **Headings**: Roboto Slab (serif)
- **Body**: Fira Sans (sans-serif)
- **Scale**: 1.25 modular scale

---

## 📐 Methodology

### Data Source

**UCDP (Uppsala Conflict Data Program)** is one of the world's most comprehensive datasets on organized violence, tracking:
- State-based conflicts
- Non-state conflicts
- One-sided violence

The **GED (Georeferenced Event Dataset)** provides individual conflict events with precise locations and fatality estimates.

### Key Metrics

- **Events**: Number of documented violent incidents
- **Fatalities**: Best estimates of deaths per event
- **Casualties per Event**: Intensity proxy (deaths ÷ events)

### Limitations

1. **Documentation Gaps**: UCDP coverage varies by region; some conflicts may be underreported due to access limitations
2. **Automated Processing**: Event extraction and sentiment analysis use algorithms that can misclassify content
3. **Temporal Inconsistency**: Coverage may vary for certain periods
4. **Definitional Ambiguity**: "Bias" is contested; our analysis offers one interpretation
5. **Correlation ≠ Causation**: Patterns don't reveal editorial decision-making processes

---

## 🛠️ Development

### Local Development

```bash
# Start local server with live reload
npx browser-sync start --server --files "**/*.html, **/*.css, **/*.js"
```

### Code Style

- ES6 modules for JavaScript
- CSS custom properties for theming
- Semantic HTML5 elements
- D3.js v7 for visualizations

### Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 📄 License

This project is for educational purposes as part of the University of Genova Data Visualization course.

---

## 🙏 Acknowledgments

- [UCDP (Uppsala Conflict Data Program)](https://ucdp.uu.se/) for the conflict event data
- [D3.js](https://d3js.org/) for visualization library
- [University of Genova](https://www.unige.it/) for the course framework
- [World Atlas](https://github.com/topojson/world-atlas) (based on Natural Earth) for geographic data

---

## 📞 Contact

**EsfViz Team**  
- [Sepehr Khodadadi](https://www.linkedin.com/in/sepehr-khodadadi/)
- [Hesam Mohebi](https://www.linkedin.com/in/hesam-mohebi-579699199)
- [Bahar Khalilian](https://ir.linkedin.com/in/bahaar-khalilian-a68716198)

Data Visualization 2025-2026  
University of Genova

GitHub: [@sepehrkdi](https://github.com/sepehrkdi)
