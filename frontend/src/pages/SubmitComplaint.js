import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import MultiPhotoAIChecker from '../components/MultiPhotoAIChecker';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  iconUrl: 'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({ click(e) { onLocationSelect(e.latlng); } });
  return null;
};

const MapRecenter = ({ position }) => {
  const map = useMap();
  React.useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { animate: true, duration: 1.5 });
    }
  }, [position, map]);
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
  'Panvel': 'Panvel Municipal Corporation (PMC)',
  'New Panvel': 'Panvel Municipal Corporation (PMC)',
  'Kharghar': 'Navi Mumbai Municipal Corporation (NMMC)',
  'Vashi': 'Navi Mumbai Municipal Corporation (NMMC)',
  'Nerul': 'Navi Mumbai Municipal Corporation (NMMC)',
  'Kalyan': 'Kalyan-Dombivli Municipal Corporation (KDMC)',
  'Dombivli': 'Kalyan-Dombivli Municipal Corporation (KDMC)',
  'Dombivli City': 'Kalyan-Dombivli Municipal Corporation (KDMC)',
  'Ulhasnagar': 'Ulhasnagar Municipal Corporation (UMC)',
  'Bhiwandi': 'Bhiwandi-Nizampur Municipal Corporation (BNMC)',
  'Mira-Bhayandar': 'Mira-Bhayandar Municipal Corporation (MBMC)',
  'Vasai': 'Vasai-Virar Municipal Corporation (VVMC)',
  'Virar': 'Vasai-Virar Municipal Corporation (VVMC)',
  'Vasai-Virar': 'Vasai-Virar Municipal Corporation (VVMC)',
  'Ambernath': 'Ambernath Municipal Council',
  'Badlapur': 'Badlapur Municipal Council',
  'Mumbra': 'Thane Municipal Corporation (TMC)',
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    type: 'Garbage', description: '', severity: 'Medium',
    area_name: '', additional_info: '', is_anonymous: false,
    municipality: '',
  });
  const [position, setPosition] = useState(null);
  const [manualCoords, setManualCoords] = useState({ lat: '', lng: '' });
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [success, setSuccess] = useState(false);

  const [areaScore, setAreaScore] = useState(null);
  const [fetchingLevel, setFetchingLevel] = useState(false);



  const detectMunicipality = (city, district, state) => {
    if (!city && !district) return 'Unknown Municipal Body';
    
    // 1. Check direct mapping for city/suburb
    if (MUNICIPALITY_MAP[city]) return MUNICIPALITY_MAP[city];
    
    // 2. Check direct mapping for district
    if (MUNICIPALITY_MAP[district]) return MUNICIPALITY_MAP[district];
    
    // 3. Fuzzy match / Search within names
    const searchString = `${city} ${district}`.toLowerCase();
    
    if (searchString.includes('mumbai')) return 'Brihanmumbai Municipal Corporation (BMC)';
    if (searchString.includes('thane') || searchString.includes('mumbra')) return 'Thane Municipal Corporation (TMC)';
    if (searchString.includes('kalyan') || searchString.includes('dombivli')) return 'Kalyan-Dombivli Municipal Corporation (KDMC)';
    if (searchString.includes('panvel') || searchString.includes('kharghar') || searchString.includes('navi mumbai')) return 'Navi Mumbai Municipal Corporation (NMMC)';
    if (searchString.includes('vasai') || searchString.includes('virar')) return 'Vasai-Virar Municipal Corporation (VVMC)';
    if (searchString.includes('pune') || searchString.includes('pimpri')) return 'Pune Municipal Corporation (PMC)';
    if (searchString.includes('bangalore') || searchString.includes('bengaluru')) return 'Bruhat Bengaluru Mahanagara Palike (BBMP)';
    if (searchString.includes('delhi')) return 'Municipal Corporation of Delhi (MCD)';
    if (searchString.includes('chennai')) return 'Greater Chennai Corporation (GCC)';
    if (searchString.includes('hyderabad')) return 'Greater Hyderabad Municipal Corporation (GHMC)';
    
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

      if (areaName !== 'Unknown Area') {
        try {
          const searchArea = suburb || town || areaName;
          const scoreRes = await api.get(`/complaints/area-score?area=${encodeURIComponent(searchArea)}`);
          setAreaScore({ ...scoreRes.data, aqi: currentAqi });
        } catch (scoreErr) {
          console.error('Failed to fetch area score', scoreErr);
          setAreaScore({ score: 'N/A', garbageCount: 0, aqi: currentAqi });
        }
      } else {
        setAreaScore(currentAqi !== null ? { score: 'N/A', garbageCount: 0, aqi: currentAqi } : { score: 'N/A', garbageCount: 0, aqi: null });
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
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (imageFiles.length + files.length > 6) {
      alert('You can only upload up to 6 photos per report.');
      return;
    }

    const validFiles = [];
    const newPreviews = [];

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large (max 5MB)`);
        return;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    setImageFiles(prev => [...prev, ...validFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const e = {};
    if (!form.description.trim() || form.description.trim().length < 10) e.description = 'Description must be at least 10 characters';
    if (!position) e.location = 'Please click on the map or enter coordinates';
    if (!form.area_name.trim()) e.area_name = 'Enter the area name';
    // Mandatory photo for Garbage complaints — minimum 1 photo required
    if (form.type === 'Garbage' && imageFiles.length === 0) e.image = '📸 At least 1 photo is required for Garbage reports';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');

    try {
      // Upload ALL images to Supabase Storage
      const uploadedUrls = [];

      for (const file of imageFiles) {
        try {
          const { data: uploadData } = await api.post('/complaints/upload-image', {
            filename: file.name, contentType: file.type
          });
          await fetch(uploadData.uploadUrl, {
            method: 'PUT', body: file,
            headers: { 'Content-Type': file.type }
          });
          uploadedUrls.push(uploadData.publicUrl);
        } catch (imgErr) {
          console.warn(`Failed to upload ${file.name}`, imgErr);
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
        image_url: uploadedUrls[0] || null, // Keep for backward compatibility
        images: uploadedUrls,
        // AI verification metadata — stored for admin review
        ai_verified: aiResult?.verified ?? null,
        ai_confidence: aiResult?.confidence ?? null,
        ai_severity: aiResult?.severity ?? null,
        ai_user_override: aiResult?.userOverride ?? false,
        ai_mode: aiResult?.mode ?? null,
      });

      setSuccess(true);
      setTimeout(() => navigate(`/profile/${user.username}`), 3500);
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
    <div className="page" style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        minHeight: '80vh', background: '#f8fafc' 
    }}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        style={{ 
            textAlign: 'center', background: 'white', padding: '4rem', 
            borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
            maxWidth: '500px', width: '90%'
        }}
      >
        <div style={{ width: '220px', height: '220px', margin: '0 auto 2rem', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Custom Framer Motion 'Clean-Up' Animation */}
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ fontSize: '6rem', zIndex: 2 }}
          >
            🗑️
          </motion.div>

          {/* Scanning Beam */}
          <motion.div
            animate={{ top: ['10%', '90%', '10%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: 'absolute', left: '10%', right: '10%', height: '4px',
              background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
              boxShadow: '0 0 15px var(--accent)', zIndex: 3, borderRadius: '2px'
            }}
          />

          {/* Floating Sparkles */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0], 
                scale: [0, 1, 0],
                x: Math.random() * 160 - 80,
                y: Math.random() * 160 - 80
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                delay: i * 0.4,
                ease: "easeOut"
              }}
              style={{ position: 'absolute', fontSize: '1.5rem', zIndex: 1 }}
            >
              ✨
            </motion.div>
          ))}

          {/* Pulsing Glow */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{
              position: 'absolute', width: '150px', height: '150px',
              background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)',
              filter: 'blur(20px)', zIndex: 0, borderRadius: '50%'
            }}
          />
        </div>
        <h2 style={{ 
            color: '#111', fontFamily: 'var(--font-display)', 
            fontSize: '2.2rem', fontWeight: '900', textTransform: 'uppercase',
            marginBottom: '1rem', letterSpacing: '-0.02em'
        }}>
          Clean-Up Initiated!
        </h2>
        <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: '500', lineHeight: '1.6' }}>
          Thank you for being a responsible citizen. Your report has been dispatched to the municipal authorities for action.
        </p>
        <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--accent)', fontWeight: '800' }}>
           <span style={{ fontSize: '1.2rem' }}>💎</span> +10 Civic XP Earned
        </div>
        <motion.div 
          initial={{ width: 0 }} 
          animate={{ width: '100%' }} 
          transition={{ duration: 3.5 }}
          style={{ height: '4px', background: 'var(--accent)', marginTop: '2.5rem', borderRadius: '2px' }}
        />
      </motion.div>
    </div>
  );

  return (
    <div style={{ width: '100%', minHeight: 'calc(100vh - 65px)', background: '#f8fafc', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: '900', textTransform: 'uppercase', color: '#1a1a1a', margin: 0 }}>
            📍 Submit a <span style={{ color: 'var(--red-600)' }}>Report</span>
          </h1>
          <p style={{ color: '#666', marginTop: '0.25rem', fontSize: '1rem', margin: 0 }}>Pin the location on the map and fill in the details below.</p>
          
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.9rem', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
              ⚠️ {error}
            </motion.div>
          )}
        </motion.div>

        {/* 4-QUADRANT GRID */}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))', gap: '2rem', alignItems: 'start' }}>
          
          {/* ========================================== */}
          {/* QUADRANT 1: TOP LEFT - MAP                 */}
          {/* ========================================== */}
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', margin: 0 }}>
                📍 1. Pin Location *
              </h3>
              <button type="button" onClick={useMyLocation} disabled={locLoading}
                style={{
                  padding: '0.4rem 0.875rem', borderRadius: '6px', border: '1px solid #d1d5db',
                  background: '#f8fafc', color: '#374151', fontSize: '0.8rem', cursor: 'pointer',
                  fontFamily: 'var(--font-display)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseOut={e => e.currentTarget.style.background = '#f8fafc'}
              >
                {locLoading ? '...' : '📡 Use My Location'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
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
              <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}>⚠️ {errors.location}</div>
            )}

            <div style={{ borderRadius: '8px', overflow: 'hidden', border: '2px solid', borderColor: errors.location ? '#DC2626' : '#e5e7eb', flex: 1, minHeight: '350px' }}>
              <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                <MapClickHandler onLocationSelect={handleLocationSelect} />
                <MapRecenter position={position} />
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
              <div style={{ padding: '0.625rem 0.875rem', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', fontSize: '0.8rem', color: '#166534', textAlign: 'center', fontWeight: '600' }}>
                ✅ Location selected (Lat: {position.lat.toFixed(5)}, Lng: {position.lng.toFixed(5)})
              </div>
            ) : (
              <div style={{ padding: '0.625rem 0.875rem', background: '#F9FAFB', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center' }}>
                No location selected yet
              </div>
            )}
          </div>

          {/* ========================================== */}
          {/* QUADRANT 2: TOP RIGHT - DETAILS            */}
          {/* ========================================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            
            {/* AREA QUALITY SCORE CARD */}
            {fetchingLevel ? (
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                Scanning area...
              </div>
            ) : areaScore && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                style={{ background: 'white', border: '2px solid #111', borderRadius: '12px', padding: '1.25rem', boxShadow: '2px 2px 0px #111' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Responsible Body</h3>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.4rem 0.8rem', background: '#FEE2E2', border: '1px solid #FECACA',
                      borderRadius: '8px', color: '#B91C1C', fontWeight: '900', fontSize: '0.85rem',
                      fontFamily: 'var(--font-display)', marginBottom: '0.75rem',
                      boxShadow: '0 2px 8px rgba(185, 28, 28, 0.1)'
                    }}>
                      🏛️ {form.municipality || 'Detecting Area...'}
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>Current Location</h3>
                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#111', fontFamily: 'var(--font-display)' }}>
                      {form.area_name}
                    </div>
                  </div>
                  <div style={{
                    width: '50px', height: '50px', borderRadius: '50%', border: '3px solid #111',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: areaScore.score >= 4 ? '#86efac' : areaScore.score >= 2.5 ? '#fde047' : '#fca5a5',
                    fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: '900', color: '#111', boxShadow: '2px 2px 0px #111'
                  }}>
                    {areaScore.score}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #e2e8f0' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '800' }}>Garbage Reports</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#2563eb' }}>{areaScore.garbageCount}</div>
                  </div>
                  {areaScore.aqi !== undefined && areaScore.aqi !== null && (
                    <>
                      <div style={{ width: '2px', background: '#e2e8f0' }}></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: '800' }}>Current AQI</div>
                        <div style={{
                          fontSize: '1rem', fontWeight: '900',
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

            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', flex: 1 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem', color: '#6b7280' }}>
                📋 2. Report Details
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#374151' }}>Complaint Type</label>
                  <select className="form-select" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    style={{ background: '#f8fafc', borderColor: '#d1d5db', color: '#111' }}>
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
                          flex: 1, padding: '0.75rem 0.5rem', borderRadius: '8px', border: '2px solid',
                          borderColor: form.severity === s ? (s === 'High' ? '#DC2626' : s === 'Medium' ? '#D97706' : '#16A34A') : '#e5e7eb',
                          background: form.severity === s ? (s === 'High' ? '#FEE2E2' : s === 'Medium' ? '#FEF3C7' : '#DCFCE7') : '#f8fafc',
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
                    placeholder="e.g. Sector 12, MG Road"
                    style={{ background: '#f8fafc', borderColor: errors.area_name ? '#DC2626' : '#d1d5db', color: '#111' }} />
                  {errors.area_name && <span style={{ color: '#DC2626', fontSize: '0.78rem' }}>{errors.area_name}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* QUADRANT 3: BOTTOM LEFT - PHOTOS & AI      */}
          {/* ========================================== */}
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', height: '100%' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem', color: '#6b7280' }}>
              📸 3. Evidence & Analysis
            </h3>
            
            <div className="form-group">
              <label className="form-label" style={{ color: '#374151', display: 'flex', justifyContent: 'space-between' }}>
                <span>Photos <span style={{ color: '#dc2626', fontWeight: '700' }}> (Min 1, Max 6)</span></span>
                <span style={{ fontSize: '0.75rem', color: imageFiles.length >= 6 ? '#dc2626' : '#9ca3af' }}>{imageFiles.length}/6</span>
              </label>
              
              {imagePreviews.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                  {imagePreviews.map((src, idx) => (
                    <div key={idx} style={{ position: 'relative', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      <img src={src} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button type="button" onClick={() => removeImage(idx)}
                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ✕
                      </button>
                    </div>
                  ))}
                  {imageFiles.length < 6 && (
                    <label htmlFor="image-upload-multi" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '1.5rem', color: '#94a3b8', transition: 'border-color 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.borderColor = '#94a3b8'}
                      onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                    >
                      +
                    </label>
                  )}
                </div>
              )}

              <input type="file" multiple accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} id="image-upload-multi" />
              
              {imageFiles.length === 0 && (
                <label htmlFor="image-upload-multi" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '2rem 1.25rem', border: `2px dashed ${errors.image ? '#dc2626' : '#cbd5e1'}`, borderRadius: '8px',
                  cursor: 'pointer', color: errors.image ? '#dc2626' : '#64748b', fontSize: '0.95rem',
                  background: '#f8fafc', transition: 'all 0.2s', fontWeight: '500'
                }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#94a3b8'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                >
                  📸 Click to upload garbage photos (Min 1 required)
                </label>
              )}

              {errors.image && (
                <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', marginTop: '0.5rem' }}>⚠️ {errors.image}</div>
              )}

              {/* AI Multi-Photo Checker */}
              {imageFiles.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <MultiPhotoAIChecker imageFiles={imageFiles} imagePreviews={imagePreviews} onResult={(result) => setAiResult(result)} />
                </div>
              )}
            </div>
          </div>

          {/* ========================================== */}
          {/* QUADRANT 4: BOTTOM RIGHT - DESC & SUBMIT   */}
          {/* ========================================== */}
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem', color: '#6b7280' }}>
              ✍️ 4. Additional Context & Submit
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
              <div className="form-group">
                <label className="form-label" style={{ color: '#374151' }}>Description *</label>
                <textarea className="form-textarea" value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe what you see — type of garbage, how much, how long it's been there..."
                  rows={4}
                  style={{ background: '#f8fafc', borderColor: errors.description ? '#DC2626' : '#d1d5db', color: '#111' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                  {errors.description && <span style={{ color: '#DC2626', fontSize: '0.78rem' }}>{errors.description}</span>}
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: 'auto' }}>{form.description.length}/1000</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#374151' }}>Additional Info <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                <textarea className="form-textarea" value={form.additional_info}
                  onChange={e => setForm(p => ({ ...p, additional_info: e.target.value }))}
                  rows={2} placeholder="Any extra context..."
                  style={{ background: '#f8fafc', borderColor: '#d1d5db', color: '#111' }} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#374151', fontSize: '0.9rem', background: '#f8fafc', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <input type="checkbox" checked={form.is_anonymous} onChange={e => setForm(p => ({ ...p, is_anonymous: e.target.checked }))} style={{ width: '18px', height: '18px' }} />
                <strong>Submit anonymously</strong>
              </label>

              {/* Spacer to push submit button to bottom */}
              <div style={{ flex: 1 }}></div>

              {aiResult && aiResult.verified === false && !aiResult.userOverride && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  style={{ padding: '0.85rem 1rem', background: '#fffbeb', border: '2px solid #fde68a', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                  <div style={{ fontSize: '0.82rem', color: '#92400e', lineHeight: 1.4 }}>
                    <strong>AI Warning:</strong> The photo wasn't identified as garbage. Please confirm via the AI panel on the left before submitting.
                  </div>
                </motion.div>
              )}

              <button type="submit" disabled={loading || (aiResult?.verified === false && !aiResult?.userOverride)}
                style={{
                  width: '100%', padding: '1.25rem', borderRadius: '10px', border: 'none',
                  background: loading ? '#9ca3af' : (aiResult?.verified === false && !aiResult?.userOverride) ? '#d1d5db' : '#c62828',
                  color: 'white', fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em',
                  cursor: (loading || (aiResult?.verified === false && !aiResult?.userOverride)) ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 8px 25px rgba(198,40,40,0.35)', transition: 'all 0.2s',
                  opacity: (aiResult?.verified === false && !aiResult?.userOverride) ? 0.6 : 1,
                }}
                onMouseOver={e => !loading && !(aiResult?.verified === false && !aiResult?.userOverride) && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseOut={e => !loading && !(aiResult?.verified === false && !aiResult?.userOverride) && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {loading ? '⏳ Submitting Report...' : (aiResult?.verified === false && !aiResult?.userOverride) ? '🔒 Confirm AI Override to Submit' : '🚀 Submit Report'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default SubmitComplaint;
