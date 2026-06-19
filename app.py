import os
import re
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup

app = Flask(__name__)

# Constants
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "cached_feed.xml"

# Map to store loaded updates for caching in memory
_cached_updates = []

def parse_xml_content(xml_text):
    """Parses the Atom XML feed content and extracts individual release note updates."""
    # Register namespaces
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        app.logger.error(f"XML Parsing Error: {e}")
        return []

    updates = []
    
    # Iterate over entries
    for entry in root.findall('atom:entry', namespaces):
        title_elem = entry.find('atom:title', namespaces)
        updated_elem = entry.find('atom:updated', namespaces)
        link_elem = entry.find('atom:link[@rel="alternate"]', namespaces)
        id_elem = entry.find('atom:id', namespaces)
        
        date_str = title_elem.text if title_elem is not None else "Unknown Date"
        updated_str = updated_elem.text if updated_elem is not None else ""
        link = link_elem.attrib.get('href') if link_elem is not None else "https://docs.cloud.google.com/bigquery/docs/release-notes"
        id_str = id_elem.text if id_elem is not None else ""
        
        content_elem = entry.find('atom:content', namespaces)
        if content_elem is None or not content_elem.text:
            continue
            
        html_content = content_elem.text
        soup = BeautifulSoup(html_content, 'html.parser')
        
        current_category = None
        current_html_blocks = []
        entry_updates = []
        
        # Iterate through elements to break them down by <h3> headers (categories)
        for child in soup.contents:
            if child.name == 'h3':
                # If we've already gathered some blocks, commit them before starting the next category
                if current_html_blocks:
                    cat = current_category if current_category else "General"
                    content_snippet = "".join(str(b) for b in current_html_blocks)
                    text_content = BeautifulSoup(content_snippet, 'html.parser').get_text(separator=' ').strip()
                    text_content = re.sub(r'\s+', ' ', text_content)
                    
                    entry_updates.append({
                        'category': cat,
                        'content_html': content_snippet.strip(),
                        'content_text': text_content
                    })
                    current_html_blocks = []
                current_category = child.get_text().strip()
            else:
                current_html_blocks.append(child)
                
        # Handle the remaining content block
        if current_html_blocks:
            cat = current_category if current_category else "General"
            content_snippet = "".join(str(b) for b in current_html_blocks)
            text_content = BeautifulSoup(content_snippet, 'html.parser').get_text(separator=' ').strip()
            text_content = re.sub(r'\s+', ' ', text_content)
            
            entry_updates.append({
                'category': cat,
                'content_html': content_snippet.strip(),
                'content_text': text_content
            })
            
        # Add metadata fields to all sub-updates of this entry
        for i, item in enumerate(entry_updates):
            unique_id = f"{id_str}_{i}" if id_str else f"update_{date_str.replace(' ', '_')}_{i}"
            updates.append({
                'id': unique_id,
                'date': date_str,
                'updated': updated_str,
                'category': item['category'],
                'content_html': item['content_html'],
                'content_text': item['content_text'],
                'link': link
            })
            
    return updates

def load_updates(force_refresh=False):
    """Fetches the RSS feed from source or loads from local cache if offline/cached."""
    global _cached_updates
    
    # If in-memory cache is present and we're not forcing refresh, return it
    if _cached_updates and not force_refresh:
        return _cached_updates
        
    xml_data = None
    
    # Try fetching from Google Docs Feed
    try:
        response = requests.get(FEED_URL, timeout=10)
        if response.status_code == 200:
            xml_data = response.text
            # Write to cache file
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                f.write(xml_data)
    except Exception as e:
        app.logger.error(f"Error fetching live release notes: {e}")
        
    # Fallback to local cache file if we failed to fetch
    if not xml_data and os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                xml_data = f.read()
        except Exception as e:
            app.logger.error(f"Error reading cache file: {e}")
            
    if xml_data:
        parsed = parse_xml_content(xml_data)
        if parsed:
            _cached_updates = parsed
            return _cached_updates
            
    return _cached_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        releases = load_updates(force_refresh=force_refresh)
        return jsonify({
            'status': 'success',
            'data': releases,
            'count': len(releases)
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    # Initialize cache on startup
    try:
        load_updates()
    except Exception as e:
        print(f"Warning: Initial feed load failed: {e}")
    app.run(debug=True, port=5000)
