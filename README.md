# BigQuery Release Pulse 🚀

A modern, high-fidelity web application built with **Python Flask** and **Vanilla HTML/CSS/JavaScript** that monitors and parses BigQuery release notes. It enables users to browse, search, and filter updates, as well as select individual updates to tweet about them using a built-in character-counting composer.

## Features
- **High-Fidelity UI**: Dark-mode dashboard featuring Google Cloud inspired neon themes, card hover glows, and seamless transitions.
- **Categorized Feed Parsing**: Intelligently decomposes grouped Atom feed entries into distinct update cards based on headers (`Feature`, `Announcement`, `Change`, `Breaking`, `Issue`).
- **Keyword Search & Filter**: Real-time filtering by category pills (with active update count tags) and full-text search.
- **Interactive Twitter Composer**: Custom composer modal mimicking X/Twitter with:
  - Circular progress ring character counter.
  - One-click **🪄 Shorten Text** helper that condenses the selected update to fit under the 280-character limit automatically while preserving links/hashtags.
  - Twitter Web Intent Integration (requires no developer keys).
- **Offline Cache Fallback**: Fetches live feed data from Google Cloud, with automated fallback to a local cache (`cached_feed.xml`) in case of connectivity issues.

## Setup & Running the Application

### 1. Prerequisites
Ensure you have **Python 3.10+** installed on your system.

### 2. Environment Setup
The project already comes with a configured virtual environment `.venv`. If you need to reinstall or restore dependencies, run:
```bash
# Windows
.\.venv\Scripts\pip.exe install -r requirements.txt

# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Running the App
Start the Flask local development server:
```bash
# Windows
.\.venv\Scripts\python.exe app.py

# macOS/Linux
source .venv/bin/activate
python app.py
```

Open your browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**
