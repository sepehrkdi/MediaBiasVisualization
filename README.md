# Global Media Bias Visualization

A data-driven storytelling website that explores global media bias using GDELT data, D3.js visualizations, and a scroll-driven narrative.

**Team**: EsfViz  
**Course**: Data Visualization 2025-2026, University of Genova  
**Members**: Sepehr Khodadadi, Hesam Mohebi, Bahar Khalilian  
**Repository**: https://github.com/sepehrkdi/MediaBiasVisualization.git

---

## 🎯 Project Overview

This project presents an interactive exploration of how global media outlets cover world events, revealing patterns of bias, sentiment, and geographic focus in news coverage. The visualization uses data from the GDELT (Global Database of Events, Language, and Tone) project.

### Key Features

- **Scroll-driven Storytelling**: Narrative unfolds as users scroll through the page
- **Interactive D3.js Visualizations**: 10+ chart types including choropleth maps, network graphs, and temporal trends
- **Uncertainty Visualization**: Confidence intervals and sample size indicators throughout
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Methodology Section**: Full transparency about data sources, limitations, and analysis methods

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
│   ├── main.js               # Application entry point
│   ├── modules/
│   │   ├── dataManager.js    # Data loading and transformation
│   │   ├── scrollytelling.js # Scroll-based navigation
│   │   ├── tooltip.js        # Reusable tooltip component
│   │   └── navigation.js     # Header and menu behavior
│   └── charts/
│       ├── index.js          # Chart exports
│       ├── BaseChart.js      # Foundation chart class
│       ├── BarChart.js       # Bar chart variants
│       ├── LineChart.js      # Line and area charts
│       ├── ChoroplethMap.js  # Geographic visualization
│       ├── NetworkGraph.js   # Force-directed network
│       └── OtherCharts.js    # Additional chart types
├── data/
│   ├── sentiment_by_source.json
│   ├── country_coverage.json
│   ├── bias_comparison.json
│   ├── event_types.json
│   ├── source_network.json
│   └── temporal_trends.json
├── preprocessing/
│   ├── extract_gdelt.py      # PostgreSQL → JSON pipeline
│   ├── generate_sample_data.py
│   └── requirements.txt
└── README.md
```

---

## 🚀 Quick Start

### Option 1: View Demo (No Database Required)

1. Clone the repository:
   ```bash
   git clone https://github.com/sepehrkdi/MediaBiasVisualization.git
   cd MediaBiasVisualization
   ```

2. Serve the files locally:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Or using Node.js
   npx serve .
   ```

3. Open http://localhost:8000 in your browser

### Option 2: Full Setup with Database

See [Database Setup](#-database-setup) section below.

---

## 🗄️ Database Setup

### Prerequisites

- PostgreSQL 14+
- Python 3.9+
- GDELT data loaded into PostgreSQL

### PostgreSQL Schema

```sql
-- Main events table
CREATE TABLE gdelt_events (
    globaleventid BIGINT PRIMARY KEY,
    sqldate DATE NOT NULL,
    actor1code VARCHAR(50),
    actor1countrycode VARCHAR(3),
    actor2code VARCHAR(50),
    actor2countrycode VARCHAR(3),
    eventcode VARCHAR(10),
    eventrootcode VARCHAR(5),
    eventbasecode VARCHAR(10),
    goldsteinscale DECIMAL(5,2),
    nummentions INTEGER,
    numsources INTEGER,
    avgtone DECIMAL(5,2),
    sourceurl TEXT
);

-- Source metadata table
CREATE TABLE gdelt_sources (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) UNIQUE,
    domain_country VARCHAR(3),
    source_type VARCHAR(50)
);

-- Indexes for performance
CREATE INDEX idx_events_date ON gdelt_events(sqldate);
CREATE INDEX idx_events_actor1country ON gdelt_events(actor1countrycode);
CREATE INDEX idx_events_sourceurl ON gdelt_events(sourceurl);
CREATE INDEX idx_events_avgtone ON gdelt_events(avgtone);
```

### Running the Preprocessing Pipeline

1. Install Python dependencies:
   ```bash
   cd preprocessing
   pip install -r requirements.txt
   ```

2. Configure database connection:
   ```bash
   export GDELT_DB_HOST=localhost
   export GDELT_DB_PORT=5432
   export GDELT_DB_NAME=gdelt
   export GDELT_DB_USER=postgres
   export GDELT_DB_PASSWORD=your_password
   ```

3. Run the extraction:
   ```bash
   python extract_gdelt.py
   ```

4. Or generate sample data for development:
   ```bash
   python generate_sample_data.py
   ```

---

## 📊 Visualizations

| Chart Type | Purpose | Data Source |
|------------|---------|-------------|
| Choropleth Map | Geographic coverage patterns | `country_coverage.json` |
| Diverging Bar Chart | Source sentiment comparison | `bias_comparison.json` |
| Line Chart with CI | Temporal trends | `temporal_trends.json` |
| Network Graph | Source citation network | `source_network.json` |
| TreeMap | Event type distribution | `event_types.json` |
| Scatter Plot | Sentiment vs. coverage | `sentiment_by_source.json` |
| Uncertainty Chart | Confidence intervals | Various |

---

## 🎨 Design System

### Colors

| Variable | Hex | Usage |
|----------|-----|-------|
| `--color-primary` | `#CF0063` | Primary accent (UniGE magenta) |
| `--color-secondary` | `#003366` | Secondary accent (dark blue) |
| `--color-positive` | `#2E7D32` | Positive sentiment |
| `--color-negative` | `#C62828` | Negative sentiment |
| `--color-neutral` | `#757575` | Neutral sentiment |

### Typography

- **Headings**: Roboto Slab (serif)
- **Body**: Fira Sans (sans-serif)
- **Scale**: 1.25 modular scale

---

## 📐 Methodology

### Data Source

This project uses [GDELT](https://www.gdeltproject.org/), which monitors print, broadcast, and online news from nearly every country in every language.

### Sentiment Analysis

- **AVG Tone**: GDELT's composite tone score (-100 to +100)
- **Goldstein Scale**: Conflict-cooperation scale (-10 to +10)

### Limitations

1. **Selection Bias**: GDELT monitors English-language and translated content primarily
2. **Temporal Coverage**: Analysis limited to available data period
3. **Aggregation**: Individual article nuance lost in aggregation
4. **Classification**: Automated coding may introduce errors

### Statistical Methods

- 95% confidence intervals using t-distribution
- Rolling averages for temporal smoothing (4-week window)
- Minimum sample sizes enforced (n ≥ 100 for source analysis)

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
- No inline SVG styles (all via CSS selectors)

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

- [GDELT Project](https://www.gdeltproject.org/) for the data
- [D3.js](https://d3js.org/) for visualization library
- [University of Genova](https://www.unige.it/) for the course framework
- [Natural Earth](https://www.naturalearthdata.com/) for geographic data

---

## 📞 Contact

**EsfViz Team**  
- Sepehr Khodadadi
- Hesam Mohebi
- Bahar Khalilian

Data Visualization 2025-2026  
University of Genova

GitHub: [@sepehrkdi](https://github.com/sepehrkdi)
