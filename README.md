# Myanmar Seismicity Dashboard 🌍

An interactive, responsive, web-based dashboard for visualizing and analyzing recent earthquake activity in Myanmar. The project overlays live and historical earthquake data from the USGS with the 2011 Myanmar Tectonic Lineaments to provide valuable seismological insights.

**[View Live Dashboard](https://<your-username>.github.io/<your-repo-name>/)** *(Replace with your GitHub Pages link after deployment)*

---

## 📌 Project Overview

This tool was designed for researchers, geologists, and the general public to monitor and analyze earthquakes occurring specifically within Myanmar's geographical boundaries. The dashboard allows users to interact with geospatial and statistical data simultaneously.

### Key Features:
- **Interactive Web Map**: Powered by Leaflet, displaying earthquake clusters and precise tectonic lineaments across Myanmar.
- **Dynamic Filtering**: Filter events seamlessly by magnitude, depth, date range, and USGS alert levels.
- **Statistical Analytics**: Four interconnected charts built with Chart.js:
  - Timeline of Earthquakes (Scatter)
  - Magnitude Distribution (Histogram)
  - Depth Distribution (Histogram)
  - Magnitude vs. Depth correlation (Scatter)
- **Detail View Panels**: Clickable earthquake markers to retrieve deep statistics (Coordinates, Modified Mercalli Intensity, Felt Reports, Alert Status).
- **Glassmorphic UI**: A dark-themed, modern responsive interface designed for both desktop and mobile viewing.

---

## 💾 Data Sources

The project relies on accurate and continuously maintained data repositories:

1. **Earthquake Data**: Real-time / Historical data fetched directly from the **[USGS Search Earthquake Catalog API](https://earthquake.usgs.gov/fdsnws/event/1/)**.
2. **Myanmar Boundary**: Defined by `mmr_admin0.geojson`.
3. **Tectonic Lineaments**: Sourced from the **Myanmar Tectonic Map (2011)** (`Myanmar_Tectonic_Map_2011.geojson`).

---

## 🛠️ Methodology & Processing Workflow

### 1. Data Fetching & Geospatial Filtering
To ensure that only earthquakes occurring *strictly within* Myanmar's terrestrial and coastal borders are shown, a Python processing script (`fetch_earthquakes.py`) is used:
- The script loads the precise Myanmar boundary polygon (`mmr_admin0.geojson`).
- It extracts a bounding box and makes an initial bulk request to the USGS API.
- Using `geopandas`, it performs a rigorous **Spatial Join (`sjoin`)** to crop and keep only the earthquakes that physically fall inside the Myanmar polygon.
- The filtered result is exported as `myanmar_earthquakes_20250328_to_present.geojson`.

### 2. Frontend Dashboard
- The application uses vanilla **JavaScript**, **HTML5**, and **CSS3** (with CSS variables for theming).
- **Leaflet.js** handles the rendering of the GeoJSON points and linestrings.
- **Chart.js** computes and renders the visual analytics.
- Client-side filtering ensures that the map and the charts respond immediately to user queries without needing a backend server.

---

## 📂 Repository Structure

```text
├── index.html                                      # Main dashboard layout
├── index.css                                       # Glassmorphic Dark UI styles
├── app.js                                          # Application logic (Leaflet & Chart.js)
├── fetch_earthquakes.py                            # Python script for downloading & filtering USGS data
├── requirements.txt                                # Python dependencies for the script
├── mmr_admin0.geojson                              # Myanmar national boundary definition
├── Myanmar_Tectonic_Map_2011.geojson               # 2011 tectonic lineaments dataset
├── myanmar_earthquakes_20250328_to_present.geojson # Processed earthquake data
├── LICENSE                                         # MIT License
└── README.md                                       # Project documentation
```

---

## 🚀 Installation & Local Development

No complex build steps or node modules are required for the frontend.

### Running the Dashboard Locally
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/myanmar-seismicity-dashboard.git
   cd myanmar-seismicity-dashboard
   ```
2. Serve the directory using any static local web server. For example, with Python:
   ```bash
   python -m http.server 8080
   ```
3. Open `http://localhost:8080` in your web browser.

### Updating Earthquake Data
To refresh the dataset with the latest earthquakes:
1. Ensure you have Python installed.
2. Install the geospatial dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the fetching script:
   ```bash
   python fetch_earthquakes.py
   ```
   *The script will query USGS, filter points against the Myanmar boundary, and silently overwrite the existing `myanmar_earthquakes_*.geojson` file with fresh data.*

---

## 🌐 Deployment to GitHub Pages

Deploying this dashboard is extremely simple because it consists entirely of static assets.

1. Create a new repository on your GitHub account and push these files to the `main` or `master` branch.
2. Navigate to your repository **Settings** -> **Pages**.
3. Under **Source**, select `Deploy from a branch`.
4. Under **Branch**, select your main branch (`main` or `master`) and select the `/ (root)` folder.
5. Click **Save**.
6. Wait 1-2 minutes. GitHub will provide you with a live URL (e.g., `https://username.github.io/myanmar-seismicity-dashboard/`).

---

## 📄 License

This project is open-source and available under the **[MIT License](LICENSE)**.

*Disclaimer: The earthquake and tectonic data provided in this repository are strictly for visualization, research, and educational purposes.*
