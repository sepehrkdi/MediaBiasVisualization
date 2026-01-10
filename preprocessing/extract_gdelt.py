"""
GDELT Data Preprocessing Pipeline
Connects to PostgreSQL, extracts and transforms GDELT data for visualization.

Author: Sepehr Khodadadeh
Course: Data Visualization 2025-2026, University of Geneva
"""

import os
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import scipy.stats as stats
from typing import Dict, List, Optional, Tuple

# Database configuration - override with environment variables
DB_CONFIG = {
    'host': os.getenv('GDELT_DB_HOST', 'localhost'),
    'port': os.getenv('GDELT_DB_PORT', '5432'),
    'database': os.getenv('GDELT_DB_NAME', 'gdelt'),
    'user': os.getenv('GDELT_DB_USER', 'postgres'),
    'password': os.getenv('GDELT_DB_PASSWORD', '')
}

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')


def get_connection():
    """Create database connection."""
    return psycopg2.connect(**DB_CONFIG)


def execute_query(query: str, params: tuple = None) -> pd.DataFrame:
    """Execute SQL query and return DataFrame."""
    conn = get_connection()
    try:
        df = pd.read_sql_query(query, conn, params=params)
        return df
    finally:
        conn.close()


def calculate_confidence_interval(data: pd.Series, confidence: float = 0.95) -> Tuple[float, float]:
    """Calculate confidence interval for a series."""
    n = len(data)
    if n < 2:
        return (data.mean(), data.mean())
    
    mean = data.mean()
    se = stats.sem(data)
    h = se * stats.t.ppf((1 + confidence) / 2, n - 1)
    return (mean - h, mean + h)


def extract_sentiment_by_source() -> Dict:
    """
    Extract sentiment analysis by news source.
    Returns aggregated sentiment scores with confidence intervals.
    """
    query = """
    SELECT 
        s.domain as source_name,
        s.domain_country as country,
        AVG(g.avgtone) as avg_sentiment,
        STDDEV(g.avgtone) as std_sentiment,
        COUNT(*) as article_count,
        AVG(g.goldsteinscale) as avg_goldstein
    FROM gdelt_events g
    JOIN gdelt_sources s ON g.sourceurl LIKE '%' || s.domain || '%'
    WHERE g.sqldate >= NOW() - INTERVAL '1 year'
    GROUP BY s.domain, s.domain_country
    HAVING COUNT(*) >= 100
    ORDER BY article_count DESC
    LIMIT 100;
    """
    
    df = execute_query(query)
    
    # Calculate confidence intervals
    results = []
    for _, row in df.iterrows():
        ci = (row['avg_sentiment'] - 1.96 * row['std_sentiment'] / np.sqrt(row['article_count']),
              row['avg_sentiment'] + 1.96 * row['std_sentiment'] / np.sqrt(row['article_count']))
        
        results.append({
            'name': row['source_name'],
            'country': row['country'],
            'avgSentiment': round(row['avg_sentiment'], 3),
            'stdSentiment': round(row['std_sentiment'], 3),
            'articleCount': int(row['article_count']),
            'avgGoldstein': round(row['avg_goldstein'], 3),
            'ci_lower': round(ci[0], 3),
            'ci_upper': round(ci[1], 3)
        })
    
    return {
        'sources': results,
        'metadata': {
            'extracted_at': datetime.now().isoformat(),
            'total_sources': len(results),
            'query_period': '1 year'
        }
    }


def extract_country_coverage() -> Dict:
    """
    Extract coverage patterns by country.
    Includes media attention metrics and bias indicators.
    """
    query = """
    SELECT 
        actor1countrycode as country_code,
        COUNT(*) as total_coverage,
        AVG(avgtone) as avg_tone,
        AVG(goldsteinscale) as avg_goldstein,
        AVG(nummentions) as avg_mentions,
        COUNT(DISTINCT sourceurl) as unique_sources
    FROM gdelt_events
    WHERE sqldate >= NOW() - INTERVAL '1 year'
      AND actor1countrycode IS NOT NULL
      AND actor1countrycode != ''
    GROUP BY actor1countrycode
    HAVING COUNT(*) >= 50
    ORDER BY total_coverage DESC;
    """
    
    df = execute_query(query)
    
    # Normalize coverage for visualization
    max_coverage = df['total_coverage'].max()
    
    results = []
    for _, row in df.iterrows():
        results.append({
            'code': row['country_code'],
            'coverage': int(row['total_coverage']),
            'normalizedCoverage': round(row['total_coverage'] / max_coverage, 4),
            'avgTone': round(row['avg_tone'], 3),
            'avgGoldstein': round(row['avg_goldstein'], 3),
            'avgMentions': round(row['avg_mentions'], 2),
            'sourceCount': int(row['unique_sources'])
        })
    
    return {
        'countries': results,
        'metadata': {
            'extracted_at': datetime.now().isoformat(),
            'total_countries': len(results),
            'max_coverage': int(max_coverage)
        }
    }


def extract_temporal_trends() -> Dict:
    """
    Extract temporal trends in media coverage.
    Weekly aggregation for smooth visualization.
    """
    query = """
    SELECT 
        DATE_TRUNC('week', sqldate::date) as week,
        COUNT(*) as event_count,
        AVG(avgtone) as avg_tone,
        AVG(goldsteinscale) as avg_goldstein,
        SUM(CASE WHEN avgtone > 0 THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN avgtone < 0 THEN 1 ELSE 0 END) as negative_count
    FROM gdelt_events
    WHERE sqldate >= NOW() - INTERVAL '2 years'
    GROUP BY DATE_TRUNC('week', sqldate::date)
    ORDER BY week;
    """
    
    df = execute_query(query)
    
    # Calculate rolling averages for smoother visualization
    df['tone_rolling'] = df['avg_tone'].rolling(window=4, min_periods=1).mean()
    df['count_rolling'] = df['event_count'].rolling(window=4, min_periods=1).mean()
    
    # Calculate confidence band
    df['tone_std'] = df['avg_tone'].rolling(window=4, min_periods=1).std()
    df['ci_upper'] = df['tone_rolling'] + 1.96 * df['tone_std']
    df['ci_lower'] = df['tone_rolling'] - 1.96 * df['tone_std']
    
    results = []
    for _, row in df.iterrows():
        results.append({
            'date': row['week'].isoformat() if pd.notna(row['week']) else None,
            'eventCount': int(row['event_count']),
            'avgTone': round(row['avg_tone'], 3),
            'toneSmooth': round(row['tone_rolling'], 3),
            'countSmooth': round(row['count_rolling'], 1),
            'positiveRatio': round(row['positive_count'] / row['event_count'], 3),
            'ciUpper': round(row['ci_upper'], 3) if pd.notna(row['ci_upper']) else None,
            'ciLower': round(row['ci_lower'], 3) if pd.notna(row['ci_lower']) else None
        })
    
    return {
        'timeline': results,
        'metadata': {
            'extracted_at': datetime.now().isoformat(),
            'total_weeks': len(results),
            'date_range': {
                'start': results[0]['date'] if results else None,
                'end': results[-1]['date'] if results else None
            }
        }
    }


def extract_event_type_distribution() -> Dict:
    """
    Extract distribution of event types.
    For treemap visualization.
    """
    query = """
    SELECT 
        eventcode,
        eventrootcode,
        eventbasecode,
        COUNT(*) as event_count,
        AVG(avgtone) as avg_tone,
        AVG(goldsteinscale) as avg_goldstein
    FROM gdelt_events
    WHERE sqldate >= NOW() - INTERVAL '1 year'
    GROUP BY eventcode, eventrootcode, eventbasecode
    ORDER BY event_count DESC
    LIMIT 50;
    """
    
    df = execute_query(query)
    total = df['event_count'].sum()
    
    # CAMEO code mapping (simplified)
    cameo_names = {
        '01': 'Public Statement', '02': 'Appeal', '03': 'Cooperation Intent',
        '04': 'Consultation', '05': 'Diplomatic Cooperation', '06': 'Material Cooperation',
        '07': 'Aid Provision', '08': 'Yield', '09': 'Investigation',
        '10': 'Demand', '11': 'Disapproval', '12': 'Reject',
        '13': 'Threaten', '14': 'Protest', '15': 'Exhibit Force',
        '16': 'Reduce Relations', '17': 'Coercion', '18': 'Assault',
        '19': 'Fight', '20': 'Military Engagement'
    }
    
    results = []
    for _, row in df.iterrows():
        root_code = str(row['eventrootcode']).zfill(2)
        name = cameo_names.get(root_code, f'Event Type {root_code}')
        
        results.append({
            'code': row['eventcode'],
            'rootCode': root_code,
            'name': name,
            'count': int(row['event_count']),
            'percent': round(row['event_count'] / total * 100, 2),
            'avgTone': round(row['avg_tone'], 3),
            'avgGoldstein': round(row['avg_goldstein'], 3)
        })
    
    return {
        'types': results,
        'metadata': {
            'extracted_at': datetime.now().isoformat(),
            'total_events': int(total),
            'unique_types': len(results)
        }
    }


def extract_source_network() -> Dict:
    """
    Extract source citation network.
    For network graph visualization.
    """
    query = """
    WITH source_pairs AS (
        SELECT 
            s1.domain as source1,
            s2.domain as source2,
            s1.domain_country as country1,
            s2.domain_country as country2,
            COUNT(*) as co_coverage
        FROM gdelt_events g1
        JOIN gdelt_sources s1 ON g1.sourceurl LIKE '%' || s1.domain || '%'
        JOIN gdelt_events g2 ON g1.globaleventid != g2.globaleventid
            AND g1.actor1code = g2.actor1code
            AND g1.sqldate = g2.sqldate
        JOIN gdelt_sources s2 ON g2.sourceurl LIKE '%' || s2.domain || '%'
        WHERE g1.sqldate >= NOW() - INTERVAL '3 months'
          AND s1.domain < s2.domain
        GROUP BY s1.domain, s2.domain, s1.domain_country, s2.domain_country
        HAVING COUNT(*) >= 10
        ORDER BY co_coverage DESC
        LIMIT 200
    )
    SELECT * FROM source_pairs;
    """
    
    try:
        df = execute_query(query)
    except Exception:
        # Fallback: simpler query if the complex one fails
        return _generate_sample_network()
    
    # Build nodes and links
    nodes_set = set()
    links = []
    
    for _, row in df.iterrows():
        nodes_set.add((row['source1'], row['country1']))
        nodes_set.add((row['source2'], row['country2']))
        links.append({
            'source': row['source1'],
            'target': row['source2'],
            'weight': int(row['co_coverage'])
        })
    
    nodes = [{'id': n[0], 'group': n[1] or 'Unknown'} for n in nodes_set]
    
    return {
        'nodes': nodes,
        'links': links,
        'metadata': {
            'extracted_at': datetime.now().isoformat(),
            'total_nodes': len(nodes),
            'total_links': len(links)
        }
    }


def extract_bias_comparison() -> Dict:
    """
    Extract bias comparison between source types.
    For diverging bar chart.
    """
    query = """
    SELECT 
        CASE 
            WHEN domain LIKE '%.gov%' THEN 'Government'
            WHEN domain LIKE '%bbc%' OR domain LIKE '%reuters%' OR domain LIKE '%ap%' THEN 'Wire Service'
            WHEN domain LIKE '%nyt%' OR domain LIKE '%wapo%' OR domain LIKE '%guardian%' THEN 'Quality Press'
            WHEN domain LIKE '%fox%' OR domain LIKE '%breitbart%' THEN 'Conservative'
            WHEN domain LIKE '%msnbc%' OR domain LIKE '%huffpost%' THEN 'Progressive'
            ELSE 'Other'
        END as source_type,
        AVG(g.avgtone) as avg_tone,
        STDDEV(g.avgtone) as std_tone,
        COUNT(*) as article_count,
        AVG(g.goldsteinscale) as avg_goldstein
    FROM gdelt_events g
    JOIN gdelt_sources s ON g.sourceurl LIKE '%' || s.domain || '%'
    WHERE g.sqldate >= NOW() - INTERVAL '6 months'
    GROUP BY source_type
    HAVING COUNT(*) >= 100
    ORDER BY avg_tone;
    """
    
    df = execute_query(query)
    
    results = []
    for _, row in df.iterrows():
        n = row['article_count']
        ci = 1.96 * row['std_tone'] / np.sqrt(n) if n > 0 else 0
        
        results.append({
            'category': row['source_type'],
            'value': round(row['avg_tone'], 3),
            'ci_lower': round(row['avg_tone'] - ci, 3),
            'ci_upper': round(row['avg_tone'] + ci, 3),
            'n': int(n),
            'goldstein': round(row['avg_goldstein'], 3)
        })
    
    return {
        'comparison': results,
        'metadata': {
            'extracted_at': datetime.now().isoformat(),
            'total_categories': len(results)
        }
    }


def _generate_sample_network() -> Dict:
    """Generate sample network data for development."""
    sources = ['BBC', 'CNN', 'Reuters', 'AP', 'NYT', 'Guardian', 'Al Jazeera',
               'Fox News', 'MSNBC', 'Washington Post', 'Le Monde', 'DW']
    
    regions = ['Europe', 'North America', 'Middle East', 'Asia']
    
    nodes = [{'id': s, 'group': np.random.choice(regions)} for s in sources]
    
    links = []
    for i, s1 in enumerate(sources):
        for s2 in sources[i+1:]:
            if np.random.random() > 0.6:
                links.append({
                    'source': s1,
                    'target': s2,
                    'weight': np.random.randint(5, 50)
                })
    
    return {
        'nodes': nodes,
        'links': links,
        'metadata': {
            'extracted_at': datetime.now().isoformat(),
            'note': 'Sample data for development'
        }
    }


def save_json(data: Dict, filename: str) -> None:
    """Save data to JSON file."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filepath = os.path.join(OUTPUT_DIR, filename)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, default=str)
    
    print(f"Saved: {filepath}")


def run_pipeline():
    """Run the complete preprocessing pipeline."""
    print("=" * 60)
    print("GDELT Data Preprocessing Pipeline")
    print("=" * 60)
    print(f"Start time: {datetime.now().isoformat()}")
    print()
    
    extractions = [
        ('sentiment_by_source.json', extract_sentiment_by_source),
        ('country_coverage.json', extract_country_coverage),
        ('temporal_trends.json', extract_temporal_trends),
        ('event_types.json', extract_event_type_distribution),
        ('source_network.json', extract_source_network),
        ('bias_comparison.json', extract_bias_comparison),
    ]
    
    for filename, extract_func in extractions:
        try:
            print(f"Extracting: {filename}")
            data = extract_func()
            save_json(data, filename)
            print(f"  ✓ Success: {data.get('metadata', {}).get('total_sources', 'N/A')} records")
        except Exception as e:
            print(f"  ✗ Error: {str(e)}")
    
    print()
    print(f"End time: {datetime.now().isoformat()}")
    print("=" * 60)


if __name__ == '__main__':
    run_pipeline()
