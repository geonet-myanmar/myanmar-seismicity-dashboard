/* ========================================================
   Myanmar Seismicity Dashboard – Application Logic
   ======================================================== */

(function () {
    'use strict';

    // ─── State ───────────────────────────────────────────
    let earthquakeData = null;       // raw GeoJSON
    let tectonicData = null;         // raw GeoJSON
    let allQuakes = [];              // processed array
    let filteredQuakes = [];         // after filter
    let map = null;
    let quakeLayer = null;
    let tectonicLayer = null;
    let boundaryLayer = null;
    let charts = {};

    // ─── Color helpers ───────────────────────────────────
    function magColor(mag) {
        if (mag < 4) return '#2ecc71';
        if (mag < 5) return '#f1c40f';
        if (mag < 6) return '#e67e22';
        if (mag < 7) return '#e74c3c';
        return '#8e44ad';
    }

    function magRadius(mag) {
        if (mag < 4) return 5;
        if (mag < 5) return 8;
        if (mag < 6) return 12;
        if (mag < 7) return 16;
        return 22;
    }

    function depthColor(depth) {
        if (depth < 10) return '#6366f1';
        if (depth < 30) return '#3b82f6';
        if (depth < 70) return '#10b981';
        if (depth < 150) return '#f59e0b';
        return '#ef4444';
    }

    // ─── Data Loading ────────────────────────────────────
    async function loadData() {
        const [eqRes, tecRes] = await Promise.all([
            fetch('myanmar_earthquakes_20250328_to_present.geojson'),
            fetch('Myanmar_Tectonic_Map_2011.geojson')
        ]);
        earthquakeData = await eqRes.json();
        tectonicData = await tecRes.json();

        // Process earthquakes into flat array
        allQuakes = earthquakeData.features.map((f, i) => {
            const p = f.properties;
            const c = f.geometry.coordinates;
            return {
                id: i,
                lng: c[0],
                lat: c[1],
                depth: c[2],
                mag: p.mag ?? 0,
                place: p.place || 'Unknown',
                time: p.time,
                date: new Date(p.time),
                title: p.title || '',
                alert: p.alert || 'none',
                felt: p.felt,
                cdi: p.cdi,
                mmi: p.mmi,
                sig: p.sig,
                url: p.url,
                status: p.status,
                magType: p.magType,
                type: p.type,
                tsunami: p.tsunami
            };
        });

        // Sort by time
        allQuakes.sort((a, b) => a.time - b.time);
    }

    // ─── Map Initialization ──────────────────────────────
    function initMap() {
        map = L.map('map', {
            center: [19.5, 96.5],
            zoom: 6,
            zoomControl: true,
            attributionControl: true
        });

        // Dark tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
            maxZoom: 18
        }).addTo(map);

        // Tectonic layer
        tectonicLayer = L.geoJSON(tectonicData, {
            style: function (feature) {
                return {
                    color: '#ff6b6b',
                    weight: 1.5,
                    opacity: 0.7,
                    dashArray: null
                };
            },
            onEachFeature: function (feature, layer) {
                const p = feature.properties;
                if (p.NAME) {
                    layer.bindTooltip(
                        `<strong>${p.NAME}</strong>${p.TYPE_DESCR ? '<br>' + p.TYPE_DESCR : ''}`,
                        { sticky: true, className: 'tectonic-tooltip' }
                    );
                }
            }
        }).addTo(map);

        // Boundary layer (load mmr_admin0.geojson)
        fetch('mmr_admin0.geojson')
            .then(r => r.json())
            .then(data => {
                boundaryLayer = L.geoJSON(data, {
                    style: {
                        color: '#6366f1',
                        weight: 2,
                        opacity: 0.6,
                        fillColor: '#6366f1',
                        fillOpacity: 0.03,
                        dashArray: '4 6'
                    }
                }).addTo(map);
            });

        // Quake layer (empty initially)
        quakeLayer = L.layerGroup().addTo(map);
    }

    // ─── Render Quakes on Map ────────────────────────────
    function renderQuakesOnMap() {
        quakeLayer.clearLayers();

        const clusterMode = document.getElementById('toggle-heatmap').checked;

        filteredQuakes.forEach(q => {
            const color = magColor(q.mag);
            const radius = magRadius(q.mag);

            const marker = L.circleMarker([q.lat, q.lng], {
                radius: clusterMode ? Math.max(radius * 0.7, 4) : radius,
                fillColor: color,
                fillOpacity: 0.7,
                color: color,
                weight: 1,
                opacity: 0.9
            });

            // Tooltip
            marker.bindTooltip(
                `<strong>M${q.mag.toFixed(1)}</strong><br>${q.place}<br>Depth: ${q.depth.toFixed(1)} km<br>${q.date.toISOString().slice(0, 10)}`,
                { className: 'eq-tooltip' }
            );

            // Click → detail panel
            marker.on('click', () => showDetail(q));

            quakeLayer.addLayer(marker);
        });
    }

    // ─── Detail Panel ────────────────────────────────────
    function showDetail(q) {
        const overlay = document.getElementById('detail-overlay');
        document.getElementById('detail-title').textContent = q.title;

        const grid = document.getElementById('detail-grid');
        grid.innerHTML = '';

        const items = [
            { label: 'Magnitude', value: `${q.mag.toFixed(1)} (${q.magType || 'N/A'})` },
            { label: 'Depth', value: `${q.depth.toFixed(1)} km` },
            { label: 'Date/Time (UTC)', value: q.date.toISOString().replace('T', ' ').slice(0, 19) },
            { label: 'Location', value: q.place },
            { label: 'Coordinates', value: `${q.lat.toFixed(4)}°N, ${q.lng.toFixed(4)}°E` },
            { label: 'Felt Reports', value: q.felt != null ? q.felt : '—' },
            { label: 'MMI Intensity', value: q.mmi != null ? q.mmi.toFixed(1) : '—' },
            { label: 'Alert Level', value: q.alert ? q.alert.charAt(0).toUpperCase() + q.alert.slice(1) : 'None' },
            { label: 'Significance', value: q.sig || '—' },
            { label: 'Status', value: q.status ? q.status.charAt(0).toUpperCase() + q.status.slice(1) : '—' }
        ];

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'detail-item';
            div.innerHTML = `<span class="dlabel">${item.label}</span><span class="dvalue">${item.value}</span>`;
            grid.appendChild(div);
        });

        document.getElementById('detail-link').href = q.url || '#';
        overlay.classList.remove('hidden');
    }

    function hideDetail() {
        document.getElementById('detail-overlay').classList.add('hidden');
    }

    // ─── Filters ─────────────────────────────────────────
    function getFilterValues() {
        const dateStart = document.getElementById('date-start').value;
        const dateEnd = document.getElementById('date-end').value;
        const magMin = parseFloat(document.getElementById('mag-min').value);
        const magMax = parseFloat(document.getElementById('mag-max').value);
        const depthMin = parseFloat(document.getElementById('depth-min').value);
        const depthMax = parseFloat(document.getElementById('depth-max').value);

        // Alert checkboxes
        const alertChecks = document.querySelectorAll('#filter-alert .chip-checkbox:not([data-value="all"]) input');
        const activeAlerts = new Set();
        alertChecks.forEach(cb => {
            if (cb.checked) activeAlerts.add(cb.parentElement.dataset.value);
        });

        return { dateStart, dateEnd, magMin, magMax, depthMin, depthMax, activeAlerts };
    }

    function applyFilters() {
        const f = getFilterValues();

        filteredQuakes = allQuakes.filter(q => {
            // Date
            if (f.dateStart) {
                const ds = new Date(f.dateStart);
                if (q.date < ds) return false;
            }
            if (f.dateEnd) {
                const de = new Date(f.dateEnd);
                de.setDate(de.getDate() + 1); // include end date
                if (q.date >= de) return false;
            }
            // Magnitude
            if (q.mag < f.magMin || q.mag > f.magMax) return false;
            // Depth
            if (q.depth < f.depthMin || q.depth > f.depthMax) return false;
            // Alert
            if (!f.activeAlerts.has(q.alert)) return false;
            return true;
        });

        updateHeaderStats();
        renderQuakesOnMap();
        updateCharts();
    }

    // ─── Header Stats ────────────────────────────────────
    function updateHeaderStats() {
        document.querySelector('#stat-total .stat-value').textContent = allQuakes.length;
        const maxMag = allQuakes.reduce((mx, q) => Math.max(mx, q.mag), 0);
        document.querySelector('#stat-max-mag .stat-value').textContent = maxMag.toFixed(1);
        document.querySelector('#stat-filtered .stat-value').textContent = filteredQuakes.length;
    }

    // ─── Range slider visual ─────────────────────────────
    function updateRangeTrack(minEl, maxEl, trackEl) {
        const min = parseFloat(minEl.min);
        const max = parseFloat(minEl.max);
        const lo = parseFloat(minEl.value);
        const hi = parseFloat(maxEl.value);
        const pctLow = ((lo - min) / (max - min)) * 100;
        const pctHigh = ((max - hi) / (max - min)) * 100;
        trackEl.style.setProperty('--low', pctLow + '%');
        trackEl.style.setProperty('--high', pctHigh + '%');
    }

    // ─── Charts ──────────────────────────────────────────
    const chartDefaults = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(17,24,39,0.92)',
                borderColor: 'rgba(99,102,241,0.3)',
                borderWidth: 1,
                titleColor: '#f1f5f9',
                bodyColor: '#94a3b8',
                cornerRadius: 8,
                padding: 10
            }
        },
        scales: {
            x: {
                ticks: { color: '#64748b', font: { size: 10 } },
                grid: { color: 'rgba(255,255,255,0.04)' }
            },
            y: {
                ticks: { color: '#64748b', font: { size: 10 } },
                grid: { color: 'rgba(255,255,255,0.04)' }
            }
        }
    };

    function initCharts() {
        // 1. Timeline (scatter with time axis)
        charts.timeline = new Chart(document.getElementById('chart-timeline'), {
            type: 'scatter',
            data: { datasets: [] },
            options: {
                ...chartDefaults,
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: 'month', displayFormats: { month: 'MMM yyyy' } },
                        ticks: { color: '#64748b', font: { size: 10 } },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        title: { display: true, text: 'Date', color: '#64748b', font: { size: 10 } }
                    },
                    y: {
                        ticks: { color: '#64748b', font: { size: 10 } },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        title: { display: true, text: 'Magnitude', color: '#64748b', font: { size: 10 } }
                    }
                },
                plugins: {
                    ...chartDefaults.plugins,
                    tooltip: {
                        ...chartDefaults.plugins.tooltip,
                        callbacks: {
                            label: function (ctx) {
                                const q = filteredQuakes[ctx.dataIndex];
                                if (!q) return '';
                                return `M${q.mag.toFixed(1)} – ${q.place} (${q.depth.toFixed(0)} km)`;
                            }
                        }
                    }
                }
            }
        });

        // 2. Magnitude histogram
        charts.magnitude = new Chart(document.getElementById('chart-magnitude'), {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: {
                ...chartDefaults,
                scales: {
                    x: {
                        ticks: { color: '#64748b', font: { size: 10 } },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        title: { display: true, text: 'Magnitude', color: '#64748b', font: { size: 10 } }
                    },
                    y: {
                        ticks: { color: '#64748b', font: { size: 10 }, stepSize: 1 },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        title: { display: true, text: 'Count', color: '#64748b', font: { size: 10 } },
                        beginAtZero: true
                    }
                }
            }
        });

        // 3. Depth histogram
        charts.depth = new Chart(document.getElementById('chart-depth'), {
            type: 'bar',
            data: { labels: [], datasets: [] },
            options: {
                ...chartDefaults,
                indexAxis: 'y',
                scales: {
                    y: {
                        ticks: { color: '#64748b', font: { size: 10 } },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        title: { display: true, text: 'Depth (km)', color: '#64748b', font: { size: 10 } }
                    },
                    x: {
                        ticks: { color: '#64748b', font: { size: 10 }, stepSize: 1 },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        title: { display: true, text: 'Count', color: '#64748b', font: { size: 10 } },
                        beginAtZero: true
                    }
                }
            }
        });

        // 4. Magnitude vs Depth scatter
        charts.magdepth = new Chart(document.getElementById('chart-magdepth'), {
            type: 'scatter',
            data: { datasets: [] },
            options: {
                ...chartDefaults,
                scales: {
                    x: {
                        ticks: { color: '#64748b', font: { size: 10 } },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        title: { display: true, text: 'Magnitude', color: '#64748b', font: { size: 10 } }
                    },
                    y: {
                        reverse: true,
                        ticks: { color: '#64748b', font: { size: 10 } },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        title: { display: true, text: 'Depth (km)', color: '#64748b', font: { size: 10 } }
                    }
                },
                plugins: {
                    ...chartDefaults.plugins,
                    tooltip: {
                        ...chartDefaults.plugins.tooltip,
                        callbacks: {
                            label: function (ctx) {
                                return `M${ctx.raw.x.toFixed(1)} at ${ctx.raw.y.toFixed(1)} km`;
                            }
                        }
                    }
                }
            }
        });
    }

    function updateCharts() {
        // ── Timeline ──
        const timelineData = filteredQuakes.map(q => ({
            x: q.date,
            y: q.mag
        }));
        const timelineColors = filteredQuakes.map(q => magColor(q.mag));
        const timelineSizes = filteredQuakes.map(q => Math.max(magRadius(q.mag) * 0.8, 3));

        charts.timeline.data.datasets = [{
            data: timelineData,
            backgroundColor: timelineColors,
            borderColor: timelineColors,
            pointRadius: timelineSizes,
            pointHoverRadius: timelineSizes.map(s => s + 2)
        }];
        charts.timeline.update('none');

        // ── Magnitude histogram ──
        const magBins = {};
        const magLabels = [];
        for (let m = 3; m <= 8; m += 0.5) {
            const label = `${m.toFixed(1)}–${(m + 0.5).toFixed(1)}`;
            magLabels.push(label);
            magBins[label] = 0;
        }
        filteredQuakes.forEach(q => {
            const idx = Math.min(Math.floor((q.mag - 3) / 0.5), magLabels.length - 1);
            if (idx >= 0 && idx < magLabels.length) {
                magBins[magLabels[idx]]++;
            }
        });

        const magCounts = magLabels.map(l => magBins[l]);
        const magBarColors = magLabels.map((_, i) => {
            const m = 3 + i * 0.5 + 0.25;
            return magColor(m);
        });

        charts.magnitude.data.labels = magLabels;
        charts.magnitude.data.datasets = [{
            data: magCounts,
            backgroundColor: magBarColors.map(c => c + 'cc'),
            borderColor: magBarColors,
            borderWidth: 1,
            borderRadius: 4
        }];
        charts.magnitude.update('none');

        // ── Depth histogram (horizontal) ──
        const depthRanges = ['0–10', '10–30', '30–70', '70–150', '150+'];
        const depthBins = [0, 0, 0, 0, 0];
        const depthBarColors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
        filteredQuakes.forEach(q => {
            if (q.depth < 10) depthBins[0]++;
            else if (q.depth < 30) depthBins[1]++;
            else if (q.depth < 70) depthBins[2]++;
            else if (q.depth < 150) depthBins[3]++;
            else depthBins[4]++;
        });

        charts.depth.data.labels = depthRanges;
        charts.depth.data.datasets = [{
            data: depthBins,
            backgroundColor: depthBarColors.map(c => c + 'cc'),
            borderColor: depthBarColors,
            borderWidth: 1,
            borderRadius: 4
        }];
        charts.depth.update('none');

        // ── Mag vs Depth scatter ──
        const mdData = filteredQuakes.map(q => ({ x: q.mag, y: q.depth }));
        const mdColors = filteredQuakes.map(q => magColor(q.mag));

        charts.magdepth.data.datasets = [{
            data: mdData,
            backgroundColor: mdColors.map(c => c + '99'),
            borderColor: mdColors,
            pointRadius: 5,
            pointHoverRadius: 7
        }];
        charts.magdepth.update('none');
    }

    // ─── Filter bindings ─────────────────────────────────
    function setupFilterListeners() {
        // Date
        document.getElementById('date-start').addEventListener('change', applyFilters);
        document.getElementById('date-end').addEventListener('change', applyFilters);

        // Magnitude range
        const magMin = document.getElementById('mag-min');
        const magMax = document.getElementById('mag-max');
        const magTrack = document.getElementById('mag-track');
        const magDisplay = document.getElementById('mag-range-display');

        function onMagChange() {
            let lo = parseFloat(magMin.value);
            let hi = parseFloat(magMax.value);
            if (lo > hi) { magMin.value = hi; lo = hi; }
            magDisplay.textContent = `${lo.toFixed(1)} – ${hi.toFixed(1)}`;
            updateRangeTrack(magMin, magMax, magTrack);
            applyFilters();
        }
        magMin.addEventListener('input', onMagChange);
        magMax.addEventListener('input', onMagChange);

        // Depth range
        const depMin = document.getElementById('depth-min');
        const depMax = document.getElementById('depth-max');
        const depTrack = document.getElementById('depth-track');
        const depDisplay = document.getElementById('depth-range-display');

        function onDepthChange() {
            let lo = parseFloat(depMin.value);
            let hi = parseFloat(depMax.value);
            if (lo > hi) { depMin.value = hi; lo = hi; }
            depDisplay.textContent = `${lo} – ${hi}`;
            updateRangeTrack(depMin, depMax, depTrack);
            applyFilters();
        }
        depMin.addEventListener('input', onDepthChange);
        depMax.addEventListener('input', onDepthChange);

        // Alert checkboxes
        const allChip = document.querySelector('#filter-alert .chip-checkbox[data-value="all"]');
        const alertChips = document.querySelectorAll('#filter-alert .chip-checkbox:not([data-value="all"])');

        allChip.addEventListener('click', (e) => {
            const checked = allChip.querySelector('input').checked;
            alertChips.forEach(chip => { chip.querySelector('input').checked = checked; });
            applyFilters();
        });
        alertChips.forEach(chip => {
            chip.addEventListener('click', () => {
                // Uncheck "All" when individual changed
                const allChecked = Array.from(alertChips).every(c => c.querySelector('input').checked);
                allChip.querySelector('input').checked = allChecked;
                applyFilters();
            });
        });

        // Layer toggles
        document.getElementById('toggle-tectonic').addEventListener('change', (e) => {
            if (e.target.checked) {
                map.addLayer(tectonicLayer);
            } else {
                map.removeLayer(tectonicLayer);
            }
        });

        document.getElementById('toggle-boundary').addEventListener('change', (e) => {
            if (boundaryLayer) {
                if (e.target.checked) {
                    map.addLayer(boundaryLayer);
                } else {
                    map.removeLayer(boundaryLayer);
                }
            }
        });

        document.getElementById('toggle-heatmap').addEventListener('change', () => {
            renderQuakesOnMap();
        });

        // Detail close
        document.getElementById('detail-close').addEventListener('click', hideDetail);
        document.getElementById('detail-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) hideDetail();
        });

        // Reset
        document.getElementById('btn-reset').addEventListener('click', resetFilters);

        // Init range tracks
        updateRangeTrack(magMin, magMax, magTrack);
        updateRangeTrack(depMin, depMax, depTrack);
    }

    function resetFilters() {
        // Dates
        const dates = allQuakes.map(q => q.date);
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        document.getElementById('date-start').value = minDate.toISOString().slice(0, 10);
        document.getElementById('date-end').value = maxDate.toISOString().slice(0, 10);

        // Magnitude
        document.getElementById('mag-min').value = 3.0;
        document.getElementById('mag-max').value = 8.0;
        document.getElementById('mag-range-display').textContent = '3.0 – 8.0';

        // Depth
        document.getElementById('depth-min').value = 0;
        document.getElementById('depth-max').value = 200;
        document.getElementById('depth-range-display').textContent = '0 – 200';

        // Alerts – check all
        document.querySelectorAll('#filter-alert .chip-checkbox input').forEach(cb => cb.checked = true);

        // Update range tracks
        updateRangeTrack(
            document.getElementById('mag-min'),
            document.getElementById('mag-max'),
            document.getElementById('mag-track')
        );
        updateRangeTrack(
            document.getElementById('depth-min'),
            document.getElementById('depth-max'),
            document.getElementById('depth-track')
        );

        applyFilters();
    }

    // ─── Initialize defaults ─────────────────────────────
    function setDefaultFilterValues() {
        const dates = allQuakes.map(q => q.date);
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        document.getElementById('date-start').value = minDate.toISOString().slice(0, 10);
        document.getElementById('date-end').value = maxDate.toISOString().slice(0, 10);
    }

    // ─── Tooltips CSS injection ──────────────────────────
    function injectTooltipStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .eq-tooltip {
                background: rgba(17,24,39,0.92) !important;
                border: 1px solid rgba(99,102,241,0.25) !important;
                border-radius: 8px !important;
                color: #f1f5f9 !important;
                font-family: 'Inter', sans-serif !important;
                font-size: 0.75rem !important;
                padding: 8px 12px !important;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
            }
            .eq-tooltip::before {
                border-top-color: rgba(17,24,39,0.92) !important;
            }
            .tectonic-tooltip {
                background: rgba(17,24,39,0.92) !important;
                border: 1px solid rgba(255,107,107,0.3) !important;
                border-radius: 8px !important;
                color: #f1f5f9 !important;
                font-family: 'Inter', sans-serif !important;
                font-size: 0.75rem !important;
                padding: 6px 10px !important;
            }
            .leaflet-popup-content-wrapper {
                background: rgba(17,24,39,0.95) !important;
                border: 1px solid rgba(99,102,241,0.2) !important;
                border-radius: 10px !important;
                color: #f1f5f9 !important;
            }
            .leaflet-popup-tip {
                background: rgba(17,24,39,0.95) !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ─── Boot ────────────────────────────────────────────
    async function boot() {
        // Show loading
        const loader = document.createElement('div');
        loader.className = 'loading-overlay';
        loader.innerHTML = '<div class="spinner"></div><div class="loading-text">Loading seismic data…</div>';
        document.body.appendChild(loader);

        try {
            await loadData();
            injectTooltipStyles();
            initMap();
            initCharts();
            setDefaultFilterValues();
            setupFilterListeners();
            applyFilters();
        } catch (err) {
            console.error('Failed to load dashboard:', err);
            loader.innerHTML = `<div class="loading-text" style="color:#ef4444;">Error loading data: ${err.message}</div>`;
            return;
        }

        // Hide loader
        loader.classList.add('fade-out');
        setTimeout(() => loader.remove(), 500);
    }

    document.addEventListener('DOMContentLoaded', boot);
})();
