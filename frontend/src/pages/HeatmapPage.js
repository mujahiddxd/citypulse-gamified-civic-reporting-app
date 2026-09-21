import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon } from 'react-leaflet';
import Select from 'react-select';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../utils/api';
import { SkeletonHeatmap } from '../components/ui/SkeletonLoader';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

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

const WARD_PALETTE = [
  '#ef4444', // Kurla - Coral Red
  '#3b82f6', // Mumbra - Vibrant Blue
  '#10b981', // Vidyavihar - Emerald
  '#8b5cf6', // Thakurli - Purple
  '#ec4899', // Ghansoli - Pink
  '#f59e0b', // Colaba - Amber
  '#06b6d4', // Marine Drive - Cyan
  '#14b8a6', // Malabar Hill - Teal
  '#a855f7', // Andheri West - Deep Purple
  '#f97316', // Bandra West - Orange
  '#6366f1', // Dadar West - Indigo
  '#84cc16', // Borivali West - Lime
  '#0d9488', // Chembur East - Dark Teal
  '#f43f5e', // Vashi - Rose
  '#eab308', // Nerul - Gold
  '#475569', // Dombivli East - Slate
  '#0284c7', // Sky Blue
  '#d946ef', // Fuchsia
  '#4ade80'  // Light Green
];

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
          radius: 45,
          blur: 18,
          maxZoom: 16,
          max: 0.3,
          minOpacity: 0.5,
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
  const navigate = useNavigate();
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [filters, setFilters] = useState({ type: '', severity: '', from: '', to: '' });
  const [viewMode, setViewMode] = useState('heatmap'); // 'heatmap' | 'markers' | 'sectors'
  const [mapCenter, setMapCenter] = useState({ lat: 19.076, lng: 72.877, zoom: 12 });
  const [currentAqi, setCurrentAqi] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedZoneWard, setSelectedZoneWard] = useState(null);
  const [zoneWardStats, setZoneWardStats] = useState(null);
  const [zoneStatsLoading, setZoneStatsLoading] = useState(false);
  const [zoneExporting, setZoneExporting] = useState('');

  // Dynamic Wards/Zones state loaded dynamically from backend with curated harmonious colors
  const [dummyWards, setDummyWards] = useState([]);

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
    const start = Date.now();
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
      const elapsed = Date.now() - start;

      setLoading(false);
      setInitialLoad(false);
    }
  };

  const fetchWards = async () => {
    try {
      const { data } = await api.get('/wards/map');
      const enrichedWards = (data.wards || []).map((w, idx) => ({
        ...w,
        color: WARD_PALETTE[idx % WARD_PALETTE.length]
      }));
      setDummyWards(enrichedWards);
    } catch (e) {
      console.error('Failed to load dynamic zones:', e);
    }
  };

  useEffect(() => {
    fetchHeatmap();
    fetchWards();
  }, []);

  // Clear ward selection when leaving zones mode
  useEffect(() => { if (viewMode !== 'sectors') { setSelectedZoneWard(null); setZoneWardStats(null); } }, [viewMode]);

  // Ward click handler for ZONES view
  const handleZoneWardClick = useCallback(async (ward) => {
    setSelectedZoneWard(ward);
    setZoneStatsLoading(true);
    try {
      const { data } = await api.get(`/wards/${ward.id}/stats`);
      setZoneWardStats(data);
    } catch (e) { console.error(e); }
    finally { setZoneStatsLoading(false); }
  }, []);

  // Export CSV
  const exportZoneCSV = useCallback(async () => {
    if (!selectedZoneWard) return;
    setZoneExporting('csv');
    try {
      const { data } = await api.get(`/wards/${selectedZoneWard.id}/report`);
      const rows = [['ID', 'Type', 'Severity', 'Status', 'Area', 'Date']];
      (data.stats.complaints || []).forEach(c => rows.push([
        c.id, c.type || '', c.severity || '', c.status || '', c.area_name || '',
        new Date(c.created_at).toLocaleDateString()
      ]));
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `${data.ward.name}_Report.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { console.error('CSV export error:', e); alert('CSV export failed: ' + e.message); }
    finally { setZoneExporting(''); }
  }, [selectedZoneWard]);

  // Export Excel
  const exportZoneExcel = useCallback(async () => {
    if (!selectedZoneWard) return;
    setZoneExporting('excel');
    try {
      const { data } = await api.get(`/wards/${selectedZoneWard.id}/report`);
      const wsData = [
        ['CITYPULSE — WARD REPORT'],
        ['Report ID', data.reportId],
        ['Generated', new Date(data.generatedAt).toLocaleString()],
        ['Ward Name', data.ward.name],
        ['Assigned Officer', data.ward.officer],
        ['Contact', data.ward.contact],
        [],
        ['COMPLAINT STATISTICS'],
        ['Total', 'Pending', 'Resolved', 'In Progress', 'Approved'],
        [data.stats.total, data.stats.pending, data.stats.resolved, data.stats.inProgress, data.stats.approved],
        [],
        ['SEVERITY BREAKDOWN'],
        ['High', 'Medium', 'Low'],
        [(data.stats.severities || {}).High || 0, (data.stats.severities || {}).Medium || 0, (data.stats.severities || {}).Low || 0],
        [],
        ['COMPLAINT DETAILS'],
        ['Complaint ID', 'Type', 'Severity', 'Status', 'Area Name', 'Date'],
        ...(data.stats.complaints || []).map(c => [
          c.id, c.type || '', c.severity || '', c.status || '', c.area_name || '',
          new Date(c.created_at).toLocaleDateString()
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [{ wch: 38 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 35 }, { wch: 14 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ward Report');
      XLSX.writeFile(wb, `${data.ward.name}_Report.xlsx`);
    } catch (e) { console.error('Excel export error:', e); alert('Excel export failed: ' + e.message); }
    finally { setZoneExporting(''); }
  }, [selectedZoneWard]);

  // Export PDF — Premium Official Municipal Executive Audit Report
  const exportZonePDF = useCallback(async () => {
    if (!selectedZoneWard) return;
    setZoneExporting('pdf');
    try {
      const { data } = await api.get(`/wards/${selectedZoneWard.id}/report`);
      const s = data.stats;
      const complaints = s.complaints || [];

      const JsPDF = jsPDF.jsPDF || jsPDF;
      const doc = new JsPDF('p', 'mm', 'a4');
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
    } catch (e) { console.error('PDF export error:', e); alert('PDF export failed: ' + e.message); }
    finally { setZoneExporting(''); }
  }, [selectedZoneWard]);



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
          garbage: 0
        };
      }
      areas[areaName].deduction += deduction;
      areas[areaName].count += 1;

      if (p.type === 'Garbage') areas[areaName].garbage++;
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

  // Group reports by exact location to prevent overlapping markers
  const groupedPoints = useMemo(() => {
    const groups = {};
    visiblePoints.forEach(p => {
      // Using 4 decimal places (approx 11 meters) to group reports at the "same" spot
      const key = `${parseFloat(p.lat).toFixed(4)},${parseFloat(p.lng).toFixed(4)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return Object.values(groups);
  }, [visiblePoints]);

  // State to track current report index for markers with multiple reports
  const [popupIndexes, setPopupIndexes] = useState({});

  // Show skeleton on initial load (after all hooks)
  if (initialLoad) return <SkeletonHeatmap />;

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
              {viewMode === 'markers' && groupedPoints.map((group, groupIdx) => {
                const currentIdx = popupIndexes[groupIdx] || 0;
                const p = group[currentIdx];
                const anchor = group[0]; // Stable position for the marker
                const hasMultiple = group.length > 1;

                return (
                  <Marker key={groupIdx} position={[anchor.lat, anchor.lng]} icon={getIcon(p.severity)}>
                    <Popup className="custom-popup" style={{ minWidth: '320px' }}>
                      <div style={{ fontFamily: 'var(--font-display)', color: '#111', padding: '0.75rem' }}>

                        {hasMultiple && (
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            marginBottom: '12px', background: '#0f172a', padding: '8px 12px', borderRadius: '10px',
                            border: '2px solid #FFDC2B', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}>
                            <button
                              onClick={() => setPopupIndexes(prev => ({ ...prev, [groupIdx]: (currentIdx - 1 + group.length) % group.length }))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#FFDC2B', padding: '4px' }}
                            >◀️</button>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: '900', color: '#fff', opacity: 0.8, letterSpacing: '0.05em' }}>MULTIPLE REPORTS</div>
                              <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#FFDC2B' }}>
                                {currentIdx + 1} OF {group.length}
                              </span>
                            </div>
                            <button
                              onClick={() => setPopupIndexes(prev => ({ ...prev, [groupIdx]: (currentIdx + 1) % group.length }))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#FFDC2B', padding: '4px' }}
                            >▶️</button>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <strong style={{ fontSize: '1.3rem', color: '#0f172a', margin: 0, flex: 1 }}>
                            {p.area_name || 'Reported Area'}
                          </strong>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '900', color: '#fff',
                            background: p.severity === 'High' ? '#ef4444' : p.severity === 'Medium' ? '#eab308' : '#22c55e',
                            textTransform: 'uppercase'
                          }}>
                            {p.severity} Severity
                          </span>
                          <span style={{
                            padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800',
                            background: p.status === 'Approved' || p.status === 'resolved' ? '#dcfce7' : p.status === 'in_progress' ? '#fef9c3' : '#f1f5f9',
                            color: p.status === 'Approved' || p.status === 'resolved' ? '#16a34a' : p.status === 'in_progress' ? '#854d0e' : '#475569',
                            border: `1px solid ${p.status === 'Approved' || p.status === 'resolved' ? '#16a34a' : p.status === 'in_progress' ? '#eab308' : '#e2e8f0'}`
                          }}>
                            {p.status || 'Pending'}
                          </span>
                        </div>

                        <p style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#444', fontWeight: '500' }}>
                          🗑️ {p.type} issue reported
                        </p>

                        {p.image_url && (
                          <div style={{ marginTop: '12px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                            <img src={p.image_url} alt="Garbage area" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '180px', objectFit: 'cover' }} />
                          </div>
                        )}

                        <button
                          onClick={() => navigate(`/reports?id=${p.id}`)}
                          style={{
                            marginTop: '16px', width: '100%', padding: '10px', borderRadius: '10px',
                            background: '#0f172a', color: '#FFDC2B', border: 'none',
                            fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '0.9rem',
                            cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                          }}
                        >
                          👁️ View Full Report & Comments
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {viewMode === 'sectors' && (
                <>
                  {analytics.sectors.map((sector, idx) => (
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
                          </div>

                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* Clickable Ward Polygons */}
                  {dummyWards.map(ward => {
                    const isSelected = selectedZoneWard?.id === ward.id;
                    return (
                      <Polygon
                        key={ward.id}
                        positions={ward.coordinates}
                        pathOptions={{
                          color: isSelected ? '#111' : ward.color,
                          fillColor: ward.color,
                          fillOpacity: isSelected ? 0.45 : 0.2,
                          weight: isSelected ? 4 : 2,
                          dashArray: isSelected ? '' : '5, 5'
                        }}
                        eventHandlers={{ click: () => handleZoneWardClick(ward) }}
                      >
                        <Popup>
                          <div style={{ padding: '0.5rem', fontFamily: 'var(--font-display)' }}>
                            <h4 style={{ margin: '0 0 0.5rem', color: ward.color }}>{ward.name.toLowerCase().includes('ward') ? ward.name : `${ward.name} Ward`}</h4>
                            <p style={{ margin: 0 }}><strong>OFFICER:</strong><br />{ward.officer}</p>
                            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Click ward for details & reports →</p>
                          </div>
                        </Popup>
                      </Polygon>
                    );
                  })}
                </>
              )}
            </AnimatePresence>
          </MapContainer>
        </div>

        {/* Analytics Sidebar */}
        <div style={{
          width: '380px', background: '#F8FAFC', borderLeft: '3px solid #111',
          display: 'flex', flexDirection: 'column', zIndex: 10, overflowY: 'auto'
        }}>

          {/* === WARD DETAILS PANEL (shown when ward selected in ZONES mode) === */}
          {viewMode === 'sectors' && selectedZoneWard ? (
            <>
              {/* Ward Header */}
              <div style={{ padding: '20px 18px 14px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderBottom: '3px solid #C62828' }}>
                <button onClick={() => { setSelectedZoneWard(null); setZoneWardStats(null); }}
                  style={{ float: 'right', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, color: '#fff', padding: '4px 10px', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem' }}>✕ Close</button>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#FFDC2B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>🏛️ WARD DETAILS</div>
                <h3 style={{ margin: 0, color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 900 }}>{selectedZoneWard.name}</h3>
                <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>ID: {selectedZoneWard.id}</p>
              </div>

              {zoneStatsLoading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}
                    style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTop: '3px solid #C62828', borderRadius: '50%', margin: '0 auto' }} />
                  <p style={{ marginTop: 10, color: '#64748b', fontSize: '0.85rem' }}>Loading ward analytics...</p>
                </div>
              ) : zoneWardStats && (
                <div style={{ padding: '14px 16px 20px' }}>
                  {/* Officer */}
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Assigned Officer</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginTop: 2 }}>{zoneWardStats.ward?.officer}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{zoneWardStats.ward?.contact}</div>
                  </div>

                  {/* Stat Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    {[{ l: 'Total', v: zoneWardStats.stats?.total, c: '#3b82f6', bg: '#eff6ff' },
                    { l: 'Pending', v: zoneWardStats.stats?.pending, c: '#f59e0b', bg: '#fffbeb' },
                    { l: 'Resolved', v: zoneWardStats.stats?.resolved, c: '#22c55e', bg: '#f0fdf4' },
                    { l: 'In Progress', v: zoneWardStats.stats?.inProgress, c: '#8b5cf6', bg: '#f5f3ff' },
                    ].map(s => (
                      <div key={s.l} style={{ background: s.bg, borderRadius: 10, padding: '12px 10px', border: `1px solid ${s.c}22`, textAlign: 'center' }}>
                        <div style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: s.c }}>{s.v || 0}</div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{s.l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Categories */}
                  {zoneWardStats.stats?.categories && Object.keys(zoneWardStats.stats.categories).length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: 6 }}>Categories</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {Object.entries(zoneWardStats.stats.categories).map(([cat, cnt]) => (
                          <span key={cat} style={{ padding: '3px 8px', borderRadius: 14, fontSize: '0.72rem', fontWeight: 700, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569' }}>{cat}: {cnt}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Severity Pie */}
                  {(() => {
                    const pd = Object.entries(zoneWardStats.stats?.severities || {}).map(([n, v]) => ({ name: n, value: v })).filter(d => d.value > 0); return pd.length > 0 ? (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: 6 }}>Severity</div>
                        <div style={{ background: '#fff', borderRadius: 10, padding: 8, border: '1px solid #e2e8f0' }}>
                          <ResponsiveContainer width="100%" height={150}>
                            <PieChart><Pie data={pd} cx="50%" cy="50%" innerRadius={35} outerRadius={58} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}:${value}`}>
                              {pd.map((_, i) => <Cell key={i} fill={['#ef4444', '#f59e0b', '#22c55e'][i % 3]} />)}
                            </Pie></PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Monthly Trend */}
                  {(() => {
                    const bd = Object.entries(zoneWardStats.stats?.monthlyTrend || {}).map(([m, d]) => ({ month: m.slice(5), total: d.total, resolved: d.resolved })); return bd.length > 0 ? (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: 6 }}>Monthly Trend</div>
                        <div style={{ background: '#fff', borderRadius: 10, padding: 8, border: '1px solid #e2e8f0' }}>
                          <ResponsiveContainer width="100%" height={130}>
                            <BarChart data={bd}>
                              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                              <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                              <Tooltip contentStyle={{ fontSize: '0.75rem', borderRadius: 6 }} />
                              <Bar dataKey="total" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Total" />
                              <Bar dataKey="resolved" fill="#22c55e" radius={[3, 3, 0, 0]} name="Resolved" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* === REPORT DOWNLOAD BUTTONS === */}
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#C62828', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>📋 Download Report</div>
                  <button onClick={exportZonePDF} disabled={!!zoneExporting}
                    style={{ width: '100%', padding: '11px', borderRadius: 10, border: '3px solid #111', background: '#C62828', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '3px 3px 0 #111', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8, opacity: zoneExporting ? 0.6 : 1, transition: 'all 0.2s' }}>
                    📄 {zoneExporting === 'pdf' ? 'Generating PDF...' : 'Download PDF Report'}
                  </button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={exportZoneExcel} disabled={!!zoneExporting}
                      style={{ flex: 1, padding: '9px', borderRadius: 8, border: '2px solid #111', background: '#16a34a', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', boxShadow: '2px 2px 0 #111', opacity: zoneExporting ? 0.6 : 1 }}>
                      📊 {zoneExporting === 'excel' ? '...' : 'Excel'}
                    </button>
                    <button onClick={exportZoneCSV} disabled={!!zoneExporting}
                      style={{ flex: 1, padding: '9px', borderRadius: 8, border: '2px solid #111', background: '#2563eb', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', boxShadow: '2px 2px 0 #111', opacity: zoneExporting ? 0.6 : 1 }}>
                      📋 {zoneExporting === 'csv' ? '...' : 'CSV'}
                    </button>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 8, textAlign: 'center' }}>PDF includes map snapshot, stats & complaint table for municipality submission.</p>
                </div>
              )}
            </>
          ) : (
            /* === DEFAULT ANALYTICS SIDEBAR === */
            <>
              {/* Header */}
              <div style={{ padding: '2rem 1.5rem', background: '#fff', borderBottom: '2px solid #e2e8f0' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: '900', color: '#0f172a', margin: 0, lineHeight: 1 }}>Mumbai</h2>
                <p style={{ margin: '0.5rem 0 0', color: '#64748b', fontSize: '0.95rem', fontWeight: '600' }}>Cleanliness Analytics</p>
              </div>

              <div style={{ padding: '1.5rem' }}>
                <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>CITY HEALTH INDEX</div>
                  <div style={{ fontSize: '3.5rem', fontWeight: '900', fontFamily: 'var(--font-display)', lineHeight: 1, color: analytics.cityScore >= 7.0 ? '#22c55e' : analytics.cityScore >= 4.0 ? '#eab308' : '#ef4444' }}>
                    {analytics.cityScore}<span style={{ fontSize: '2rem', color: '#cbd5e1' }}>/10</span>
                  </div>
                </div>

                <div style={{ background: '#fff', borderRadius: '16px', padding: '1.25rem', marginTop: '1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', textAlign: 'center', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em' }}>CURRENT AQI</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>Air Quality Index</div>
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: '900', fontFamily: 'var(--font-display)', lineHeight: 1, color: currentAqi === null ? '#cbd5e1' : currentAqi <= 50 ? '#16a34a' : currentAqi <= 100 ? '#eab308' : currentAqi <= 150 ? '#f97316' : '#ef4444' }}>
                    {currentAqi !== null ? currentAqi : '--'}
                  </div>
                </div>

                {/* Zones mode hint */}
                {viewMode === 'sectors' && !selectedZoneWard && (
                  <div style={{ marginTop: '1.5rem', padding: '16px', background: '#fffbeb', borderRadius: 12, border: '2px solid #f59e0b', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>🗺️</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.85rem', color: '#92400e', marginBottom: 4 }}>Click a Ward on the Map</div>
                    <div style={{ fontSize: '0.78rem', color: '#a16207' }}>View analytics, charts & download official reports for municipality submission.</div>
                  </div>
                )}

                <div style={{ marginTop: '2.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#ef4444', letterSpacing: '0.05em', marginBottom: '1rem', textTransform: 'uppercase' }}>Critical Sectors</div>
                  {analytics.sectors.length === 0 && (
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No data available in this view.</div>
                  )}
                  {analytics.sectors.map((sector, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', marginBottom: '0.75rem', borderLeft: `4px solid ${sector.isCritical ? '#ef4444' : '#f59e0b'}`, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>{sector.name.split(',')[0]}</h4>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Dirty Score</div>
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '800', color: sector.isCritical ? '#ef4444' : '#f59e0b' }}>{sector.score}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '600' }}>{points.length} ACTIVE REPORTS</span>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default HeatmapPage;
