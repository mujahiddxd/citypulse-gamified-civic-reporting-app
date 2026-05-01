import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import GarbageAIChecker from '../components/GarbageAIChecker';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({ click(e) { onLocationSelect(e.latlng); } });
  return null;
};

const MUNICIPALITY_MAP = {
  'Thane': 'Thane Municipal Corporation (TMC)',
  'Mumbai': 'Brihanmumbai Municipal Corporation (BMC)',
  'Mumbai City': 'Brihanmumbai Municipal Corporation (BMC)',
  'Mumbai Suburban': 'Brihanmumbai Municipal Corporation (BMC)',
  'Andheri': 'Brihanmumbai Municipal Corporation (BMC)',
  'Bandra': 'Brihanmumbai Municipal Corporation (BMC)',
  'Navi Mumbai': 'Navi Mumbai Municipal Corporation (NMMC)',
  'Kalyan': 'Kalyan-Dombivli Municipal Corporation (KDMC)',
  'Dombivli': 'Kalyan-Dombivli Municipal Corporation (KDMC)',
  'Dombivli City': 'Kalyan-Dombivli Municipal Corporation (KDMC)',
  'Ulhasnagar': 'Ulhasnagar Municipal Corporation (UMC)',
  'Bhiwandi': 'Bhiwandi-Nizampur Municipal Corporation (BNMC)',
  'Mira-Bhayandar': 'Mira-Bhayandar Municipal Corporation (MBMC)',
  'Pune': 'Pune Municipal Corporation (PMC)',
  'Pimpri-Chinchwad': 'Pimpri-Chinchwad Municipal Corporation (PCMC)',
  'Bengaluru': 'Bruhat Bengaluru Mahanagara Palike (BBMP)',
  'Bangalore': 'Bruhat Bengaluru Mahanagara Palike (BBMP)',
  'New Delhi': 'Municipal Corporation of Delhi (MCD)',
  'Delhi': 'Municipal Corporation of Delhi (MCD)',
  'Chennai': 'Greater Chennai Corporation (GCC)',
  'Hyderabad': 'Greater Hyderabad Municipal Corporation (GHMC)',
  'Ahmedabad': 'Ahmedabad Municipal Corporation (AMC)',
  'Kolkata': 'Kolkata Municipal Corporation (KMC)',
  'Surat': 'Surat Municipal Corporation (SMC)',
  'Lucknow': 'Lucknow Municipal Corporation (LMC)',
  'Kanpur': 'Kanpur Municipal Corporation (KMC)',
  'Nagpur': 'Nagpur Municipal Corporation (NMC)',
  'Indore': 'Indore Municipal Corporation (IMC)',
  'Thiruvananthapuram': 'Thiruvananthapuram Corporation',
};

const SubmitComplaint = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    type: 'Garbage', description: '', severity: 'Medium',
    area_name: '', additional_info: '', is_anonymous: false,
    municipality: '',
  });
  const [position, setPosition] = useState(null);
  const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [success, setSuccess] = useState(false);

  const [areaScore, setAreaScore] = useState(null);
  const [fetchingLevel, setFetchingLevel] = useState(false);

  React.useEffect(() => {
    if (session?.access_token) localStorage.setItem('access_token', session.access_token);
  }, [session]);

  const detectMunicipality = (city, district, state) => {
    if (!city && !district) return 'Unknown Municipal Body';
    
    // 1. Check direct mapping for city/suburb
    if (MUNICIPALITY_MAP[city]) return MUNICIPALITY_MAP[city];
    
    // 2. Check direct mapping for district
    if (MUNICIPALITY_MAP[district]) return MUNICIPALITY_MAP[district];
    
    // 3. Fuzzy match / Search within names
    const searchString = `${city} ${district}`.toLowerCase();
    
    if (searchString.includes('mumbai')) return 'Brihanmumbai Municipal Corporation (BMC)';
    if (searchString.includes('thane')) return 'Thane Municipal Corporation (TMC)';
    if (searchString.includes('kalyan') || searchString.includes('dombivli')) return 'Kalyan-Dombivli Municipal Corporation (KDMC)';
    if (searchString.includes('pune')) return 'Pune Municipal Corporation (PMC)';
    if (searchString.includes('bangalore') || searchString.includes('bengaluru')) return 'Bruhat Bengaluru Mahanagara Palike (BBMP)';
    if (searchString.includes('delhi')) return 'Municipal Corporation of Delhi (MCD)';
    
    return `${city || district || 'Local'} Municipal Body`;
  };

  const fetchAreaDetails = async (lat, lng) => {
    setFetchingLevel(true);
    try {
      // 1. Reverse Geocode via Nominatim
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`);
      const data = await res.json();

      const address = data.address || {};
      const suburb = address.suburb || address.neighbourhood || address.residential || '';
      const town = address.city || address.town || address.village || '';
      
      // Combine suburb and town for a more specific area name
      let areaName = 'Unknown Area';
      if (suburb && town && suburb !== town) {
        areaName = `${suburb}, ${town}`;
      } else {
        areaName = town || suburb || 'Unknown Area';
      }

      const district = address.state_district || address.county || '';
      const state = address.state || '';

      const municipality = detectMunicipality(town || suburb, district, state);

      // Update form
      setForm(p => ({ ...p, area_name: areaName, municipality: municipality }));
      if (errors.area_name) setErrors(p => ({ ...p, area_name: '' }));

      // Update manual inputs if they are empty
      setManualCoords({ lat: lat.toString(), lng: lng.toString() });

      // Fetch AQI from Open-Meteo
      let currentAqi = null;
      try {
        const aqiRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi`);
        const aqiData = await aqiRes.json();
        if (aqiData.current && aqiData.current.us_aqi !== undefined) {
          currentAqi = Math.round(aqiData.current.us_aqi);
        }
      } catch (err) {
        console.error('Failed to fetch AQI', err);
      }

      if (city !== 'Unknown Area') {
        const scoreRes = await api.get(`/complaints/area-score?area=${encodeURIComponent(city)}`);
        setAreaScore({ ...scoreRes.data, aqi: currentAqi });
      } else {
        setAreaScore(currentAqi !== null ? { score: 'N/A', garbageCount: 0, aqi: currentAqi } : null);
      }

    } catch (err) {
      console.error('Failed to reverse geocode', err);
    } finally {
      setFetchingLevel(false);
    }
  };

  const handleLocationSelect = useCallback((latlng) => {
    setPosition(latlng);
    setManualCoords({ lat: latlng.lat.toFixed(6), lng: latlng.lng.toFixed(6) });
    if (errors.location) setErrors(p => ({ ...p, location: '' }));
    fetchAreaDetails(latlng.lat, latlng.lng);
  }, [errors.location]);

  const applyManualCoords = () => {
    const lat = parseFloat(manualCoords.lat);
    const lng = parseFloat(manualCoords.lng);
    if (isNaN(lat) || isNaN(lng)) {
      alert('Please enter valid numerical coordinates');
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Coordinates out of range');
      return;
    }
    const loc = { lat, lng };
    setPosition(loc);
    fetchAreaDetails(lat, lng);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported by your browser');
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(loc);
        setManualCoords({ lat: loc.lat.toFixed(6), lng: loc.lng.toFixed(6) });
        setLocLoading(false);
        fetchAreaDetails(loc.lat, loc.lng);
      },
      () => { alert('Could not get your location'); setLocLoading(false); }
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e = {};
    if (!form.description.trim() || form.description.trim().length < 10) e.description = 'Description must be at least 10 characters';
    if (!position) e.location = 'Please click on the map or enter coordinates';
    if (!form.area_name.trim()) e.area_name = 'Enter the area name';
    // Mandatory photo for Garbage complaints
    if (form.type === 'Garbage' && !imageFile) e.image = '📸 A photo is required for Garbage complaints';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');

    try {
      // Submit WITHOUT image first — image upload is bonus only
      let image_url = null;

      if (imageFile) {
        try {
          const { data: uploadData } = await api.post('/complaints/upload-image', {
            filename: imageFile.name, contentType: imageFile.type
          });
          await fetch(uploadData.uploadUrl, {
            method: 'PUT', body: imageFile,
            headers: { 'Content-Type': imageFile.type }
          });
          image_url = uploadData.publicUrl;
        } catch (imgErr) {
          console.warn('Image upload failed, submitting without image');
        }
      }

      await api.post('/complaints', {
        type: form.type,
        description: form.description.trim(),
        severity: form.severity,
        area_name: form.area_name.trim(),
        municipality: form.municipality,
        additional_info: form.additional_info.trim(),
        is_anonymous: form.is_anonymous,
        latitude: position.lat,
        longitude: position.lng,
        image_url,
        // AI verification metadata — stored for admin review
        ai_verified: aiResult?.verified ?? null,
        ai_confidence: aiResult?.confidence ?? null,
        ai_severity: aiResult?.severity ?? null,
        ai_user_override: aiResult?.userOverride ?? false,
        ai_mode: aiResult?.mode ?? null,
      });

      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.msg
        || err.response?.data?.error
        || err.message
        || 'Failed to submit. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', background: 'white', padding: '3rem', borderRadius: '16px', boxShadow: '0 8px 40px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
        <h2 style={{ color: '#1a1a1a', fontFamily: 'var(--font-display)', fontSize: '1.8rem', textTransform: 'uppercase' }}>Report Submitted!</h2>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>Redirecting to your dashboard...</p>
      </motion.div>
    </div>
  );

  return (
    <div className="page" style={{ maxWidth: '1100px' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: '900', textTransform: 'uppercase', color: '#1a1a1a' }}>
          📍 Submit a <span style={{ color: 'var(--red-600)' }}>Report</span>
        </h1>
        <p style={{ color: '#666', marginTop: '0.25rem' }}>Fill in the details and pin the location on the map.</p>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B', padding: '0.875rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
          ⚠️ {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-2" style={{ gap: '1.5rem' }}>
          {/* LEFT: Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* AREA QUALITY SCORE CARD */}
            {fetchingLevel ? (
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Scanning area...
              </div>
            ) : areaScore && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                style={{ background: '#F8FAFC', border: '2px solid #111', borderRadius: '12px', padding: '1.25rem', boxShadow: '2px 2px 0px #111' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Responsible Body</h3>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 1rem', background: '#FEE2E2', border: '1px solid #FECACA',
                      borderRadius: '8px', color: '#B91C1C', fontWeight: '900', fontSize: '0.95rem',
                      fontFamily: 'var(--font-display)', marginBottom: '1rem',
                      boxShadow: '0 2px 8px rgba(185, 28, 28, 0.1)'
                    }}>
                      🏛️ {form.municipality || 'Detecting Area...'}
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>Current Location</h3>
                    <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#111', fontFamily: 'var(--font-display)' }}>
                      {form.area_name}
                    </div>
                  </div>
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '50%', border: '4px solid #111',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: areaScore.score >= 4 ? '#86efac' : areaScore.score >= 2.5 ? '#fde047' : '#fca5a5',
                    fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: '900', color: '#111', boxShadow: '2px 2px 0px #111'
                  }}>
                    {areaScore.score}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #e2e8f0' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '800' }}>Garbage Reports</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>{areaScore.garbageCount}</div>
                  </div>
                  {areaScore.aqi !== undefined && areaScore.aqi !== null && (
                    <>
                      <div style={{ width: '2px', background: '#e2e8f0' }}></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '800' }}>Current AQI</div>
                        <div style={{
                          fontSize: '1.1rem', fontWeight: '900',
                          color: areaScore.aqi <= 50 ? '#16a34a' : areaScore.aqi <= 100 ? '#ca8a04' : areaScore.aqi <= 150 ? '#ea580c' : '#dc2626'
                        }}>
                          {areaScore.aqi}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem', color: '#6b7280' }}>Report Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#374151' }}>Complaint Type</label>
                  <select className="form-select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    style={{ background: 'white', borderColor: '#d1d5db', color: '#111' }}>
                    <option value="Garbage">🗑️ Garbage</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#374151' }}>Severity</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['Low', 'Medium', 'High'].map(s => (
                      <button key={s} type="button"
                        onClick={() => setForm(p => ({ ...p, severity: s }))}
                        style={{
                          flex: 1, padding: '0.5rem', borderRadius: '6px', border: '2px solid',
                          borderColor: form.severity === s ? (s === 'High' ? '#DC2626' : s === 'Medium' ? '#D97706' : '#16A34A') : '#e5e7eb',
                          background: form.severity === s ? (s === 'High' ? '#FEE2E2' : s === 'Medium' ? '#FEF3C7' : '#DCFCE7') : 'white',
                          color: form.severity === s ? (s === 'High' ? '#991B1B' : s === 'Medium' ? '#92400E' : '#166534') : '#6b7280',
                          fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '0.8rem',
                          textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        {s === 'Low' ? '🟢' : s === 'Medium' ? '🟡' : '🔴'} {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#374151' }}>Area Name *</label>
                  <input className="form-input" value={form.area_name}
                    onChange={e => setForm(p => ({ ...p, area_name: e.target.value }))}
                    placeholder="e.g. Sector 12, MG Road, Andheri West"
                    style={{ background: 'white', borderColor: errors.area_name ? '#DC2626' : '#d1d5db', color: '#111' }} />
                  {errors.area_name && <span style={{ color: '#DC2626', fontSize: '0.78rem' }}>{errors.area_name}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#374151' }}>Description *</label>
                  <textarea className="form-textarea" value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Describe what you see — type of garbage, how much, how long it's been there..."
                    rows={4}
                    style={{ background: 'white', borderColor: errors.description ? '#DC2626' : '#d1d5db', color: '#111' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {errors.description && <span style={{ color: '#DC2626', fontSize: '0.78rem' }}>{errors.description}</span>}
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: 'auto' }}>{form.description.length}/1000</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#374151' }}>Additional Info <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                  <textarea className="form-textarea" value={form.additional_info}
                    onChange={e => setForm(p => ({ ...p, additional_info: e.target.value }))}
                    rows={2} placeholder="Any extra context..."
                    style={{ background: 'white', borderColor: '#d1d5db', color: '#111' }} />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: '#374151' }}>
                    Photo
                    {form.type === 'Garbage' ? (
                      <span style={{ color: '#dc2626', fontWeight: '700' }}> (required for Garbage)</span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontWeight: 400 }}> (optional, max 5MB)</span>
                    )}
                  </label>
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} id="image-upload" />
                  <label htmlFor="image-upload" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    padding: '0.75rem', border: `2px dashed ${errors.image ? '#dc2626' : '#d1d5db'}`, borderRadius: '8px',
                    cursor: 'pointer', color: errors.image ? '#dc2626' : '#6b7280', fontSize: '0.9rem',
                    background: '#f9fafb', transition: 'border-color 0.2s',
                  }}>
                    📸 {imageFile ? imageFile.name : 'Click to choose a photo'}
                  </label>
                  {errors.image && (
                    <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.82rem', marginTop: '0.4rem' }}>
                      ⚠️ {errors.image}
                    </div>
                  )}
                  {imagePreview && (
                    <motion.img src={imagePreview} alt="Preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '8px', marginTop: '0.5rem' }} />
                  )}

                  {/* AI Garbage Photo Checker — appears after image upload */}
                  {imageFile && imagePreview && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <GarbageAIChecker
                        imageFile={imageFile}
                        imagePreview={imagePreview}
                        onResult={(result) => setAiResult(result)}
                      />
                    </div>
                  )}
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#374151', fontSize: '0.9rem' }}>
                  <input type="checkbox" checked={form.is_anonymous} onChange={e => setForm(p => ({ ...p, is_anonymous: e.target.checked }))} />
                  Submit anonymously
                </label>
              </div>
            </div>
          </div>

          {/* RIGHT: Map & Coordinates */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280' }}>
                  📍 Pin Location *
                </h3>
                <button type="button" onClick={useMyLocation} disabled={locLoading}
                  style={{
                    padding: '0.4rem 0.875rem', borderRadius: '6px', border: '1px solid #d1d5db',
                    background: 'white', color: '#374151', fontSize: '0.8rem', cursor: 'pointer',
                    fontFamily: 'var(--font-display)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                  {locLoading ? '...' : '📡 Use My Location'}
                </button>
              </div>

              {/* Manual Lat/Long Input */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '800', display: 'block', marginBottom: '2px' }}>Latitude</label>
                  <input type="text" value={manualCoords.lat} onChange={e => setManualCoords(p => ({ ...p, lat: e.target.value }))}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} placeholder="19.0760" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '800', display: 'block', marginBottom: '2px' }}>Longitude</label>
                  <input type="text" value={manualCoords.lng} onChange={e => setManualCoords(p => ({ ...p, lng: e.target.value }))}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} placeholder="72.8777" />
                </div>
                <button type="button" onClick={applyManualCoords}
                  style={{ alignSelf: 'flex-end', padding: '0.45rem 0.75rem', borderRadius: '4px', background: '#1e293b', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800' }}>
                  APPLY
                </button>
              </div>

              {errors.location && (
                <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                  ⚠️ {errors.location}
                </div>
              )}

              <p style={{ fontSize: '0.82rem', color: '#9ca3af', marginBottom: '0.75rem' }}>
                Click anywhere on the map or enter coordinates above
              </p>

              <div style={{ borderRadius: '8px', overflow: 'hidden', border: '2px solid', borderColor: errors.location ? '#DC2626' : '#e5e7eb' }}>
                <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '380px', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                  <MapClickHandler onLocationSelect={handleLocationSelect} />
                  {position && (
                    <Marker position={position} icon={redIcon} draggable={true}
                      eventHandlers={{
                        dragend: (e) => {
                          const latlng = e.target.getLatLng();
                          setPosition(latlng);
                          setManualCoords({ lat: latlng.lat.toFixed(6), lng: latlng.lng.toFixed(6) });
                          fetchAreaDetails(latlng.lat, latlng.lng);
                        }
                      }}>
                      <Popup>📍 Report here<br />Drag to adjust</Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>

              {position ? (
                <div style={{ marginTop: '0.75rem', padding: '0.625rem 0.875rem', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', fontSize: '0.8rem', color: '#166534', display: 'flex', gap: '1rem' }}>
                  ✅ Location selected &nbsp;|&nbsp; Lat: {position.lat.toFixed(5)} &nbsp;|&nbsp; Lng: {position.lng.toFixed(5)}
                </div>
              ) : (
                <div style={{ marginTop: '0.75rem', padding: '0.625rem 0.875rem', background: '#F9FAFB', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.8rem', color: '#9ca3af' }}>
                  No location selected yet
                </div>
              )}
            </div>

            {/* AI Warning Banner — shown when AI didn't detect garbage and user hasn't overridden */}
            {aiResult && aiResult.verified === false && !aiResult.userOverride && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '0.85rem 1rem',
                  background: '#fffbeb',
                  border: '2px solid #fde68a',
                  borderRadius: '10px',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>⚠️</span>
                <div style={{ fontSize: '0.82rem', color: '#92400e', lineHeight: 1.4 }}>
                  <strong>AI Warning:</strong> The photo wasn't identified as garbage. Please confirm via the AI panel above before submitting.
                </div>
              </motion.div>
            )}

            <button type="submit" disabled={loading || (aiResult?.verified === false && !aiResult?.userOverride)}
              style={{
                width: '100%', padding: '1rem', borderRadius: '10px', border: 'none',
                background: loading ? '#9ca3af'
                  : (aiResult?.verified === false && !aiResult?.userOverride) ? '#d1d5db'
                  : '#c62828',
                color: 'white',
                fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: '800',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                cursor: (loading || (aiResult?.verified === false && !aiResult?.userOverride)) ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(198,40,40,0.35)',
                transition: 'all 0.2s',
                opacity: (aiResult?.verified === false && !aiResult?.userOverride) ? 0.6 : 1,
              }}>
              {loading ? '⏳ Submitting Report...'
                : (aiResult?.verified === false && !aiResult?.userOverride)
                  ? '🔒 Confirm AI Override to Submit'
                  : '🚀 Submit Report'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SubmitComplaint;
