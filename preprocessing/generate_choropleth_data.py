#!/usr/bin/env python3
"""
Generate choropleth yearly data JSON from raw CSV extracted from PostgreSQL.
This script transforms the yearly country aggregated conflict data into a format
suitable for the animated choropleth map visualization.
"""

import csv
import json
from collections import defaultdict
from pathlib import Path

# ISO 3166-1 alpha-3 country code mapping for common countries in the dataset
# This maps country names to their 3-letter ISO codes used by world-atlas TopoJSON
COUNTRY_TO_ISO3 = {
    "Afghanistan": "AFG",
    "Albania": "ALB",
    "Algeria": "DZA",
    "Angola": "AGO",
    "Argentina": "ARG",
    "Armenia": "ARM",
    "Australia": "AUS",
    "Austria": "AUT",
    "Azerbaijan": "AZE",
    "Bahrain": "BHR",
    "Bangladesh": "BGD",
    "Belgium": "BEL",
    "Benin": "BEN",
    "Bhutan": "BTN",
    "Bolivia": "BOL",
    "Bosnia-Herzegovina": "BIH",
    "Botswana": "BWA",
    "Brazil": "BRA",
    "Burkina Faso": "BFA",
    "Burundi": "BDI",
    "Cambodia (Kampuchea)": "KHM",
    "Cameroon": "CMR",
    "Canada": "CAN",
    "Central African Republic": "CAF",
    "Chad": "TCD",
    "Chile": "CHL",
    "China": "CHN",
    "Colombia": "COL",
    "Comoros": "COM",
    "Congo": "COG",
    "Costa Rica": "CRI",
    "Croatia": "HRV",
    "Cuba": "CUB",
    "Cyprus": "CYP",
    "Czech Republic": "CZE",
    "DR Congo (Zaire)": "COD",
    "Denmark": "DNK",
    "Djibouti": "DJI",
    "Dominican Republic": "DOM",
    "Ecuador": "ECU",
    "Egypt": "EGY",
    "El Salvador": "SLV",
    "Equatorial Guinea": "GNQ",
    "Eritrea": "ERI",
    "Estonia": "EST",
    "Ethiopia": "ETH",
    "Finland": "FIN",
    "France": "FRA",
    "Gabon": "GAB",
    "Gambia": "GMB",
    "Georgia": "GEO",
    "Germany": "DEU",
    "Ghana": "GHA",
    "Greece": "GRC",
    "Guatemala": "GTM",
    "Guinea": "GIN",
    "Guinea-Bissau": "GNB",
    "Haiti": "HTI",
    "Honduras": "HND",
    "Hungary": "HUN",
    "India": "IND",
    "Indonesia": "IDN",
    "Iran": "IRN",
    "Iraq": "IRQ",
    "Ireland": "IRL",
    "Israel": "ISR",
    "Italy": "ITA",
    "Ivory Coast": "CIV",
    "Jamaica": "JAM",
    "Japan": "JPN",
    "Jordan": "JOR",
    "Kazakhstan": "KAZ",
    "Kenya": "KEN",
    "Kosovo": "XKX",
    "Kuwait": "KWT",
    "Kyrgyzstan": "KGZ",
    "Laos": "LAO",
    "Latvia": "LVA",
    "Lebanon": "LBN",
    "Lesotho": "LSO",
    "Liberia": "LBR",
    "Libya": "LBY",
    "Lithuania": "LTU",
    "Macedonia (FYR)": "MKD",
    "Madagascar": "MDG",
    "Malawi": "MWI",
    "Malaysia": "MYS",
    "Mali": "MLI",
    "Mauritania": "MRT",
    "Mexico": "MEX",
    "Moldova": "MDA",
    "Morocco": "MAR",
    "Mozambique": "MOZ",
    "Myanmar (Burma)": "MMR",
    "Namibia": "NAM",
    "Nepal": "NPL",
    "Netherlands": "NLD",
    "New Zealand": "NZL",
    "Nicaragua": "NIC",
    "Niger": "NER",
    "Nigeria": "NGA",
    "North Korea": "PRK",
    "Norway": "NOR",
    "Oman": "OMN",
    "Pakistan": "PAK",
    "Palestine": "PSE",
    "Panama": "PAN",
    "Papua New Guinea": "PNG",
    "Paraguay": "PRY",
    "Peru": "PER",
    "Philippines": "PHL",
    "Poland": "POL",
    "Portugal": "PRT",
    "Qatar": "QAT",
    "Romania": "ROU",
    "Russia (Soviet Union)": "RUS",
    "Rwanda": "RWA",
    "Saudi Arabia": "SAU",
    "Senegal": "SEN",
    "Serbia": "SRB",
    "Serbia (Yugoslavia)": "SRB",
    "Sierra Leone": "SLE",
    "Slovakia": "SVK",
    "Slovenia": "SVN",
    "Somalia": "SOM",
    "South Africa": "ZAF",
    "South Korea": "KOR",
    "South Sudan": "SSD",
    "Spain": "ESP",
    "Sri Lanka": "LKA",
    "Sudan": "SDN",
    "Sweden": "SWE",
    "Switzerland": "CHE",
    "Syria": "SYR",
    "Taiwan": "TWN",
    "Tajikistan": "TJK",
    "Tanzania": "TZA",
    "Thailand": "THA",
    "Togo": "TGO",
    "Trinidad and Tobago": "TTO",
    "Tunisia": "TUN",
    "Turkey": "TUR",
    "Turkmenistan": "TKM",
    "Uganda": "UGA",
    "Ukraine": "UKR",
    "United Arab Emirates": "ARE",
    "United Kingdom": "GBR",
    "United States of America": "USA",
    "Uruguay": "URY",
    "Uzbekistan": "UZB",
    "Venezuela": "VEN",
    "Vietnam (North Vietnam)": "VNM",
    "Yemen (North Yemen)": "YEM",
    "Zambia": "ZMB",
    "Zimbabwe (Rhodesia)": "ZWE",
    "Kingdom of eSwatini (Swaziland)": "SWZ",
    "Solomon Islands": "SLB",
    "Malta": "MLT",
    "North Macedonia": "MKD",
    "Madagascar (Malagasy)": "MDG",
    "Guyana": "GUY",
}


def load_csv_data(csv_path):
    """Load the raw CSV data extracted from PostgreSQL."""
    data = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 7 and row[0]:  # Ensure valid row
                data.append({
                    'year': row[0],
                    'country': row[1],
                    'country_id': row[2],
                    'event_count': int(row[3]) if row[3] else 0,
                    'total_fatalities': int(row[4]) if row[4] else 0,
                    'civilian_deaths': int(row[5]) if row[5] else 0,
                    'violence_types': int(row[6]) if row[6] else 0
                })
    return data


def transform_to_choropleth_format(data):
    """Transform raw data to choropleth-friendly JSON structure."""
    
    # Group by year
    by_year = defaultdict(list)
    all_years = set()
    global_max_events = 0
    global_max_fatalities = 0
    
    for row in data:
        year = row['year']
        all_years.add(year)
        
        iso_code = COUNTRY_TO_ISO3.get(row['country'])
        if not iso_code:
            print(f"Warning: No ISO code for country: {row['country']}")
            continue
            
        global_max_events = max(global_max_events, row['event_count'])
        global_max_fatalities = max(global_max_fatalities, row['total_fatalities'])
        
        by_year[year].append({
            'id': iso_code,
            'name': row['country'],
            'countryId': row['country_id'],
            'events': row['event_count'],
            'fatalities': row['total_fatalities'],
            'civilianDeaths': row['civilian_deaths'],
            'violenceTypes': row['violence_types']
        })
    
    # Sort years
    sorted_years = sorted(all_years)
    
    # Calculate normalized values and year statistics
    coverage_by_year = {}
    year_stats = {}
    
    for year in sorted_years:
        countries = by_year[year]
        year_max_events = max((c['events'] for c in countries), default=1)
        year_max_fatalities = max((c['fatalities'] for c in countries), default=1)
        year_total_events = sum(c['events'] for c in countries)
        year_total_fatalities = sum(c['fatalities'] for c in countries)
        
        # Add normalized values
        for country in countries:
            country['normalizedEvents'] = round(country['events'] / year_max_events, 4)
            country['normalizedFatalities'] = round(country['fatalities'] / year_max_fatalities, 4) if year_max_fatalities > 0 else 0
            country['globalNormalizedEvents'] = round(country['events'] / global_max_events, 4)
            country['globalNormalizedFatalities'] = round(country['fatalities'] / global_max_fatalities, 4) if global_max_fatalities > 0 else 0
        
        # Sort by events descending
        countries.sort(key=lambda x: x['events'], reverse=True)
        
        coverage_by_year[year] = countries
        year_stats[year] = {
            'totalEvents': year_total_events,
            'totalFatalities': year_total_fatalities,
            'maxEvents': year_max_events,
            'maxFatalities': year_max_fatalities,
            'countryCount': len(countries)
        }
    
    return {
        'years': sorted_years,
        'coverageByYear': coverage_by_year,
        'yearStats': year_stats,
        'metadata': {
            'generatedAt': '2026-01-10T00:00:00Z',
            'source': 'UCDP GED Events Database',
            'minYear': sorted_years[0] if sorted_years else None,
            'maxYear': sorted_years[-1] if sorted_years else None,
            'totalYears': len(sorted_years),
            'globalMaxEvents': global_max_events,
            'globalMaxFatalities': global_max_fatalities
        }
    }


def main():
    # Paths
    project_dir = Path(__file__).parent.parent
    csv_path = project_dir / 'data' / 'choropleth_yearly_raw.csv'
    json_path = project_dir / 'data' / 'choropleth_yearly.json'
    
    print(f"Loading CSV data from: {csv_path}")
    raw_data = load_csv_data(csv_path)
    print(f"Loaded {len(raw_data)} rows")
    
    print("Transforming to choropleth format...")
    choropleth_data = transform_to_choropleth_format(raw_data)
    
    print(f"Generated data for {len(choropleth_data['years'])} years")
    print(f"Years: {choropleth_data['years'][0]} - {choropleth_data['years'][-1]}")
    
    print(f"Writing JSON to: {json_path}")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(choropleth_data, f, indent=2)
    
    print("Done!")
    
    # Print summary
    print("\n--- Summary ---")
    for year in choropleth_data['years'][-5:]:  # Last 5 years
        stats = choropleth_data['yearStats'][year]
        print(f"{year}: {stats['countryCount']} countries, {stats['totalEvents']} events, {stats['totalFatalities']} fatalities")


if __name__ == '__main__':
    main()
