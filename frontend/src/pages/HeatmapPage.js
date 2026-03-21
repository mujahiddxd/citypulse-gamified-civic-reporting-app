import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import Select from 'react-select';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../utils/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const getIcon = (severity) => {
  let color = '#3b82f6'; // Blue
  if (severity === 'High') color = '#ef4444'; // Red
  else if (severity === 'Medium') color = '#eab308'; // Yellow
  else if (severity === 'Low') color = '#22c55e'; // Green

  const markerHtml = `
    <div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      display: block;
      position: relative;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid #111;
      box-shadow: 2px 2px 0px #111;
    ">
      <div style="
        width: 8px;
        height: 8px;
        background: white;
        border-radius: 50%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border: 2px solid #111;
      "></div>
    </div>
  `;

  return new L.divIcon({
    className: 'custom-leaflet-marker',
    html: markerHtml,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

// Heatmap layer component using leaflet.heat
const HeatmapLayer = ({ points, active }) => {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!window.L?.heatLayer) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
      script.onload = () => addHeatLayer();
      document.head.appendChild(script);
    } else {
      addHeatLayer();
    }

    function addHeatLayer() {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
      if (active && points.length > 0) {
        const heatData = points.map(p => [p.lat, p.lng, p.intensity || 0.5]);

        heatLayerRef.current = window.L.heatLayer(heatData, {
          radius: 35,
          blur: 25,
          maxZoom: 16,
          max: 1.0,
          gradient: { 0.2: '#22c55e', 0.5: '#eab308', 0.8: '#f97316', 1.0: '#ef4444' }
        }).addTo(map);
      }
    }

    return () => {
      if (heatLayerRef.current) map.removeLayer(heatLayerRef.current);
    };
  }, [map, points, active]);

  return null;
};

const MapController = ({ viewState }) => {
  const map = useMap();
  useEffect(() => {
    if (viewState?.lat && viewState?.lng) {
      map.flyTo([viewState.lat, viewState.lng], viewState.zoom || 14);
    }
  }, [viewState, map]);
  return null;
};

const HeatmapPage = () => {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ type: '', severity: '', from: '', to: '' });
  const [viewMode, setViewMode] = useState('heatmap'); // 'heatmap' | 'markers' | 'sectors'
  const [mapCenter, setMapCenter] = useState({ lat: 19.076, lng: 72.877, zoom: 12 });
  const [currentAqi, setCurrentAqi] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Checkbox severity filters (all on by default)
  const [severityFilters, setSeverityFilters] = useState({ High: true, Medium: true, Low: true });
  const toggleSeverity = (sev) => setSeverityFilters(p => ({ ...p, [sev]: !p[sev] }));

  // For the search bar
  const [selectedArea, setSelectedArea] = useState(null);

  useEffect(() => {
    const fetchAqi = async () => {
      try {
        const aqiRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${mapCenter.lat}&longitude=${mapCenter.lng}&current=us_aqi`);
        const aqiData = await aqiRes.json();
        if (aqiData.current && aqiData.current.us_aqi !== undefined) {
          setCurrentAqi(Math.round(aqiData.current.us_aqi));
        } else {
          setCurrentAqi(null);
        }
      } catch (err) {
        console.error('Failed to fetch AQI', err);
        setCurrentAqi(null);
      }
    };
    fetchAqi();
  }, [mapCenter.lat, mapCenter.lng]);



  const fetchHeatmap = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.type) params.append('type', filters.type);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);

      const { data } = await api.get(`/heatmap?${params}`);
      setPoints(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHeatmap(); }, []);

  // Compute analytics
  const analytics = useMemo(() => {
    if (points.length === 0) return { cityScore: 10.0, sectors: [], areaOptions: [] };

    let totalDeductions = 0;
    const areas = {};

    points.forEach(p => {
      const deduction = p.severity === 'High' ? 1.0 : (p.severity === 'Medium' ? 0.5 : 0.2);
      totalDeductions += deduction;

      const areaName = p.area_name || 'Unknown Area';
      if (!areas[areaName]) {
        areas[areaName] = {
          name: areaName,
          deduction: 0,
          count: 0,
          lat: p.lat,
          lng: p.lng,
          garbage: 0,
          crowd: 0
        };
      }
      areas[areaName].deduction += deduction;
      areas[areaName].count += 1;

      if (p.type === 'Garbage') areas[areaName].garbage++;
      if (p.type === 'Crowd Management') areas[areaName].crowd++;
    });

    const averageDeduction = totalDeductions / Math.max(1, (points.length * 0.5));
    let cityScore = 10.0 - (averageDeduction * 4);
    if (cityScore < 1.0) cityScore = 1.0;
    if (cityScore > 10.0) cityScore = 10.0;

    const sectors = Object.values(areas).map(a => {
      let base = 10.0;
      let dirtyScore = base - (a.deduction * 1.5);
      if (dirtyScore < 0.1) dirtyScore = 0.1;

      return {
        ...a,
        score: dirtyScore.toFixed(1),
        isCritical: dirtyScore < 5.0
      };
    });

    sectors.sort((a, b) => parseFloat(a.score) - parseFloat(b.score));

    const areaOptions = sectors.map(s => ({ value: s.name, label: `${s.name.split(',')[0] || s.name}`, ...s }));

    return {
      cityScore: cityScore.toFixed(1),
      sectors: sectors.slice(0, 3),
      areaOptions
    };
  }, [points]);

  // Derive visible points by filtering based on severity checkboxes
  const visiblePoints = points.filter(p => severityFilters[p.severity] !== false);

  const handleSelectArea = (option) => {
    setSelectedArea(option);
    if (option) {
      setMapCenter({ lat: option.lat, lng: option.lng, zoom: 15 });
    } else {
      setMapCenter({ lat: 19.076, lng: 72.877, zoom: 12 });
    }
  };

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      background: '#fff',
      border: '2px solid #111',
      borderRadius: '8px',
      boxShadow: '2px 2px 0px #111',
      fontFamily: 'var(--font-display)',
      fontWeight: '600',
      minWidth: '220px',
      cursor: 'pointer'
    }),
    option: (base, state) => ({
      ...base,
      fontFamily: 'var(--font-display)',
      fontWeight: '600',
      backgroundColor: state.isFocused ? '#f0f9ff' : '#fff',
      color: '#111',
      cursor: 'pointer'
    })
  };

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>

      {/* Top Navigation / Control Bar */}
      <div style={{ background: '#fff', borderBottom: '3px solid #111', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', zIndex: 1001, boxShadow: '0px 4px 10px rgba(0,0,0,0.05)' }}>

        {/* Toggle View Mode */}
        <div style={{ display: 'flex', border: '3px solid #111', borderRadius: '40px', overflow: 'hidden', boxShadow: '2px 2px 0px #111', marginRight: '1rem' }}>
          <button
            onClick={() => setViewMode('heatmap')}
            style={{
              backgroundColor: viewMode === 'heatmap' ? '#FFDC2B' : '#fff',
              color: '#111', border: 'none', padding: '0.6rem 1.2rem', fontFamily: 'var(--font-display)', fontWeight: '900', cursor: 'pointer', transition: '0.2s'
            }}
          >
            🔥 HEATMAP
          </button>
          <div style={{ width: '3px', background: '#111' }}></div>
          <button
            onClick={() => setViewMode('markers')}
            style={{
              backgroundColor: viewMode === 'markers' ? '#FFDC2B' : '#fff',
              color: '#111', border: 'none', padding: '0.6rem 1.2rem', fontFamily: 'var(--font-display)', fontWeight: '900', cursor: 'pointer', transition: '0.2s'
            }}
          >
            📍 MARKERS
          </button>
          <div style={{ width: '3px', background: '#111' }}></div>
          <button
            onClick={() => setViewMode('sectors')}
            style={{
              backgroundColor: viewMode === 'sectors' ? '#FFDC2B' : '#fff',
              color: '#111', border: 'none', padding: '0.6rem 1.2rem', fontFamily: 'var(--font-display)', fontWeight: '900', cursor: 'pointer', transition: '0.2s'
            }}
          >
            🗺️ ZONES
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ flex: 1, maxWidth: '400px' }}>
          <Select
            options={analytics.areaOptions}
            styles={customSelectStyles}
            placeholder="Search Sector..."
            isClearable
            value={selectedArea}
            onChange={handleSelectArea}
          />
        </div>

        <div style={{ width: '2px', height: '30px', background: '#111', margin: '0 0.5rem' }}></div>

        <select className="form-select" value={filters.type} onChange={e => setFilters(p => ({ ...p, type: e.target.value }))} style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
          <option value="">All Types</option>
          <option value="Garbage">🗑️ Garbage</option>
          <option value="Crowd Management">👥 Crowd</option>
        </select>

        <button className="btn btn-primary btn-sm" onClick={fetchHeatmap} disabled={loading} style={{ marginLeft: 'auto' }}>
          {loading ? '...' : '🔍 Refresh'}
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'flex' }}>

        {/* Left Filter Sidebar */}
        <div style={{
          width: sidebarOpen ? '230px' : '0',
          minWidth: sidebarOpen ? '230px' : '0',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          background: '#fff',
          borderRight: '2px solid #e2e8f0',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
          {sidebarOpen && (
            <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Filter by Severity */}
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                  Filter by Severity
                </div>
                {[
                  { key: 'High', color: '#ef4444', label: 'High Risk (Red)' },
                  { key: 'Medium', color: '#f97316', label: 'Medium Risk (Orange)' },
                  { key: 'Low', color: '#22c55e', label: 'Low Risk (Green)' },
                ].map(({ key, color, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={severityFilters[key]}
                      onChange={() => toggleSeverity(key)}
                      style={{ width: '16px', height: '16px', accentColor: color, cursor: 'pointer' }}
                    />
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }}></span>
                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>{label}</span>
                  </label>
                ))}
              </div>

              <div style={{ height: '1px', background: '#e2e8f0' }} />

              {/* Quick Actions */}
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                  Quick Actions
                </div>
                {[
                  {
                    icon: '📍', label: 'Show All Locations', onClick: () => {
                      setSeverityFilters({ High: true, Medium: true, Low: true });
                      setMapCenter({ lat: 19.076, lng: 72.877, zoom: 12 });
                      fetchHeatmap();
                    }
                  },
                  {
                    icon: '🏙️', label: 'Center on Mumbai', onClick: () => {
                      setMapCenter({ lat: 19.076, lng: 72.877, zoom: 12 });
                    }
                  },
                  {
                    icon: '🎯', label: 'My Location', onClick: () => {
                      if (!navigator.geolocation) return;
                      navigator.geolocation.getCurrentPosition((pos) => {
                        setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 15 });
                      });
                    }
                  },
                ].map(({ icon, label, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      width: '100%', padding: '0.6rem 0.75rem', marginBottom: '6px',
                      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
                      cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: '600', fontSize: '0.88rem',
                      color: '#374151', transition: 'all 0.15s', textAlign: 'left',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                  >
                    <span>{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarOpen(p => !p)}
            style={{
              position: 'absolute', right: '-16px', top: '50%', transform: 'translateY(-50%)',
              width: '28px', height: '52px', background: '#fff', border: '2px solid #e2e8f0',
              borderRadius: '0 10px 10px 0', cursor: 'pointer', zIndex: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', color: '#94a3b8', boxShadow: '3px 0 8px rgba(0,0,0,0.06)'
            }}
          >
            {sidebarOpen ? '‹' : '›'}
          </button>
        </div>

        {/* The Map */}
        <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          <MapContainer center={[19.076, 72.877]} zoom={12} style={{ height: '100%', width: '100%' }}>
            {/* Whitish clean map theme requested by user */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">Carto</a>'
            />

            <MapController viewState={mapCenter} />
            <HeatmapLayer points={visiblePoints} active={viewMode === 'heatmap'} />

            <AnimatePresence>
              {viewMode === 'markers' && visiblePoints.map((p, idx) => (
                <Marker key={idx} position={[p.lat, p.lng]} icon={getIcon(p.severity)}>
                  <Popup className="custom-popup" style={{ minWidth: '200px' }}>
                    <div style={{ fontFamily: 'var(--font-display)', color: '#111', padding: '0.5rem' }}>
                      <strong style={{ fontSize: '1.2rem', display: 'block', marginBottom: '8px' }}>{p.area_name || 'Report'}</strong>
                      <span style={{
                        display: 'inline-block', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '900', color: '#fff',
                        background: p.severity === 'High' ? '#ef4444' : p.severity === 'Medium' ? '#eab308' : '#22c55e'
                      }}>
                        {p.severity.toUpperCase()}
                      </span>
                      <p style={{ margin: '12px 0 0 0', fontSize: '1.0rem', color: '#444' }}>{p.type}</p>

                      {p.image_url && (
                        <div style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #e2e8f0' }}>
                          <img src={p.image_url} alt="Garbage area" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '150px', objectFit: 'cover' }} />
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {viewMode === 'sectors' && analytics.sectors.map((sector, idx) => (
                <Marker key={`sec-${idx}`} position={[sector.lat, sector.lng]} icon={getIcon(sector.isCritical ? 'High' : (sector.score < 8 ? 'Medium' : 'Low'))}>
                  <Popup className="custom-popup" style={{ minWidth: '240px' }}>
                    <div style={{ fontFamily: 'var(--font-display)', color: '#111', padding: '0.5rem' }}>
                      <strong style={{ fontSize: '1.2rem', display: 'block', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>{sector.name.split(',')[0]}</strong>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: '900', color: sector.isCritical ? '#ef4444' : sector.score < 8 ? '#eab308' : '#22c55e' }}>
                          {(parseFloat(sector.score) * 10).toFixed(0)}%
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Cleanliness Index</span>
                      </div>

                      <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '4px' }}>{sector.name.split(',')[0]}</strong>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: '#fff', marginBottom: '16px',
                        background: sector.isCritical ? '#ef4444' : sector.score < 8 ? '#eab308' : '#22c55e'
                      }}>
                        {sector.isCritical ? 'CRITICAL' : sector.score < 8 ? 'MODERATE' : 'CLEAN'}
                      </span>

                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700' }}>Cleanliness Index:</span>
                          <span style={{ color: '#444' }}>{sector.score}/10</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                          <span style={{ fontWeight: '700' }}>Complaints:</span>
                          <span style={{ color: '#444' }}>{sector.count} active</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: '#475569', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Garbage Reports</span>
                          <strong style={{ color: '#111' }}>{sector.garbage}/10</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Crowd Reports</span>
                          <strong style={{ color: '#111' }}>{sector.crowd}/10</strong>
                        </div>
                      </div>

                    </div>
                  </Popup>
                </Marker>
              ))}
            </AnimatePresence>
          </MapContainer>
        </div>

        {/* Analytics Sidebar */}
        <div style={{
          width: '380px', background: '#F8FAFC', borderLeft: '3px solid #111',
          display: 'flex', flexDirection: 'column', zIndex: 10, overflowY: 'auto'
        }}>
          {/* Header */}
          <div style={{ padding: '2rem 1.5rem', background: '#fff', borderBottom: '2px solid #e2e8f0' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: '900', color: '#0f172a', margin: 0, lineHeight: 1 }}>
              Mumbai
            </h2>
            <p style={{ margin: '0.5rem 0 0', color: '#64748b', fontSize: '0.95rem', fontWeight: '600' }}>
              Cleanliness Analytics
            </p>
          </div>

          {/* Main Health Card */}
          <div style={{ padding: '1.5rem' }}>
            <div style={{
              background: '#fff', borderRadius: '16px', padding: '1.5rem',
              boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                CITY HEALTH INDEX
              </div>
              <div style={{
                fontSize: '3.5rem', fontWeight: '900', fontFamily: 'var(--font-display)', lineHeight: 1,
                color: analytics.cityScore >= 7.0 ? '#22c55e' : analytics.cityScore >= 4.0 ? '#eab308' : '#ef4444'
              }}>
                {analytics.cityScore}<span style={{ fontSize: '2rem', color: '#cbd5e1' }}>/10</span>
              </div>
            </div>

            {/* AQI Card directly below it */}
            <div style={{
              background: '#fff', borderRadius: '16px', padding: '1.25rem', marginTop: '1rem',
              boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', textAlign: 'center',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em' }}>
                  CURRENT AQI
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>Air Quality Index</div>
              </div>
              <div style={{
                fontSize: '2.5rem', fontWeight: '900', fontFamily: 'var(--font-display)', lineHeight: 1,
                color: currentAqi === null ? '#cbd5e1' : currentAqi <= 50 ? '#16a34a' : currentAqi <= 100 ? '#eab308' : currentAqi <= 150 ? '#f97316' : '#ef4444'
              }}>
                {currentAqi !== null ? currentAqi : '--'}
              </div>
            </div>

            {/* Critical Sectors */}
            <div style={{ marginTop: '2.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#ef4444', letterSpacing: '0.05em', marginBottom: '1rem', textTransform: 'uppercase' }}>
                Critical Sectors
              </div>

              {analytics.sectors.length === 0 && (
                <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
                  No data available in this view.
                </div>
              )}

              {analytics.sectors.map((sector, i) => (
                <div key={i} style={{
                  background: '#fff', borderRadius: '12px', padding: '1.25rem', marginBottom: '0.75rem',
                  borderLeft: `4px solid ${sector.isCritical ? '#ef4444' : '#f59e0b'}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)', position: 'relative'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>
                        {sector.name.split(',')[0]}
                      </h4>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Dirty Score</div>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: sector.isCritical ? '#ef4444' : '#f59e0b' }}>
                      {sector.score}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '600' }}>
                {points.length} ACTIVE REPORTS
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HeatmapPage;
