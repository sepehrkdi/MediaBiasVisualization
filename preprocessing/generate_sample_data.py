"""
Sample Data Generator
Generates realistic sample data for development and demo purposes.
Use this when GDELT database is not available.

Author: Sepehr Khodadadeh
"""

import json
import os
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List

np.random.seed(42)  # For reproducibility

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')


def generate_sentiment_by_source() -> Dict:
    """Generate sample sentiment data by news source."""
    sources = [
        ('BBC News', 'GB', 'Broadcast'),
        ('CNN', 'US', 'Broadcast'),
        ('Reuters', 'GB', 'Wire Service'),
        ('Associated Press', 'US', 'Wire Service'),
        ('New York Times', 'US', 'Newspaper'),
        ('The Guardian', 'GB', 'Newspaper'),
        ('Washington Post', 'US', 'Newspaper'),
        ('Al Jazeera', 'QA', 'Broadcast'),
        ('Fox News', 'US', 'Broadcast'),
        ('MSNBC', 'US', 'Broadcast'),
        ('Deutsche Welle', 'DE', 'Broadcast'),
        ('France 24', 'FR', 'Broadcast'),
        ('RT', 'RU', 'Broadcast'),
        ('CGTN', 'CN', 'Broadcast'),
        ('NHK World', 'JP', 'Broadcast'),
        ('CBC News', 'CA', 'Broadcast'),
        ('ABC News', 'AU', 'Broadcast'),
        ('Sky News', 'GB', 'Broadcast'),
        ('Euronews', 'FR', 'Broadcast'),
        ('Times of India', 'IN', 'Newspaper'),
        ('Le Monde', 'FR', 'Newspaper'),
        ('El País', 'ES', 'Newspaper'),
        ('Der Spiegel', 'DE', 'Magazine'),
        ('The Economist', 'GB', 'Magazine'),
        ('Politico', 'US', 'Digital'),
        ('Huffington Post', 'US', 'Digital'),
        ('Breitbart', 'US', 'Digital'),
        ('The Intercept', 'US', 'Digital'),
        ('Xinhua', 'CN', 'Wire Service'),
        ('TASS', 'RU', 'Wire Service'),
    ]
    
    results = []
    for name, country, source_type in sources:
        # Generate realistic sentiment patterns
        base_sentiment = np.random.uniform(-1.5, 1.5)
        
        # Add some bias based on source type
        if source_type == 'Wire Service':
            base_sentiment *= 0.5  # More neutral
        elif name in ['Fox News', 'Breitbart']:
            base_sentiment = np.random.uniform(-0.5, 1.5)
        elif name in ['MSNBC', 'Huffington Post']:
            base_sentiment = np.random.uniform(-1.5, 0.5)
        elif name in ['RT', 'CGTN', 'Xinhua']:
            base_sentiment = np.random.uniform(-1.0, 1.0)
        
        std = np.random.uniform(1.5, 4.0)
        n = np.random.randint(500, 50000)
        ci = 1.96 * std / np.sqrt(n)
        
        results.append({
            'name': name,
            'country': country,
            'type': source_type,
            'avgSentiment': round(base_sentiment, 3),
            'stdSentiment': round(std, 3),
            'articleCount': n,
            'avgGoldstein': round(np.random.uniform(-3, 3), 3),
            'ci_lower': round(base_sentiment - ci, 3),
            'ci_upper': round(base_sentiment + ci, 3)
        })
    
    return {
        'sources': results,
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'total_sources': len(results),
            'note': 'Sample data for development'
        }
    }


def generate_country_coverage() -> Dict:
    """Generate sample country coverage data."""
    countries = [
        ('US', 'United States', 1.0),
        ('CN', 'China', 0.75),
        ('RU', 'Russia', 0.65),
        ('GB', 'United Kingdom', 0.55),
        ('UA', 'Ukraine', 0.50),
        ('DE', 'Germany', 0.40),
        ('FR', 'France', 0.38),
        ('IL', 'Israel', 0.45),
        ('PS', 'Palestine', 0.42),
        ('IR', 'Iran', 0.35),
        ('IN', 'India', 0.33),
        ('JP', 'Japan', 0.25),
        ('BR', 'Brazil', 0.22),
        ('AU', 'Australia', 0.20),
        ('CA', 'Canada', 0.19),
        ('SA', 'Saudi Arabia', 0.25),
        ('TR', 'Turkey', 0.22),
        ('EG', 'Egypt', 0.18),
        ('KR', 'South Korea', 0.17),
        ('PK', 'Pakistan', 0.16),
        ('MX', 'Mexico', 0.15),
        ('IT', 'Italy', 0.14),
        ('ES', 'Spain', 0.13),
        ('PL', 'Poland', 0.12),
        ('NG', 'Nigeria', 0.11),
        ('ZA', 'South Africa', 0.10),
        ('ID', 'Indonesia', 0.09),
        ('AR', 'Argentina', 0.08),
        ('TH', 'Thailand', 0.07),
        ('VN', 'Vietnam', 0.06),
    ]
    
    max_coverage = 500000
    results = []
    
    for code, name, weight in countries:
        coverage = int(max_coverage * weight * np.random.uniform(0.8, 1.2))
        
        # Generate tone based on geopolitical patterns
        if code in ['RU', 'CN', 'IR', 'KP']:
            avg_tone = np.random.uniform(-2.5, -0.5)
        elif code in ['US', 'GB', 'CA', 'AU']:
            avg_tone = np.random.uniform(-0.5, 1.5)
        else:
            avg_tone = np.random.uniform(-1.5, 1.0)
        
        results.append({
            'code': code,
            'name': name,
            'coverage': coverage,
            'normalizedCoverage': round(coverage / max_coverage, 4),
            'avgTone': round(avg_tone, 3),
            'avgGoldstein': round(np.random.uniform(-5, 5), 3),
            'avgMentions': round(np.random.uniform(2, 15), 2),
            'sourceCount': np.random.randint(50, 500)
        })
    
    return {
        'countries': results,
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'total_countries': len(results),
            'max_coverage': max_coverage
        }
    }


def generate_temporal_trends() -> Dict:
    """Generate sample temporal trend data."""
    start_date = datetime.now() - timedelta(days=730)  # 2 years
    timeline = []
    
    # Base patterns
    base_tone = 0
    trend = 0.001  # Slight trend
    
    for week in range(104):  # 2 years of weeks
        date = start_date + timedelta(weeks=week)
        
        # Add seasonality and events
        seasonal = 0.3 * np.sin(2 * np.pi * week / 52)
        
        # Add some "events" that cause shifts
        event_shock = 0
        if week in [20, 45, 70, 95]:  # Simulated events
            event_shock = np.random.uniform(-2, 2)
        
        noise = np.random.normal(0, 0.5)
        
        tone = base_tone + trend * week + seasonal + event_shock + noise
        tone = np.clip(tone, -5, 5)
        
        event_count = int(10000 + 3000 * np.sin(2 * np.pi * week / 52) + np.random.normal(0, 1000))
        event_count = max(event_count, 5000)
        
        positive_ratio = 0.4 + 0.1 * np.sin(2 * np.pi * week / 52) + np.random.normal(0, 0.05)
        positive_ratio = np.clip(positive_ratio, 0.2, 0.8)
        
        timeline.append({
            'date': date.isoformat(),
            'eventCount': event_count,
            'avgTone': round(tone, 3),
            'toneSmooth': round(tone, 3),
            'countSmooth': event_count,
            'positiveRatio': round(positive_ratio, 3),
            'ciUpper': round(tone + 0.5, 3),
            'ciLower': round(tone - 0.5, 3)
        })
    
    # Apply rolling average
    for i in range(4, len(timeline)):
        timeline[i]['toneSmooth'] = round(
            np.mean([timeline[j]['avgTone'] for j in range(i-3, i+1)]), 3
        )
        timeline[i]['countSmooth'] = round(
            np.mean([timeline[j]['eventCount'] for j in range(i-3, i+1)]), 1
        )
    
    return {
        'timeline': timeline,
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'total_weeks': len(timeline),
            'date_range': {
                'start': timeline[0]['date'],
                'end': timeline[-1]['date']
            }
        }
    }


def generate_event_types() -> Dict:
    """Generate sample event type distribution."""
    event_types = [
        ('01', 'Public Statement', 0.25),
        ('02', 'Appeal', 0.08),
        ('03', 'Cooperation Intent', 0.07),
        ('04', 'Consultation', 0.06),
        ('05', 'Diplomatic Cooperation', 0.05),
        ('06', 'Material Cooperation', 0.04),
        ('07', 'Aid Provision', 0.03),
        ('10', 'Demand', 0.06),
        ('11', 'Disapproval', 0.05),
        ('12', 'Reject', 0.04),
        ('13', 'Threaten', 0.06),
        ('14', 'Protest', 0.08),
        ('15', 'Exhibit Force', 0.03),
        ('17', 'Coercion', 0.04),
        ('18', 'Assault', 0.03),
        ('19', 'Fight', 0.02),
        ('20', 'Military Engagement', 0.01),
    ]
    
    total = 1000000
    results = []
    
    for code, name, weight in event_types:
        count = int(total * weight * np.random.uniform(0.9, 1.1))
        
        # Negative events have negative tone
        if int(code) >= 10:
            avg_tone = np.random.uniform(-3, -0.5)
        else:
            avg_tone = np.random.uniform(-0.5, 2)
        
        results.append({
            'code': code,
            'rootCode': code,
            'name': name,
            'count': count,
            'percent': round(count / total * 100, 2),
            'avgTone': round(avg_tone, 3),
            'avgGoldstein': round(np.random.uniform(-5, 5), 3)
        })
    
    results.sort(key=lambda x: x['count'], reverse=True)
    
    return {
        'types': results,
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'total_events': total,
            'unique_types': len(results)
        }
    }


def generate_source_network() -> Dict:
    """Generate sample source network data."""
    sources = [
        ('BBC', 'Europe'),
        ('CNN', 'North America'),
        ('Reuters', 'Europe'),
        ('AP', 'North America'),
        ('NYT', 'North America'),
        ('Guardian', 'Europe'),
        ('Al Jazeera', 'Middle East'),
        ('Fox News', 'North America'),
        ('MSNBC', 'North America'),
        ('Washington Post', 'North America'),
        ('Le Monde', 'Europe'),
        ('DW', 'Europe'),
        ('RT', 'Europe'),
        ('CGTN', 'Asia'),
        ('NHK', 'Asia'),
    ]
    
    nodes = [{'id': s[0], 'group': s[1]} for s in sources]
    
    # Create network connections based on region proximity
    links = []
    for i, (s1, r1) in enumerate(sources):
        for j, (s2, r2) in enumerate(sources):
            if i >= j:
                continue
            
            # Higher chance of connection within same region
            if r1 == r2:
                prob = 0.7
            elif {r1, r2}.issubset({'Europe', 'North America'}):
                prob = 0.5
            else:
                prob = 0.3
            
            if np.random.random() < prob:
                links.append({
                    'source': s1,
                    'target': s2,
                    'weight': np.random.randint(10, 100)
                })
    
    return {
        'nodes': nodes,
        'links': links,
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'total_nodes': len(nodes),
            'total_links': len(links)
        }
    }


def generate_bias_comparison() -> Dict:
    """Generate sample bias comparison data."""
    categories = [
        ('Conservative Media', 0.8, 8000),
        ('Progressive Media', -0.6, 7500),
        ('Wire Services', 0.1, 15000),
        ('Quality Press', -0.2, 12000),
        ('Broadcast Networks', 0.2, 20000),
        ('Digital Native', 0.3, 10000),
        ('State Media', -0.4, 5000),
        ('Tabloids', 0.5, 8000),
    ]
    
    results = []
    for name, base_bias, n in categories:
        std = np.random.uniform(1.5, 3.0)
        ci = 1.96 * std / np.sqrt(n)
        
        actual_bias = base_bias + np.random.normal(0, 0.2)
        
        results.append({
            'category': name,
            'value': round(actual_bias, 3),
            'ci_lower': round(actual_bias - ci, 3),
            'ci_upper': round(actual_bias + ci, 3),
            'n': n,
            'goldstein': round(np.random.uniform(-2, 2), 3)
        })
    
    results.sort(key=lambda x: x['value'])
    
    return {
        'comparison': results,
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'total_categories': len(results)
        }
    }


def generate_regional_comparison() -> Dict:
    """Generate regional sentiment comparison data."""
    regions = [
        ('North America', ['US', 'CA', 'MX']),
        ('Western Europe', ['GB', 'DE', 'FR', 'ES', 'IT']),
        ('Eastern Europe', ['RU', 'UA', 'PL']),
        ('Middle East', ['IL', 'SA', 'IR', 'TR', 'EG']),
        ('East Asia', ['CN', 'JP', 'KR']),
        ('South Asia', ['IN', 'PK']),
        ('Africa', ['NG', 'ZA', 'EG']),
        ('Latin America', ['BR', 'AR', 'MX']),
        ('Oceania', ['AU', 'NZ']),
    ]
    
    results = []
    for region, countries in regions:
        results.append({
            'region': region,
            'countries': countries,
            'avgTone': round(np.random.uniform(-1.5, 1.5), 3),
            'coverage': np.random.randint(50000, 500000),
            'sourceCount': np.random.randint(20, 200),
            'positiveRatio': round(np.random.uniform(0.3, 0.7), 3)
        })
    
    return {
        'regions': results,
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'total_regions': len(results)
        }
    }


def save_json(data: Dict, filename: str) -> None:
    """Save data to JSON file."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filepath = os.path.join(OUTPUT_DIR, filename)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, default=str)
    
    print(f"Generated: {filepath}")


def main():
    """Generate all sample data files."""
    print("=" * 60)
    print("Sample Data Generator")
    print("=" * 60)
    print(f"Output directory: {OUTPUT_DIR}")
    print()
    
    generators = [
        ('sentiment_by_source.json', generate_sentiment_by_source),
        ('country_coverage.json', generate_country_coverage),
        ('temporal_trends.json', generate_temporal_trends),
        ('event_types.json', generate_event_types),
        ('source_network.json', generate_source_network),
        ('bias_comparison.json', generate_bias_comparison),
        ('regional_comparison.json', generate_regional_comparison),
    ]
    
    for filename, generator in generators:
        try:
            data = generator()
            save_json(data, filename)
        except Exception as e:
            print(f"Error generating {filename}: {e}")
    
    print()
    print("Sample data generation complete!")
    print("=" * 60)


if __name__ == '__main__':
    main()
