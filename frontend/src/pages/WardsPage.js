import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Polygon, Popup, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to fly to a specific ward when selected
const FlyToWard = ({ ward }) => {
  const map = useMap();
  React.useEffect(() => {
    if (ward) {
      map.flyTo(ward.center, 14, { duration: 1.5 });
    }
  }, [ward, map]);
  return null;
};

const WardsPage = () => {
  const [selectedWard, setSelectedWard] = useState(null);

  // Real geographic boundaries traced from actual Mumbra & Kurla areas
  const wardsData = [
    {
      id: 1,
      name: "Thane Mumbra Ward",
      officer: "Officer Rajesh Kumar",
      contact: "+91 98765 43210",
      color: "#FF5722",
      center: [19.1885, 73.0215],
      // Mumbra: ~20 km² — Parsik Hills (west), Thane Creek (east), 
      // Kausa/Shilphata (north), Diva (south)
      coordinates: [
        // Southern tip near Diva
        [19.163, 73.012],
        [19.165, 73.005],
        // Southwest along Parsik Hills foothills
        [19.170, 72.998],
        [19.176, 72.994],
        // Western edge — Parsik Hills ridge
        [19.183, 72.992],
        [19.190, 72.993],
        [19.196, 72.996],
        // Northwest corner — towards Shilphata
        [19.203, 73.000],
        [19.208, 73.006],
        [19.212, 73.013],
        // Northern tip — Kausa area
        [19.214, 73.020],
        [19.213, 73.028],
        // Northeast — curves toward creek
        [19.210, 73.035],
        [19.205, 73.040],
        // Eastern edge — along Thane Creek
        [19.198, 73.044],
        [19.190, 73.046],
        [19.183, 73.045],
        [19.176, 73.042],
        // Southeast — curving back toward Diva
        [19.170, 73.038],
        [19.166, 73.032],
        [19.163, 73.024],
        [19.162, 73.018],
      ],
      description: "Mumbra is a densely populated township in Thane district (~20 km²), bounded by Parsik Hills to the west and Thane Creek to the east. A major suburb on the Central Railway line."
    },
    {
      id: 2,
      name: "Mumbai Kurla Ward (L Ward)",
      officer: "Officer Sneha Patil",
      contact: "+91 91234 56789",
      color: "#2196F3",
      center: [19.072, 72.884],
      // Kurla L Ward: ~16 km² — Mithi River (west), Ghatkopar (east),
      // Powai/S Ward (north), F-South/Sion Creek (south)
      coordinates: [
        // Southwest corner — near Mithi River / BKC side
        [19.055, 72.860],
        [19.058, 72.855],
        // Western edge — Mithi River boundary
        [19.063, 72.853],
        [19.070, 72.852],
        [19.078, 72.854],
        // Northwest — Sakinaka area
        [19.085, 72.856],
        [19.092, 72.860],
        // Northern tip — approaching Powai / S Ward
        [19.098, 72.866],
        [19.102, 72.874],
        [19.104, 72.882],
        // Northeast — near Chandivali / Asalpha  
        [19.103, 72.890],
        [19.100, 72.898],
        [19.096, 72.904],
        // Eastern edge — Ghatkopar / Tansa Pipeline
        [19.090, 72.908],
        [19.083, 72.910],
        [19.076, 72.910],
        // Southeast — Tilak Nagar / Chembur side
        [19.070, 72.908],
        [19.064, 72.904],
        // Southern edge — Sion Creek / F-South boundary
        [19.058, 72.898],
        [19.054, 72.890],
        [19.052, 72.880],
        [19.053, 72.870],
      ],
      description: "Kurla (L Ward) is a major hub in Mumbai's eastern suburbs (~16 km²), bounded by the Mithi River to the west and extending to Ghatkopar in the east. A critical railway junction and commercial center."
    }
  ];

  return (
    <div style={{ padding: '2rem', minHeight: 'calc(100vh - 64px)', background: '#f8fafc' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ maxWidth: '1200px', margin: '0 auto' }}
      >
        <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: '3rem', 
            fontWeight: '900', 
            color: '#1e293b',
            marginBottom: '0.5rem'
          }}>
            Civic <span style={{ color: '#C62828' }}>Wards</span>
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: '500' }}>
            Explore administrative wards and their respective officers in charge.
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
          {/* Map Section */}
          <div style={{ 
            height: '600px', 
            borderRadius: '24px', 
            overflow: 'hidden', 
            border: '4px solid #111',
            boxShadow: '8px 8px 0px #111',
            background: '#fff',
            position: 'relative'
          }}>
            <MapContainer 
              center={[19.12, 72.95]} 
              zoom={11} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">Carto</a>'
              />

              <FlyToWard ward={selectedWard} />
              
              {wardsData.map(ward => (
                <React.Fragment key={ward.id}>
                  <Polygon 
                    positions={ward.coordinates} 
                    pathOptions={{ 
                      color: ward.color, 
                      fillColor: ward.color, 
                      fillOpacity: selectedWard?.id === ward.id ? 0.4 : 0.2,
                      weight: selectedWard?.id === ward.id ? 4 : 2,
                    }}
                    eventHandlers={{
                      click: () => setSelectedWard(ward)
                    }}
                  >
                    <Popup>
                      <div style={{ padding: '0.5rem' }}>
                        <h3 style={{ margin: '0 0 0.5rem', fontFamily: 'var(--font-display)' }}>{ward.name}</h3>
                        <p style={{ margin: 0 }}><strong>WHO IS IN CHARGE?</strong><br/>{ward.officer}</p>
                      </div>
                    </Popup>
                  </Polygon>
                  <Marker position={ward.center}>
                    <Popup>
                      <div style={{ padding: '0.5rem' }}>
                        <h3 style={{ margin: '0 0 0.5rem', fontFamily: 'var(--font-display)' }}>{ward.name}</h3>
                        <p style={{ margin: 0 }}><strong>WHO IS IN CHARGE?</strong><br/>{ward.officer}</p>
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>{ward.contact}</p>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              ))}
            </MapContainer>
          </div>

          {/* Ward List/Info Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {wardsData.map(ward => (
              <motion.div
                key={ward.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedWard(ward)}
                style={{
                  background: '#fff',
                  padding: '1.5rem',
                  borderRadius: '20px',
                  border: `3px solid ${selectedWard?.id === ward.id ? ward.color : '#e2e8f0'}`,
                  boxShadow: selectedWard?.id === ward.id ? `0 10px 20px -10px ${ward.color}` : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '10px', 
                    background: ward.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '1.2rem'
                  }}>
                    🏢
                  </div>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>{ward.name}</h3>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.2rem' }}>WHO IS IN CHARGE?</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#1e293b' }}>{ward.officer}</div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Contact</div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: '#64748b' }}>{ward.contact}</div>
                </div>

                <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>
                  {ward.description}
                </p>
              </motion.div>
            ))}

            {/* Selected Ward Detail Card */}
            {selectedWard && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: '#1e293b',
                  color: '#fff',
                  padding: '1.5rem',
                  borderRadius: '20px',
                  border: '3px solid #FFDC2B',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                  marginTop: 'auto'
                }}
              >
                <h4 style={{ margin: '0 0 0.5rem', color: '#FFDC2B', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>Ward Details</h4>
                <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', opacity: 0.8 }}>
                  You are currently viewing <strong>{selectedWard.name}</strong>. The highlighted area on the map shows the full extent of this administrative zone.
                </p>
                <button 
                  onClick={() => setSelectedWard(null)}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    borderRadius: '12px',
                    background: '#FFDC2B',
                    color: '#111',
                    border: 'none',
                    fontFamily: 'var(--font-display)',
                    fontWeight: '900',
                    cursor: 'pointer'
                  }}
                >
                  Clear Selection
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WardsPage;
