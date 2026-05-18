import geopandas as gpd
import requests
import json
from shapely.geometry import shape, Point

def main():
    # Load Myanmar boundary
    print("Loading mmr_admin0.geojson...")
    mmr = gpd.read_file('mmr_admin0.geojson')
    
    # Get bounding box
    minx, miny, maxx, maxy = mmr.total_bounds
    print(f"Bounding box: minlon={minx}, minlat={miny}, maxlon={maxx}, maxlat={maxy}")
    
    # Query USGS API
    url = "https://earthquake.usgs.gov/fdsnws/event/1/query"
    params = {
        "format": "geojson",
        "starttime": "2025-03-28",
        "endtime": "2026-05-19",
        "minlongitude": minx,
        "maxlongitude": maxx,
        "minlatitude": miny,
        "maxlatitude": maxy
    }
    
    print("Querying USGS API...")
    response = requests.get(url, params=params)
    if response.status_code != 200:
        print(f"Error fetching data: {response.text}")
        return
        
    data = response.json()
    print(f"Fetched {len(data['features'])} events in bounding box.")
    
    if len(data['features']) == 0:
        print("No events found. Exiting.")
        return
        
    # Convert to GeoDataFrame
    eq_gdf = gpd.GeoDataFrame.from_features(data['features'])
    # The API returns points in WGS84 (EPSG:4326)
    eq_gdf.set_crs(epsg=4326, inplace=True)
    
    # Check if mmr has crs, if not set it to WGS84
    if mmr.crs is None:
        mmr.set_crs(epsg=4326, inplace=True)
    elif mmr.crs != "EPSG:4326":
        mmr = mmr.to_crs(epsg=4326)
        
    # Spatial join to keep only events within Myanmar boundary
    print("Filtering points within Myanmar boundary...")
    # sjoin or within
    # We can just do a spatial join
    eq_within_mmr = gpd.sjoin(eq_gdf, mmr, predicate="within")
    
    print(f"Filtered down to {len(eq_within_mmr)} events within Myanmar.")
    
    # Drop columns added by sjoin, like index_right, etc.
    cols_to_drop = [col for col in eq_within_mmr.columns if col.startswith('index_')]
    eq_within_mmr = eq_within_mmr.drop(columns=cols_to_drop)
    
    # Also need to make sure we don't save mmr properties if we only want earthquake data
    # Keep only the original earthquake columns + geometry
    eq_cols = eq_gdf.columns
    eq_within_mmr = eq_within_mmr[eq_cols]
    
    # Export to GeoJSON
    out_file = "myanmar_earthquakes_20250328_to_present.geojson"
    print(f"Saving to {out_file}...")
    eq_within_mmr.to_file(out_file, driver="GeoJSON")
    print("Done!")

if __name__ == "__main__":
    main()
