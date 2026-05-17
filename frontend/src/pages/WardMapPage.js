import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../utils/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const FlyToWard = ({ ward }) => {
  const map = useMap();
  useEffect(() => { if (ward) map.flyTo(ward.center, 13, { duration: 1.2 }); }, [ward, map]);
  return null;
};

const COLORS_PIE = ['#ef4444','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#ec4899'];

const getWardColor = (level) => {
  if (level === 'high') return { fill: '#ef4444', border: '#b91c1c' };
  if (level === 'medium') return { fill: '#f59e0b', border: '#d97706' };
  return { fill: '#22c55e', border: '#16a34a' };
};

const WardMapPage = () => {
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState(null);
  const [wardStats, setWardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [exporting, setExporting] = useState('');
  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/wards/map');
        setWards(data.wards || []);
      } catch (e) { console.error('Failed to load wards', e); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleWardClick = useCallback(async (ward) => {
    setSelectedWard(ward);
    setPanelOpen(true);
    setStatsLoading(true);
    try {
      const { data } = await api.get(`/wards/${ward.id}/stats`);
      setWardStats(data);
    } catch (e) { console.error(e); }
    finally { setStatsLoading(false); }
  }, []);

  const exportCSV = useCallback(async () => {
    if (!selectedWard) return;
    setExporting('csv');
    try {
      const { data } = await api.get(`/wards/${selectedWard.id}/report`);
      const rows = [['ID','Type','Severity','Status','Area','Date']];
      (data.stats.complaints || []).forEach(c => {
        rows.push([c.id, c.type, c.severity, c.status, c.area_name, new Date(c.created_at).toLocaleDateString()]);
      });
      const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${data.ward.name}_Report.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    finally { setExporting(''); }
  }, [selectedWard]);

  const exportExcel = useCallback(async () => {
    if (!selectedWard) return;
    setExporting('excel');
    try {
      const XLSX = await import('xlsx');
      const { data } = await api.get(`/wards/${selectedWard.id}/report`);
      const wsData = [['Report ID', data.reportId],['Generated', new Date(data.generatedAt).toLocaleString()],
        ['Ward', data.ward.name],['Officer', data.ward.officer],[],
        ['Total','Pending','Resolved','In Progress'],
        [data.stats.total, data.stats.pending, data.stats.resolved, data.stats.inProgress],[],
        ['Complaint ID','Type','Severity','Status','Area','Date']];
      (data.stats.complaints || []).forEach(c => {
        wsData.push([c.id, c.type, c.severity, c.status, c.area_name, new Date(c.created_at).toLocaleDateString()]);
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{wch:38},{wch:12},{wch:10},{wch:12},{wch:30},{wch:14}];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ward Report');
      XLSX.writeFile(wb, `${data.ward.name}_Report.xlsx`);
    } catch (e) { console.error(e); }
    finally { setExporting(''); }
  }, [selectedWard]);

  const exportPDF = useCallback(async () => {
    if (!selectedWard) return;
    setExporting('pdf');
    try {
      const { default: jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      const { data } = await api.get(`/wards/${selectedWard.id}/report`);
      const s = data.stats;

      // Capture map screenshot
      let mapImg = null;
      const mapEl = document.querySelector('.leaflet-container');
      if (mapEl) {
        try { const canvas = await html2canvas(mapEl, { useCORS: true, scale: 1.5 }); mapImg = canvas.toDataURL('image/png'); } catch (_) {}
      }

      const doc = new jsPDF('p', 'mm', 'a4');
      const W = 210, M = 15;
      let y = M;

      // Header band
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, W, 40, 'F');
      doc.setTextColor(255, 220, 43);
      doc.setFontSize(22);
      doc.text('CITYPULSE WARD REPORT', M, 18);
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text(`Report ID: ${data.reportId}`, M, 27);
      doc.text(`Generated: ${new Date(data.generatedAt).toLocaleString()}`, M, 33);
      y = 50;

      // Ward info
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(16);
      doc.text(data.ward.name, M, y); y += 8;
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Officer: ${data.ward.officer}  |  Contact: ${data.ward.contact}`, M, y); y += 6;
      doc.text(data.ward.description || '', M, y, { maxWidth: W - 2*M }); y += 14;

      // Stats box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(M, y, W - 2*M, 28, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(M, y, W - 2*M, 28, 3, 3, 'S');
      const bw = (W - 2*M) / 4;
      const statsArr = [
        { label: 'TOTAL', val: s.total, color: [59, 130, 246] },
        { label: 'PENDING', val: s.pending, color: [245, 158, 11] },
        { label: 'RESOLVED', val: s.resolved, color: [34, 197, 94] },
        { label: 'IN PROGRESS', val: s.inProgress, color: [139, 92, 246] }
      ];
      statsArr.forEach((st, i) => {
        const cx = M + bw * i + bw / 2;
        doc.setFontSize(18);
        doc.setTextColor(...st.color);
        doc.text(String(st.val), cx, y + 14, { align: 'center' });
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(st.label, cx, y + 22, { align: 'center' });
      });
      y += 36;

      // Severity breakdown
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text('Severity Breakdown', M, y); y += 8;
      const sevs = s.severities || {};
      [{ k: 'High', c: [239,68,68] }, { k: 'Medium', c: [245,158,11] }, { k: 'Low', c: [34,197,94] }].forEach(sv => {
        doc.setFillColor(...sv.c);
        doc.circle(M + 3, y - 1.5, 2, 'F');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`${sv.k}: ${sevs[sv.k] || 0}`, M + 8, y); y += 6;
      });
      y += 4;

      // Map screenshot
      if (mapImg) {
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text('Ward Map Snapshot', M, y); y += 4;
        const imgW = W - 2*M, imgH = 70;
        if (y + imgH > 280) { doc.addPage(); y = M; }
        doc.addImage(mapImg, 'PNG', M, y, imgW, imgH);
        y += imgH + 8;
      }

      // Complaints table
      if (y > 230) { doc.addPage(); y = M; }
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text('Recent Complaints', M, y); y += 6;
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      const cols = ['Type','Severity','Status','Area','Date'];
      const cw = [20,20,22,75,30];
      let cx = M;
      cols.forEach((c, i) => { doc.text(c, cx, y); cx += cw[i]; }); y += 5;
      doc.setDrawColor(226, 232, 240); doc.line(M, y, W - M, y); y += 3;

      doc.setTextColor(71, 85, 105);
      (s.complaints || []).slice(0, 20).forEach(c => {
        if (y > 280) { doc.addPage(); y = M; }
        cx = M;
        [c.type, c.severity, c.status, (c.area_name||'').substring(0,35), new Date(c.created_at).toLocaleDateString()].forEach((v, i) => {
          doc.text(String(v), cx, y); cx += cw[i];
        });
        y += 5;
      });

      // Footer
      y += 6;
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('Officer Remarks', M, y); y += 6;
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(data.remarks || 'No remarks.', M, y, { maxWidth: W - 2*M }); y += 14;

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 285, W, 12, 'F');
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7);
      doc.text('CityPulse Civic Platform — Confidential Government Report', W/2, 291, { align: 'center' });

      doc.save(`${data.ward.name}_Report.pdf`);
    } catch (e) { console.error(e); }
    finally { setExporting(''); }
  }, [selectedWard]);

  const pieData = wardStats ? Object.entries(wardStats.stats?.severities || {}).map(([name, value]) => ({ name, value })).filter(d => d.value > 0) : [];
  const barData = wardStats ? Object.entries(wardStats.stats?.monthlyTrend || {}).map(([month, d]) => ({ month: month.slice(5), total: d.total, resolved: d.resolved })) : [];

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'80vh' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: 48, height: 48, border: '4px solid #e2e8f0', borderTop: '4px solid #C62828', borderRadius: '50%' }} />
    </div>
  );

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', background: '#f1f5f9' }}>
      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ position:'absolute', top: 16, left: 16, zIndex: 1000, background:'#fff', border:'3px solid #111', borderRadius: 16, padding:'12px 20px', boxShadow:'4px 4px 0 #111' }}>
          <h2 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:'1.4rem', fontWeight:900, color:'#0f172a' }}>Ward <span style={{ color:'#C62828' }}>Map</span></h2>
          <p style={{ margin:'2px 0 0', fontSize:'0.8rem', color:'#64748b', fontWeight:600 }}>Click a ward to view analytics</p>
        </div>

        {/* Legend */}
        <div style={{ position:'absolute', bottom: 24, left: 16, zIndex: 1000, background:'#fff', border:'2px solid #111', borderRadius: 12, padding:'10px 14px', boxShadow:'3px 3px 0 #111' }}>
          <div style={{ fontSize:'0.7rem', fontWeight:800, color:'#64748b', textTransform:'uppercase', marginBottom: 6 }}>Complaint Load</div>
          {[{c:'#22c55e',l:'Low'},{c:'#f59e0b',l:'Medium'},{c:'#ef4444',l:'High'}].map(i => (
            <div key={i.l} style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 3 }}>
              <span style={{ width:12, height:12, borderRadius:3, background:i.c, border:'1px solid #111' }} />
              <span style={{ fontSize:'0.78rem', fontWeight:600, color:'#374151' }}>{i.l}</span>
            </div>
          ))}
        </div>

        <MapContainer ref={mapRef} center={[19.12, 72.95]} zoom={11} style={{ height:'100%', width:'100%', minHeight:'calc(100vh - 64px)' }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; Carto' />
          <FlyToWard ward={selectedWard} />
          {wards.map(ward => {
            const colors = getWardColor(ward.loadLevel);
            const isSelected = selectedWard?.id === ward.id;
            return (
              <Polygon key={ward.id} positions={ward.coordinates}
                pathOptions={{ color: isSelected ? '#111' : colors.border, fillColor: colors.fill, fillOpacity: isSelected ? 0.45 : 0.25, weight: isSelected ? 4 : 2 }}
                eventHandlers={{ click: () => handleWardClick(ward) }}>
                <Popup>
                  <div style={{ fontFamily:'var(--font-display)', padding: 4 }}>
                    <strong style={{ fontSize:'1.1rem' }}>{ward.name}</strong>
                    <div style={{ margin:'6px 0', fontSize:'0.85rem' }}>
                      <span style={{ padding:'2px 8px', borderRadius:4, fontSize:'0.7rem', fontWeight:800, color:'#fff', background: colors.fill }}>{ward.loadLevel.toUpperCase()} LOAD</span>
                    </div>
                    <div style={{ fontSize:'0.85rem', color:'#475569' }}>Total: {ward.stats?.total || 0} | Pending: {ward.stats?.pending || 0}</div>
                    <div style={{ fontSize:'0.8rem', color:'#64748b', marginTop: 4 }}>Officer: {ward.officer}</div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}
        </MapContainer>
      </div>

      {/* Side Panel */}
      <AnimatePresence>
        {panelOpen && selectedWard && (
          <motion.div
            initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ width: 400, background:'#fff', borderLeft:'3px solid #111', overflowY:'auto', position:'relative', zIndex:10 }}>

            {/* Close button */}
            <button onClick={() => { setPanelOpen(false); setSelectedWard(null); setWardStats(null); }}
              style={{ position:'absolute', top:12, right:12, zIndex:20, width:32, height:32, borderRadius:8, border:'2px solid #111', background:'#fff', cursor:'pointer', fontWeight:900, fontSize:'1rem' }}>×</button>

            {/* Header */}
            <div style={{ padding:'24px 20px 16px', borderBottom:'2px solid #e2e8f0', background:'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 8 }}>
                <span style={{ padding:'3px 10px', borderRadius:6, fontSize:'0.65rem', fontWeight:800, color:'#fff',
                  background: getWardColor(selectedWard.loadLevel).fill, textTransform:'uppercase' }}>{selectedWard.loadLevel} Load</span>
              </div>
              <h3 style={{ margin:0, color:'#fff', fontFamily:'var(--font-display)', fontSize:'1.4rem', fontWeight:900 }}>{selectedWard.name}</h3>
              <p style={{ margin:'4px 0 0', color:'#94a3b8', fontSize:'0.85rem' }}>ID: {selectedWard.id}</p>
            </div>

            {statsLoading ? (
              <div style={{ padding: 40, textAlign:'center' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTop: '3px solid #C62828', borderRadius: '50%', margin:'0 auto' }} />
                <p style={{ marginTop: 12, color:'#64748b', fontSize:'0.9rem' }}>Loading analytics...</p>
              </div>
            ) : wardStats && (
              <div style={{ padding:'16px 20px 24px' }}>
                {/* Officer Info */}
                <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:'12px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize:'0.7rem', fontWeight:800, color:'#94a3b8', textTransform:'uppercase' }}>Assigned Officer</div>
                  <div style={{ fontSize:'1rem', fontWeight:700, color:'#0f172a', marginTop: 2 }}>{wardStats.ward?.officer}</div>
                  <div style={{ fontSize:'0.82rem', color:'#64748b' }}>{wardStats.ward?.contact}</div>
                </div>

                {/* Stat Cards Grid */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[
                    { label:'Total', val: wardStats.stats?.total, color:'#3b82f6', bg:'#eff6ff' },
                    { label:'Pending', val: wardStats.stats?.pending, color:'#f59e0b', bg:'#fffbeb' },
                    { label:'Resolved', val: wardStats.stats?.resolved, color:'#22c55e', bg:'#f0fdf4' },
                    { label:'In Progress', val: wardStats.stats?.inProgress, color:'#8b5cf6', bg:'#f5f3ff' },
                  ].map(s => (
                    <div key={s.label} style={{ background:s.bg, borderRadius:12, padding:'14px 12px', border:`1px solid ${s.color}22`, textAlign:'center' }}>
                      <div style={{ fontSize:'1.8rem', fontWeight:900, fontFamily:'var(--font-display)', color:s.color }}>{s.val || 0}</div>
                      <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#64748b', textTransform:'uppercase' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Categories */}
                {wardStats.stats?.categories && Object.keys(wardStats.stats.categories).length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize:'0.78rem', fontWeight:800, color:'#0f172a', textTransform:'uppercase', marginBottom: 8 }}>Categories</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap: 6 }}>
                      {Object.entries(wardStats.stats.categories).map(([cat, cnt]) => (
                        <span key={cat} style={{ padding:'4px 10px', borderRadius:20, fontSize:'0.75rem', fontWeight:700, background:'#f1f5f9', border:'1px solid #e2e8f0', color:'#475569' }}>
                          {cat}: {cnt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Severity Pie Chart */}
                {pieData.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize:'0.78rem', fontWeight:800, color:'#0f172a', textTransform:'uppercase', marginBottom: 8 }}>Severity Distribution</div>
                    <div style={{ background:'#f8fafc', borderRadius:12, padding:10, border:'1px solid #e2e8f0' }}>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                            {pieData.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
                          </Pie>
                          <Legend wrapperStyle={{ fontSize:'0.72rem' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Monthly Trend Bar Chart */}
                {barData.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize:'0.78rem', fontWeight:800, color:'#0f172a', textTransform:'uppercase', marginBottom: 8 }}>Monthly Trend</div>
                    <div style={{ background:'#f8fafc', borderRadius:12, padding:10, border:'1px solid #e2e8f0' }}>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={barData}>
                          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <Tooltip contentStyle={{ fontSize:'0.8rem', borderRadius:8 }} />
                          <Bar dataKey="total" fill="#3b82f6" radius={[4,4,0,0]} name="Total" />
                          <Bar dataKey="resolved" fill="#22c55e" radius={[4,4,0,0]} name="Resolved" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Export Buttons */}
                <div style={{ fontSize:'0.78rem', fontWeight:800, color:'#0f172a', textTransform:'uppercase', marginBottom: 10 }}>Export Report</div>
                <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
                  <button onClick={exportPDF} disabled={!!exporting}
                    style={{ width:'100%', padding:'12px', borderRadius:12, border:'3px solid #111', background:'#C62828', color:'#fff', fontFamily:'var(--font-display)', fontWeight:900, fontSize:'0.9rem', cursor:'pointer', boxShadow:'3px 3px 0 #111', display:'flex', alignItems:'center', justifyContent:'center', gap: 8, opacity: exporting ? 0.6 : 1 }}>
                    📄 {exporting === 'pdf' ? 'Generating...' : 'Download PDF Report'}
                  </button>
                  <div style={{ display:'flex', gap: 8 }}>
                    <button onClick={exportExcel} disabled={!!exporting}
                      style={{ flex:1, padding:'10px', borderRadius:10, border:'2px solid #111', background:'#16a34a', color:'#fff', fontFamily:'var(--font-display)', fontWeight:800, fontSize:'0.8rem', cursor:'pointer', boxShadow:'2px 2px 0 #111', opacity: exporting ? 0.6 : 1 }}>
                      📊 {exporting === 'excel' ? '...' : 'Excel'}
                    </button>
                    <button onClick={exportCSV} disabled={!!exporting}
                      style={{ flex:1, padding:'10px', borderRadius:10, border:'2px solid #111', background:'#2563eb', color:'#fff', fontFamily:'var(--font-display)', fontWeight:800, fontSize:'0.8rem', cursor:'pointer', boxShadow:'2px 2px 0 #111', opacity: exporting ? 0.6 : 1 }}>
                      📋 {exporting === 'csv' ? '...' : 'CSV'}
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div style={{ marginTop: 16, padding:'12px 14px', background:'#f8fafc', borderRadius:10, border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', marginBottom: 4 }}>Ward Description</div>
                  <p style={{ margin:0, fontSize:'0.85rem', color:'#475569', lineHeight:1.5 }}>{wardStats.ward?.description}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WardMapPage;
