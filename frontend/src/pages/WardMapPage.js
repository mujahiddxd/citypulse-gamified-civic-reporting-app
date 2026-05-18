import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

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
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  // Try to decode standalone admin token if present
  const adminToken = localStorage.getItem('citypulse_admin_token');
  let decodedUser = null;
  if (adminToken) {
    try {
      const base64Url = adminToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''));
      decodedUser = JSON.parse(jsonPayload);
    } catch (_) {}
  }

  const currentUser = decodedUser || authUser;
  const role = currentUser?.role?.toLowerCase();
  const isOfficial = role === 'admin' || role === 'officer';

  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState(null);
  const [wardStats, setWardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [exporting, setExporting] = useState('');
  const mapRef = useRef(null);

  // Guard: redirect non-officials to home immediately
  useEffect(() => {
    if (!isOfficial) {
      navigate('/', { replace: true });
    }
  }, [isOfficial, navigate]);

  useEffect(() => {
    if (!isOfficial) return; // skip fetch if not authorized
    (async () => {
      try {
        const { data } = await api.get('/wards/map');
        setWards(data.wards || []);
      } catch (e) { console.error('Failed to load wards', e); }
      finally { setLoading(false); }
    })();
  }, [isOfficial]);

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
      const { data } = await api.get(`/wards/${selectedWard.id}/report`);
      const s = data.stats;
      const complaints = s.complaints || [];

      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      const W = 210, M = 15;
      let y = M;

      // Helper: draw page footer
      const addFooter = (pageNum, total) => {
        doc.setFillColor(15, 23, 42); doc.rect(0, 285, W, 12, 'F');
        doc.setTextColor(148, 163, 184); doc.setFontSize(7);
        doc.text('CityPulse Civic Platform — Confidential Government Document — For Official Municipality Use Only', W / 2, 290, { align: 'center' });
        doc.text(`Page ${pageNum} of ${total}`, W - M, 290, { align: 'right' });
      };

      // Helper: severity color
      const sevColor = (sev) => {
        if (sev === 'High') return [239, 68, 68];
        if (sev === 'Medium') return [245, 158, 11];
        return [34, 197, 94];
      };

      // Helper: status color
      const statusColor = (st) => {
        if (st === 'resolved') return [34, 197, 94];
        if (st === 'in_progress') return [139, 92, 246];
        if (st === 'Approved') return [59, 130, 246];
        if (st === 'Rejected') return [239, 68, 68];
        return [245, 158, 11]; // Pending
      };

      const totalPages = complaints.length + 2; // Cover + Master Index + Complaints

      // ── PAGE 1: EXECUTIVE COVER PAGE & DASHBOARD ──────────────────────────────
      // Dark header band
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, W, 45, 'F');
      doc.setFillColor(234, 179, 8); doc.rect(0, 45, W, 2, 'F'); // Gold accent

      doc.setTextColor(255, 220, 43); doc.setFontSize(24); doc.setFont(undefined, 'bold');
      doc.text('CITYPULSE', M, 18);
      doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.setFont(undefined, 'normal');
      doc.text('MUNICIPAL CORPORATION CIVIC AUDIT & COMPLAINT REPORT', M, 28);
      doc.setFontSize(8); doc.setTextColor(160, 160, 160);
      doc.text(`Report Reference ID: ${data.reportId}`, M, 36);
      doc.text(`Audit Timestamp: ${new Date(data.generatedAt).toLocaleString()}`, M, 41);
      doc.text('CLASSIFICATION: OFFICIAL / RESTRICTED', W - M, 41, { align: 'right' });

      y = 56;

      // Executive Ward Info Block
      doc.setTextColor(15, 23, 42); doc.setFontSize(18); doc.setFont(undefined, 'bold');
      doc.text(data.ward.name.toUpperCase(), M, y); y += 8;
      doc.setFont(undefined, 'normal'); doc.setFontSize(10); doc.setTextColor(71, 85, 105);
      doc.text(`Assigned Executive Officer: ${data.ward.officer}`, M, y); y += 5;
      doc.text(`Official Dispatch Contact: ${data.ward.contact}`, M, y); y += 5;
      doc.text(`Geographic Center (Lat, Lng): ${data.ward.center[0].toFixed(4)}, ${data.ward.center[1].toFixed(4)}`, M, y); y += 8;

      // Ward Description Box
      doc.setFillColor(248, 250, 252); doc.roundedRect(M, y, W - 2 * M, 28, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240); doc.roundedRect(M, y, W - 2 * M, 28, 2, 2, 'S');
      doc.setFontSize(8); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
      doc.text('WARD ADMINISTRATIVE JURISDICTION & OVERVIEW', M + 4, y + 6); doc.setFont(undefined, 'normal');
      const descLines = doc.splitTextToSize(data.ward.description || 'No administrative description provided for this ward.', W - 2 * M - 8);
      doc.setFontSize(8); doc.setTextColor(71, 85, 105);
      doc.text(descLines, M + 4, y + 12);
      y += 34;

      // Executive Summary Text Block
      doc.setFontSize(11); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
      doc.text('1. Executive Operational Summary', M, y); y += 6; doc.setFont(undefined, 'normal');
      const execText = `This document serves as the official municipal audit report for ${data.ward.name}, tracking citizen-reported civic grievances, departmental response metrics, and geographic risk distribution. As of ${new Date(data.generatedAt).toLocaleDateString()}, the active caseload comprises ${s.total} total reported issues, with ${s.pending} awaiting initial screening, ${s.inProgress} currently undergoing field remediation, and ${s.resolved} successfully resolved by municipal action squads. Immediate departmental focus is required for outstanding high-severity cases to maintain public health and infrastructure standards.`;
      const execLines = doc.splitTextToSize(execText, W - 2 * M);
      doc.setFontSize(9); doc.setTextColor(51, 65, 85);
      doc.text(execLines, M, y); y += execLines.length * 5 + 8;

      // Key Performance Indicators (KPI Grid)
      doc.setFontSize(11); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
      doc.text('2. Departmental Performance & Caseload Metrics', M, y); y += 6; doc.setFont(undefined, 'normal');
      
      const kpiCards = [
        { l: 'TOTAL CASELOAD', v: s.total, c: [30, 64, 175], bg: [239, 246, 255], bc: [191, 219, 254] },
        { l: 'PENDING SCREENING', v: s.pending, c: [161, 98, 7], bg: [254, 243, 199], bc: [253, 230, 138] },
        { l: 'FIELD OPERATIONS', v: s.inProgress, c: [107, 33, 168], bg: [243, 232, 255], bc: [233, 213, 255] },
        { l: 'RESOLVED CASES', v: s.resolved, c: [22, 101, 52], bg: [240, 253, 244], bc: [187, 247, 208] },
        { l: 'REJECTED / INVALID', v: s.rejected || 0, c: [153, 27, 27], bg: [254, 242, 242], bc: [254, 202, 202] },
      ];
      const cardW = (W - 2 * M - 16) / 5;
      kpiCards.forEach((card, i) => {
        const cx = M + i * (cardW + 4);
        doc.setFillColor(...card.bg); doc.roundedRect(cx, y, cardW, 25, 2, 2, 'F');
        doc.setDrawColor(...card.bc); doc.roundedRect(cx, y, cardW, 25, 2, 2, 'S');
        doc.setFontSize(16); doc.setTextColor(...card.c); doc.setFont(undefined, 'bold');
        doc.text(String(card.v ?? 0), cx + cardW / 2, y + 12, { align: 'center' });
        doc.setFontSize(6); doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'normal');
        doc.text(card.l, cx + cardW / 2, y + 19, { align: 'center' });
      });
      y += 32;

      // Severity & Category Breakdown Table
      doc.setFontSize(11); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
      doc.text('3. Risk Severity & Issue Category Analysis', M, y); y += 6; doc.setFont(undefined, 'normal');
      
      // Draw Table Header
      doc.setFillColor(241, 245, 249); doc.rect(M, y, W - 2 * M, 8, 'F');
      doc.setDrawColor(203, 213, 225); doc.rect(M, y, W - 2 * M, 8, 'S');
      doc.setFontSize(8); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
      doc.text('RISK LEVEL', M + 4, y + 5.5);
      doc.text('ACTIVE COUNT', M + 50, y + 5.5);
      doc.text('DEPARTMENTAL ACTION PROTOCOL', M + 95, y + 5.5);
      y += 8;

      const protocols = {
        High: 'MANDATORY IMMEDIATE DISPATCH (SLA < 24 HRS)',
        Medium: 'STANDARD MUNICIPAL SCHEDULING (SLA < 72 HRS)',
        Low: 'ROUTINE COMMUNITY MAINTENANCE & MONITORING'
      };
      [{ k: 'High', c: [239, 68, 68] }, { k: 'Medium', c: [245, 158, 11] }, { k: 'Low', c: [34, 197, 94] }].forEach(sv => {
        doc.rect(M, y, W - 2 * M, 8, 'S');
        doc.setFillColor(...sv.c); doc.roundedRect(M + 4, y + 1.5, 22, 5, 1, 1, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont(undefined, 'bold');
        doc.text(sv.k.toUpperCase(), M + 15, y + 5, { align: 'center' });
        doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'normal');
        doc.text(String((s.severities || {})[sv.k] || 0), M + 50, y + 5);
        doc.setTextColor(71, 85, 105); doc.setFontSize(7.5);
        doc.text(protocols[sv.k], M + 95, y + 5);
        y += 8;
      });

      addFooter(1, totalPages);

      // ── PAGE 2: COMPLAINT MASTER INDEX TABLE ────────────────────────────────
      doc.addPage(); y = M;
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, W, 22, 'F');
      doc.setFillColor(234, 179, 8); doc.rect(0, 22, W, 2, 'F');
      doc.setTextColor(255, 220, 43); doc.setFontSize(14); doc.setFont(undefined, 'bold');
      doc.text('CITYPULSE — COMPLAINT MASTER INDEX', M, 14);
      doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont(undefined, 'normal');
      doc.text(`Ward: ${data.ward.name} | Total Listed: ${complaints.length}`, M, 19);

      y = 32;
      doc.setFontSize(11); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
      doc.text('Master Register of Citizen Grievances', M, y); y += 6; doc.setFont(undefined, 'normal');
      
      // Table Header
      doc.setFillColor(241, 245, 249); doc.rect(M, y, W - 2 * M, 8, 'F');
      doc.setDrawColor(203, 213, 225); doc.rect(M, y, W - 2 * M, 8, 'S');
      doc.setFontSize(7.5); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
      doc.text('ID', M + 2, y + 5.5);
      doc.text('TYPE', M + 22, y + 5.5);
      doc.text('AREA / LANDMARK', M + 52, y + 5.5);
      doc.text('SEVERITY', M + 125, y + 5.5);
      doc.text('STATUS', M + 152, y + 5.5);
      doc.text('DATE', M + 175, y + 5.5);
      y += 8;

      doc.setFont(undefined, 'normal');
      complaints.forEach((c, idx) => {
        if (y > 270) {
          addFooter(2, totalPages);
          doc.addPage(); y = M + 10;
          doc.setFillColor(241, 245, 249); doc.rect(M, y, W - 2 * M, 8, 'F');
          doc.setDrawColor(203, 213, 225); doc.rect(M, y, W - 2 * M, 8, 'S');
          doc.setFontSize(7.5); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
          doc.text('ID', M + 2, y + 5.5); doc.text('TYPE', M + 22, y + 5.5); doc.text('AREA / LANDMARK', M + 52, y + 5.5); doc.text('SEVERITY', M + 125, y + 5.5); doc.text('STATUS', M + 152, y + 5.5); doc.text('DATE', M + 175, y + 5.5);
          y += 8; doc.setFont(undefined, 'normal');
        }
        doc.rect(M, y, W - 2 * M, 8, 'S');
        doc.setFontSize(7); doc.setTextColor(15, 23, 42);
        doc.text(`CASE-${String(idx + 1).padStart(2, '0')}`, M + 2, y + 5);
        doc.text(String(c.type || 'Garbage'), M + 22, y + 5);
        doc.text(String(c.area_name || 'N/A').slice(0, 38), M + 52, y + 5);
        
        // Severity pill
        doc.setFillColor(...sevColor(c.severity)); doc.roundedRect(M + 123, y + 1.5, 22, 5, 1, 1, 'F');
        doc.setTextColor(255, 255, 255); doc.setFont(undefined, 'bold'); doc.text(String(c.severity || 'Low').toUpperCase(), M + 134, y + 5, { align: 'center' });
        
        // Status pill
        doc.setFillColor(...statusColor(c.status)); doc.roundedRect(M + 148, y + 1.5, 24, 5, 1, 1, 'F');
        doc.text(String(c.status || 'Pending').toUpperCase(), M + 160, y + 5, { align: 'center' });

        doc.setTextColor(71, 85, 105); doc.setFont(undefined, 'normal');
        doc.text(new Date(c.created_at).toLocaleDateString(), M + 175, y + 5);
        y += 8;
      });

      addFooter(2, totalPages);

      // ── PAGES 3+: DETAILED INVESTIGATION & ACTION SHEETS (1 PER COMPLAINT) ───
      complaints.forEach((complaint, idx) => {
        doc.addPage(); y = M;

        // Page header strip
        doc.setFillColor(15, 23, 42); doc.rect(0, 0, W, 20, 'F');
        doc.setFillColor(234, 179, 8); doc.rect(0, 20, W, 2, 'F');
        doc.setTextColor(255, 220, 43); doc.setFontSize(11); doc.setFont(undefined, 'bold');
        doc.text('CITYPULSE — OFFICIAL INVESTIGATION & ACTION SHEET', M, 10);
        doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont(undefined, 'normal');
        doc.text(`Ward: ${data.ward.name} | Case Sheet ${idx + 1} of ${complaints.length}`, M, 15);
        y = 30;

        // Complaint Header Card
        doc.setFillColor(248, 250, 252); doc.roundedRect(M, y, W - 2 * M, 22, 2, 2, 'F');
        doc.setDrawColor(203, 213, 225); doc.roundedRect(M, y, W - 2 * M, 22, 2, 2, 'S');
        doc.setTextColor(15, 23, 42); doc.setFontSize(12); doc.setFont(undefined, 'bold');
        doc.text(`GRIEVANCE CASE #${idx + 1}`, M + 4, y + 8);
        doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.setFont(undefined, 'normal');
        doc.text(`Official Log Timestamp: ${new Date(complaint.created_at).toLocaleString()}`, M + 4, y + 14);
        doc.setFontSize(7); doc.setTextColor(148, 163, 184);
        doc.text(`System Tracking UUID: ${complaint.id}`, M + 4, y + 19);

        // Severity & Status Badges inside the card
        const sev = complaint.severity || 'Unknown';
        const sta = complaint.status || 'Pending';
        doc.setFillColor(...sevColor(sev)); doc.roundedRect(M + 104, y + 6, 34, 8, 1, 1, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont(undefined, 'bold');
        doc.text(`RISK: ${sev.toUpperCase()}`, M + 121, y + 11.5, { align: 'center' });

        doc.setFillColor(...statusColor(sta)); doc.roundedRect(M + 140, y + 6, 36, 8, 1, 1, 'F');
        doc.text(`STATUS: ${sta.toUpperCase()}`, M + 158, y + 11.5, { align: 'center' });
        y += 28;

        // Section 1: Geographic & Location Metadata
        doc.setFontSize(10); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
        doc.text('1. Geographic & Location Metadata', M, y); y += 6; doc.setFont(undefined, 'normal');
        
        doc.setFillColor(255, 255, 255); doc.roundedRect(M, y, W - 2 * M, 24, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240); doc.roundedRect(M, y, W - 2 * M, 24, 2, 2, 'S');
        doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.setFont(undefined, 'bold');
        doc.text('REPORTED AREA / LANDMARK:', M + 4, y + 6); doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42);
        doc.text(complaint.area_name || 'No specific area landmark provided', M + 55, y + 6);
        doc.line(M + 4, y + 9, W - M - 4, y + 9);

        doc.setTextColor(100, 116, 139); doc.setFont(undefined, 'bold');
        doc.text('GPS COORDINATES (LAT, LNG):', M + 4, y + 14); doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42);
        doc.text(complaint.latitude && complaint.longitude ? `${parseFloat(complaint.latitude).toFixed(6)}, ${parseFloat(complaint.longitude).toFixed(6)}` : 'GPS Coordinates Unavailable', M + 55, y + 14);
        doc.line(M + 4, y + 17, W - M - 4, y + 17);

        doc.setTextColor(100, 116, 139); doc.setFont(undefined, 'bold');
        doc.text('GRIEVANCE CLASSIFICATION:', M + 4, y + 22); doc.setFont(undefined, 'normal'); doc.setTextColor(15, 23, 42);
        doc.text(`${complaint.type || 'Garbage'} Sanitation Issue`, M + 55, y + 22);
        y += 30;

        // Section 2: Citizen Description & AI Risk Assessment
        doc.setFontSize(10); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
        doc.text('2. Citizen Grievance Description & Risk Assessment', M, y); y += 6; doc.setFont(undefined, 'normal');

        const descText = complaint.description || 'No detailed description was provided by the citizen during submission.';
        const dLines = doc.splitTextToSize(descText, W - 2 * M - 8);
        const boxH = Math.max(28, dLines.length * 5 + 16);

        doc.setFillColor(255, 255, 255); doc.roundedRect(M, y, W - 2 * M, boxH, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240); doc.roundedRect(M, y, W - 2 * M, boxH, 2, 2, 'S');
        
        doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.setFont(undefined, 'bold');
        doc.text('CITIZEN STATEMENT:', M + 4, y + 6); doc.setFont(undefined, 'normal'); doc.setTextColor(30, 41, 59);
        doc.text(dLines, M + 4, y + 11);

        // AI Risk Statement box at the bottom of description
        const aiY = y + boxH - 12;
        doc.setFillColor(254, 242, 242); doc.rect(M + 2, aiY, W - 2 * M - 4, 10, 'F');
        doc.setFontSize(7.5); doc.setTextColor(153, 27, 27); doc.setFont(undefined, 'bold');
        doc.text('AI AUTOMATED RISK ASSESSMENT:', M + 5, aiY + 4); doc.setFont(undefined, 'normal'); doc.setTextColor(127, 29, 29);
        const aiMsg = sev === 'High' ? 'CRITICAL RISK: Potential public health hazard / pest breeding. Immediate dispatch recommended.' : 'MODERATE RISK: Standard environmental degradation. Schedule routine municipal cleanup.';
        doc.text(aiMsg, M + 5, aiY + 8.5);
        y += boxH + 6;

        // Section 3: Official Municipal Action & Remediation Log
        doc.setFontSize(10); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
        doc.text('3. Departmental Remediation & Action Log (Field Squad Use)', M, y); y += 6; doc.setFont(undefined, 'normal');

        doc.setFillColor(255, 251, 235); doc.roundedRect(M, y, W - 2 * M, 65, 2, 2, 'F');
        doc.setDrawColor(245, 158, 11); doc.roundedRect(M, y, W - 2 * M, 65, 2, 2, 'S');
        
        doc.setFontSize(8); doc.setTextColor(146, 64, 14); doc.setFont(undefined, 'bold');
        doc.text('MUNICIPAL REMEDIATION PROTOCOL', M + 4, y + 6); doc.setFont(undefined, 'normal'); doc.setTextColor(30, 41, 59);
        
        const actY = y + 14;
        doc.setFontSize(8); doc.setTextColor(100, 116, 139);
        doc.text('Assigned Municipal Squad / Contractor:', M + 4, actY); doc.text('________________________________________________', M + 65, actY);
        doc.text('On-Site Inspection Findings & Notes:', M + 4, actY + 10); doc.text('________________________________________________', M + 65, actY + 10); doc.text('________________________________________________', M + 65, actY + 15);
        doc.text('Remediation Actions Taken:', M + 4, actY + 25); doc.text('________________________________________________', M + 65, actY + 25); doc.text('________________________________________________', M + 65, actY + 30);
        doc.text('Date & Time of Field Resolution:', M + 4, actY + 40); doc.text('____________________', M + 65, actY + 40);
        doc.text('Investigating Officer Signature:', M + 115, actY + 40); doc.text('____________________', M + 155, actY + 40);
        y += 71;

        // Section 4: Final Departmental Verification & Supervisory Sign-off
        doc.setFontSize(10); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
        doc.text('4. Supervisory Verification & Final Sign-off', M, y); y += 6; doc.setFont(undefined, 'normal');

        doc.setFillColor(240, 253, 244); doc.roundedRect(M, y, W - 2 * M, 22, 2, 2, 'F');
        doc.setDrawColor(34, 197, 94); doc.roundedRect(M, y, W - 2 * M, 22, 2, 2, 'S');
        
        doc.setFontSize(8); doc.setTextColor(22, 101, 52); doc.setFont(undefined, 'bold');
        doc.text('WARD SUPERVISOR / ASSISTANT COMMISSIONER APPROVAL', M + 4, y + 6); doc.setFont(undefined, 'normal');
        
        doc.setFontSize(8); doc.setTextColor(100, 116, 139);
        doc.text('Verified By (Name): _______________________   Designation: _______________________   Date: ___________', M + 4, y + 13);
        doc.text('Official Departmental Seal / Stamp: [                                     ]', M + 4, y + 19);

        addFooter(idx + 3, totalPages);
      });

      doc.save(`${data.ward.name}_Executive_Audit_Report.pdf`);
    } catch(e) { console.error('PDF export error:', e); alert('PDF export failed: ' + e.message); }
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
                {isOfficial && (
                  <>
                    <div style={{ fontSize:'0.78rem', fontWeight:800, color:'#0f172a', textTransform:'uppercase', marginBottom: 10 }}>Export Report</div>
                    <div style={{ display:'flex', flexDirection:'column', gap: 8, marginBottom: 16 }}>
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
                  </>
                )}

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
