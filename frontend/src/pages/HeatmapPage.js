import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../utils/api';

// Heatmap layer component using leaflet.heat
const HeatmapLayer = ({ points }) => {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!window.L?.heatLayer) {
      // Dynamically load leaflet.heat
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
      if (points.length > 0) {
        const heatData = points.map(p => [p.lat, p.lng, p.intensity || 0.5]);
        heatLayerRef.current = window.L.heatLayer(heatData, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          max: 1.0,
          gradient: { 0.1: '#00ff00', 0.5: '#ffff00', 0.8: '#ff8800', 1.0: '#ff0000' }
        }).addTo(map);
      }
    }

    return () => {
      if (heatLayerRef.current) map.removeLayer(heatLayerRef.current);
    };
  }, [map, points]);

  return null;
};

const HeatmapPage = () => {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ type: '', severity: '', from: '', to: '' });

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

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header bar */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: '900', textTransform: 'uppercase', marginRight: '0.5rem' }}>
          🔥 Complaint <span style={{ color: 'var(--red-500)' }}>Heatmap</span>
        </h1>

        <select className="form-select" value={filters.type} onChange={e => setFilters(p => ({ ...p, type: e.target.value }))} style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
          <option value="">All Types</option>
          <option value="Garbage">Garbage</option>
          <option value="Crowd Management">Crowd Management</option>
        </select>

        <select className="form-select" value={filters.severity} onChange={e => setFilters(p => ({ ...p, severity: e.target.value }))} style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>
          <option value="">All Severity</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <input type="date" className="form-input" value={filters.from} onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} />
        <input type="date" className="form-input" value={filters.to} onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} />

        <button className="btn btn-primary btn-sm" onClick={fetchHeatmap} disabled={loading}>
          {loading ? '...' : '🔍 Apply'}
        </button>

        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {points.length} points
        </span>
      </div>

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', zIndex: 1000, background: 'rgba(17,17,17,0.9)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1rem', backdropFilter: 'blur(8px)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Density</div>
        {[['#00ff00', 'Low'], ['#ffff00', 'Medium'], ['#ff8800', 'High'], ['#ff0000', 'Critical']].map(([color, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Map */}
      <div style={{ flex: 1 }}>
        <MapContainer center={[19.076, 72.877]} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; CartoDB'
          />
          <HeatmapLayer points={points} />
        </MapContainer>
      </div>
    </div>
  );
};

export default HeatmapPage;
