# World Statistics Atlas — Global Data Platform

A comprehensive, full-stack data platform covering **120+ countries** with demographic and economic data. Features an interactive vector world map, country comparison tool, rankings table with search/filter/sort, live charts, CSV export, and a REST API backend.

## Features

- **Interactive World Map** — Click any country to open a detailed statistics panel
- **120+ Countries** — Population, GDP, GDP per capita, area, HDI, life expectancy, internet access, and more
- **Search & Filter** — Find countries by name or code, filter by continent
- **Sortable Rankings Table** — Sort by any metric with visual bar indicators
- **Comparison Tool** — Compare up to 5 countries side by side
- **Charts** — Top 15 rankings for GDP, population, GDP per capita, and HDI
- **CSV Export** — Download the full dataset as a CSV file
- **Dark Mode** — Toggle between light and dark themes
- **REST API** — Full backend with endpoints for countries, comparison, continents, top rankings, and export
- **Responsive** — Works on desktop, tablet, and mobile

## Quick Start

### 1. Install Python dependencies

```bash
cd server
pip install -r requirements.txt
```

### 2. Start the API server

```bash
cd server
python app.py
```

The server starts on `http://localhost:5000`.

### 3. Open the frontend

Open `index.html` in your browser, or serve it via any static file server.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/countries` | List all countries (with search, sort, continent filter) |
| `GET /api/countries/:code` | Full details for a single country |
| `GET /api/compare?codes=IT,US,CN` | Compare up to 5 countries side by side |
| `GET /api/continents` | Aggregated statistics per continent |
| `GET /api/top?metric=gdpUsd&limit=10` | Top N countries by any metric |
| `GET /api/export.csv` | Download full dataset as CSV |
| `GET /api/health` | Health check |

## Docker Deployment

```bash
docker compose up --build
```

Then open `http://localhost:5000`.

## Data Sources

Data is based on World Bank and UN approximations for a 2025-2026 snapshot.

## Tech Stack

- **Frontend:** Vanilla JavaScript, jsVectorMap, Chart.js
- **Backend:** Python / Flask
- **Styling:** CSS custom properties with dark mode support