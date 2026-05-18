/**
 * routes/wards.js — Ward Map & Report Generation APIs
 * -----------------------------------------------------
 * Provides endpoints for the Ward Map Visualization module:
 *   GET  /api/wards/map          → All wards with GeoJSON boundaries + complaint stats
 *   GET  /api/wards/:id/stats    → Detailed statistics for a single ward
 *   GET  /api/wards/:id/report   → Full ward report data for offline PDF/CSV/Excel
 *
 * Ward data is defined statically (Mumbra & Kurla boundaries) and enriched
 * with real-time complaint statistics from the Supabase database.
 */
const express = require('express');
const supabase = require('../utils/supabase');
const { authenticate, requireOfficerOrAdmin } = require('../middleware/auth');
const crypto = require('crypto');
const router = express.Router();

// ── Ward Boundary Definitions ────────────────────────────────────────────────
// Real geographic boundaries for Mumbra & Kurla wards.
// In production, these would come from a GeoJSON file or database table.
const WARD_DEFINITIONS = [
  {
    id: 'ward-mumbra',
    name: 'Thane Mumbra Ward',
    officer: 'Officer Rajesh Kumar',
    contact: '+91 98765 43210',
    center: [19.1885, 73.0215],
    description: 'Mumbra is a densely populated township in Thane district (~20 km²), bounded by Parsik Hills to the west and Thane Creek to the east. A major suburb on the Central Railway line.',
    coordinates: [
      [19.163, 73.012], [19.165, 73.005], [19.170, 72.998], [19.176, 72.994],
      [19.183, 72.992], [19.190, 72.993], [19.196, 72.996], [19.203, 73.000],
      [19.208, 73.006], [19.212, 73.013], [19.214, 73.020], [19.213, 73.028],
      [19.210, 73.035], [19.205, 73.040], [19.198, 73.044], [19.190, 73.046],
      [19.183, 73.045], [19.176, 73.042], [19.170, 73.038], [19.166, 73.032],
      [19.163, 73.024], [19.162, 73.018],
    ]
  },
  {
    id: 'ward-kurla',
    name: 'Mumbai Kurla Ward (L Ward)',
    officer: 'Officer Sneha Patil',
    contact: '+91 91234 56789',
    center: [19.072, 72.884],
    description: 'Kurla (L Ward) is a major hub in Mumbai\'s eastern suburbs (~16 km²), bounded by the Mithi River to the west and extending to Ghatkopar in the east. A critical railway junction and commercial center.',
    coordinates: [
      [19.055, 72.860], [19.058, 72.855], [19.063, 72.853], [19.070, 72.852],
      [19.078, 72.854], [19.085, 72.856], [19.092, 72.860], [19.098, 72.866],
      [19.102, 72.874], [19.104, 72.882], [19.103, 72.890], [19.100, 72.898],
      [19.096, 72.904], [19.090, 72.908], [19.083, 72.910], [19.076, 72.910],
      [19.070, 72.908], [19.064, 72.904], [19.058, 72.898], [19.054, 72.890],
      [19.052, 72.880], [19.053, 72.870],
    ]
  },
  {
    id: 'ward-thakurli-kdmc',
    name: 'Thakurli KDMC E-Ward',
    officer: 'Officer Priya Deshmukh',
    contact: '+91 98765 11223',
    center: [19.2204, 73.0828],
    description: 'Thakurli is located in Thane district and is governed by the Kalyan-Dombivli Municipal Corporation (KDMC). It falls under the KDMC E-Ward covering parts of Dombivli East. A key suburban station on the Central Railway line between Kalyan and CSMT.',
    coordinates: [
      [19.210, 73.073], [19.212, 73.068], [19.215, 73.064], [19.219, 73.061],
      [19.224, 73.059], [19.229, 73.060], [19.233, 73.063], [19.236, 73.068],
      [19.237, 73.074], [19.236, 73.080], [19.233, 73.086], [19.229, 73.090],
      [19.224, 73.093], [19.219, 73.093], [19.214, 73.090], [19.211, 73.086],
      [19.209, 73.080], [19.209, 73.076],
    ]
  },
  {
    id: 'ward-vidyavihar-n',
    name: 'Mumbai Vidyavihar (N Ward)',
    officer: 'Officer Anand Mehta',
    contact: '+91 98200 55667',
    center: [19.085, 72.915],
    description: 'Vidyavihar falls under N Ward of the BMC, covering prominent educational institutions (like Somaiya Vidyavihar campus) and residential zones between Kurla and Ghatkopar.',
    coordinates: [
      [19.075, 72.905], [19.080, 72.902], [19.085, 72.901], [19.092, 72.902],
      [19.098, 72.905], [19.102, 72.910], [19.105, 72.918], [19.102, 72.925],
      [19.095, 72.930], [19.088, 72.928], [19.080, 72.922], [19.075, 72.915]
    ]
  },
  {
    id: 'ward-ghansoli-nmmc',
    name: 'Navi Mumbai Ghansoli (NMMC)',
    officer: 'Officer Suresh Gawde',
    contact: '+91 98330 12345',
    center: [19.155, 72.995],
    description: 'Ghansoli is a major node in Navi Mumbai under the Navi Mumbai Municipal Corporation (NMMC). It spans multiple sectors (Sectors 1-21, Ghansoli Gaothan, Talavali) along the Trans-Harbour railway line.',
    coordinates: [
      [19.140, 72.990], [19.145, 72.985], [19.152, 72.983], [19.160, 72.985],
      [19.165, 72.990], [19.168, 72.998], [19.165, 73.005], [19.158, 73.010],
      [19.150, 73.008], [19.142, 73.002], [19.140, 72.990]
    ]
  },
  {
    id: 'ward-vashi-nmmc',
    name: 'Navi Mumbai Vashi (NMMC)',
    officer: 'Officer Ramesh Kadam',
    contact: '+91 98112 33445',
    center: [19.0785, 72.9992],
    description: 'Vashi node is the primary commercial heart and gateway node of Navi Mumbai, beautifully planned by CIDCO under NMMC jurisdiction. Features Sector 17 commercial hub and Vashi station.',
    coordinates: [
      [19.068, 72.985], [19.075, 72.880], [19.088, 72.985], [19.092, 72.998],
      [19.088, 73.010], [19.075, 73.015], [19.068, 72.999], [19.068, 72.985]
    ]
  },
  {
    id: 'ward-nerul-nmmc',
    name: 'Navi Mumbai Nerul (NMMC)',
    officer: 'Officer Deepak Sawant',
    contact: '+91 98223 44556',
    center: [19.0330, 73.0190],
    description: 'Nerul is the largest residential node in Navi Mumbai, featuring Sector 15 Palm Beach, DY Patil stadium, and many educational institutes under NMMC governance.',
    coordinates: [
      [19.015, 73.010], [19.022, 73.000], [19.035, 73.002], [19.045, 73.012],
      [19.042, 73.028], [19.030, 73.035], [19.018, 73.028], [19.015, 73.010]
    ]
  },
  {
    id: 'ward-dombivli-east-kdmc',
    name: 'Dombivli East Ward (KDMC)',
    officer: 'Officer Sandeep Patil',
    contact: '+91 98990 88776',
    center: [19.2184, 73.0868],
    description: 'Dombivli East is a highly populated cultural and residential node in Thane district under Kalyan-Dombivli Municipal Corporation (KDMC) governance.',
    coordinates: [
      [19.205, 73.078], [19.210, 73.070], [19.222, 73.072], [19.228, 73.080],
      [19.228, 73.092], [19.215, 73.095], [19.208, 73.088], [19.205, 73.078]
    ]
  },
  {
    id: 'ward-kalyan-west-kdmc',
    name: 'Kalyan West Ward (KDMC)',
    officer: 'Officer Vijay Shinde',
    contact: '+91 98770 66554',
    center: [19.2403, 73.1305],
    description: 'Kalyan West is a prominent historic and residential hub governed by KDMC, containing the Kalyan Central junction and major municipal offices.',
    coordinates: [
      [19.228, 73.120], [19.235, 73.110], [19.248, 73.112], [19.255, 73.125],
      [19.252, 73.140], [19.240, 73.145], [19.230, 73.135], [19.228, 73.120]
    ]
  },
  {
    id: 'ward-ghatkopar-east',
    name: 'Mumbai Ghatkopar East (N Ward)',
    officer: 'Officer Neha Shah',
    contact: '+91 98110 55443',
    center: [19.0860, 72.9080],
    description: 'Ghatkopar East is a premium commercial and residential hub in BMC N-Ward, featuring broad roads, metro connectivity, and multiple clean parks.',
    coordinates: [
      [19.076, 72.898], [19.082, 72.893], [19.092, 72.895], [19.096, 72.905],
      [19.094, 72.918], [19.082, 72.920], [19.076, 72.910], [19.076, 72.898]
    ]
  },
  {
    id: 'ward-colaba',
    name: 'Mumbai Colaba (A Ward)',
    officer: 'Officer Milind Deora',
    contact: '+91 98111 22334',
    center: [18.9067, 72.8147],
    description: 'Colaba is the southernmost tip of Mumbai (A Ward), containing iconic landmarks such as the Gateway of India and the Taj Mahal Palace hotel.',
    coordinates: [
      [18.895, 72.805], [18.905, 72.798], [18.918, 72.808], [18.922, 72.822],
      [18.912, 72.832], [18.900, 72.825], [18.895, 72.805]
    ]
  },
  {
    id: 'ward-marinedrive',
    name: 'Mumbai Marine Drive (A Ward)',
    officer: 'Officer Sanjay Barve',
    contact: '+91 98222 33445',
    center: [18.9430, 72.8230],
    description: 'Marine Drive is a 3-kilometre-long promenade along the Netaji Subhash Chandra Bose Road in South Mumbai. A prominent BMC A-Ward coastal strip.',
    coordinates: [
      [18.928, 72.815], [18.938, 72.810], [18.952, 72.818], [18.955, 72.830],
      [18.943, 72.838], [18.932, 72.830], [18.928, 72.815]
    ]
  },
  {
    id: 'ward-malabarhill',
    name: 'Mumbai Malabar Hill (D Ward)',
    officer: 'Officer Aditya Thackeray',
    contact: '+91 98333 44556',
    center: [18.9548, 72.7985],
    description: 'Malabar Hill is a premium residential hill in South Mumbai (D Ward), containing the Hanging Gardens, Raj Bhavan, and the official residences of the Chief Minister.',
    coordinates: [
      [18.945, 72.790], [18.955, 72.785], [18.968, 72.792], [18.968, 72.805],
      [18.955, 72.810], [18.948, 72.802], [18.945, 72.790]
    ]
  },
  {
    id: 'ward-andheriwest',
    name: 'Mumbai Andheri West (K-West Ward)',
    officer: 'Officer Vinod Ghosalkar',
    contact: '+91 98114 45566',
    center: [19.1363, 72.8293],
    description: 'Andheri West is a bustling commercial and entertainment hub in Mumbai (BMC K-West Ward), containing Lokhandwala Complex, Versova Beach, and major production houses.',
    coordinates: [
      [19.125, 72.820], [19.135, 72.815], [19.148, 72.822], [19.152, 72.835],
      [19.140, 72.842], [19.128, 72.835], [19.125, 72.820]
    ]
  },
  {
    id: 'ward-bandrawest',
    name: 'Mumbai Bandra West (H-West Ward)',
    officer: 'Officer Ashish Shelar',
    contact: '+91 98225 56677',
    center: [19.0596, 72.8295],
    description: 'Bandra West is a trendy coastal suburb in Mumbai (BMC H-West Ward), known as the "Queen of the Suburbs". Home to Bandstand Promenade, Carter Road, and many celebrities.',
    coordinates: [
      [19.048, 72.820], [19.058, 72.815], [19.070, 72.822], [19.072, 72.835],
      [19.060, 72.842], [19.050, 72.835], [19.048, 72.820]
    ]
  },
  {
    id: 'ward-dadarwest',
    name: 'Mumbai Dadar West (G-North Ward)',
    officer: 'Officer Sada Sarvankar',
    contact: '+91 98336 67788',
    center: [19.0178, 72.8378],
    description: 'Dadar West is a prominent residential and shopping hub in Central Mumbai (BMC G-North Ward), featuring Shivaji Park, Dadar Chowpatty, and the iconic Siddhivinayak Temple.',
    coordinates: [
      [19.008, 72.830], [19.018, 72.825], [19.028, 72.832], [19.030, 72.845],
      [19.018, 72.850], [19.010, 72.842], [19.008, 72.830]
    ]
  },
  {
    id: 'ward-borivaliwest',
    name: 'Mumbai Borivali West (R-Central Ward)',
    officer: 'Officer Sunil Rane',
    contact: '+91 98447 78899',
    center: [19.2292, 72.8573],
    description: 'Borivali West is a highly residential suburb in Northern Mumbai (BMC R-Central Ward), bordering the scenic Sanjay Gandhi National Park and featuring Gorai Creek access.',
    coordinates: [
      [19.218, 72.850], [19.228, 72.845], [19.240, 72.852], [19.242, 72.865],
      [19.230, 72.870], [19.220, 72.862], [19.218, 72.850]
    ]
  },
  {
    id: 'ward-chembur' ,
    name: 'Mumbai Chembur East (M-West Ward)',
    officer: 'Officer Nawab Malik',
    contact: '+91 98558 89900',
    center: [19.0622, 72.8974],
    description: 'Chembur East is a green, historical suburb in Eastern Mumbai (BMC M-West Ward), famous for the industrial corridors, fine eateries, and the Bombay Presidency Golf Club.',
    coordinates: [
      [19.050, 72.890], [19.060, 72.885], [19.072, 72.892], [19.075, 72.905],
      [19.062, 72.912], [19.052, 72.905], [19.050, 72.890]
    ]
  }
];

/**
 * isPointInPolygon(lat, lng, polygon)
 * Ray-casting algorithm to check if a point is inside a polygon.
 * Used to determine which ward a complaint belongs to.
 */
function isPointInPolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * getWardStats(wardDef, allComplaints)
 * Calculates complaint statistics for a ward based on geo-fencing.
 */
function getWardStats(wardDef, allComplaints) {
  const wardComplaints = allComplaints.filter(c =>
    c.latitude && c.longitude &&
    isPointInPolygon(parseFloat(c.latitude), parseFloat(c.longitude), wardDef.coordinates)
  );

  const total = wardComplaints.length;
  const pending = wardComplaints.filter(c => c.status === 'Pending').length;
  const approved = wardComplaints.filter(c => c.status === 'Approved').length;
  const resolved = wardComplaints.filter(c => c.status === 'resolved').length;
  const inProgress = wardComplaints.filter(c => c.status === 'in_progress').length;
  const rejected = wardComplaints.filter(c => c.status === 'Rejected').length;

  // Category breakdown
  const categories = {};
  wardComplaints.forEach(c => {
    const cat = c.type || 'Unknown';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  // Severity breakdown
  const severities = { High: 0, Medium: 0, Low: 0 };
  wardComplaints.forEach(c => {
    if (c.severity && severities.hasOwnProperty(c.severity)) {
      severities[c.severity]++;
    }
  });

  // Monthly trend (last 6 months)
  const monthlyTrend = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyTrend[key] = { total: 0, resolved: 0 };
  }
  wardComplaints.forEach(c => {
    const d = new Date(c.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyTrend[key]) {
      monthlyTrend[key].total++;
      if (c.status === 'resolved') monthlyTrend[key].resolved++;
    }
  });

  // Determine load level for color coding
  let loadLevel = 'low';
  if (total > 20) loadLevel = 'high';
  else if (total > 8) loadLevel = 'medium';

  return {
    total,
    pending,
    approved,
    resolved,
    inProgress,
    rejected,
    categories,
    severities,
    monthlyTrend,
    loadLevel,
    complaints: wardComplaints.filter(c => c.status !== 'Pending' && c.status !== 'Rejected').map(c => ({
      id: c.id,
      type: c.type,
      severity: c.severity,
      status: c.status,
      area_name: c.area_name,
      description: c.description,
      created_at: c.created_at,
      latitude: c.latitude,
      longitude: c.longitude,
    }))
  };
}

// ── GET /api/wards/map ───────────────────────────────────────────────────────
// Returns all ward data with GeoJSON boundaries and complaint statistics.
// Used by the Ward Map page to render colored polygons.
router.get('/map', async (req, res) => {
  try {
    // Fetch ALL complaints (no status filter) to compute stats
    const { data: complaints, error } = await supabase
      .from('complaints')
      .select('id, type, severity, status, area_name, description, latitude, longitude, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    const wards = WARD_DEFINITIONS.map(wardDef => {
      const stats = getWardStats(wardDef, complaints || []);
      return {
        id: wardDef.id,
        name: wardDef.name,
        officer: wardDef.officer,
        contact: wardDef.contact,
        center: wardDef.center,
        description: wardDef.description,
        coordinates: wardDef.coordinates,
        loadLevel: stats.loadLevel,
        stats: {
          total: stats.total,
          pending: stats.pending,
          resolved: stats.resolved,
          inProgress: stats.inProgress,
          approved: stats.approved,
          severities: stats.severities,
          categories: stats.categories,
        }
      };
    });

    res.json({ wards, totalComplaints: (complaints || []).length });
  } catch (err) {
    console.error('[Wards] Map fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/wards/:id/stats ─────────────────────────────────────────────────
// Returns detailed statistics for a specific ward, including monthly trends.
router.get('/:id/stats', async (req, res) => {
  try {
    const wardDef = WARD_DEFINITIONS.find(w => w.id === req.params.id);
    if (!wardDef) return res.status(404).json({ error: 'Ward not found' });

    const { data: complaints, error } = await supabase
      .from('complaints')
      .select('id, type, severity, status, area_name, description, latitude, longitude, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    const stats = getWardStats(wardDef, complaints || []);

    res.json({
      ward: {
        id: wardDef.id,
        name: wardDef.name,
        officer: wardDef.officer,
        contact: wardDef.contact,
        center: wardDef.center,
        description: wardDef.description,
      },
      stats
    });
  } catch (err) {
    console.error('[Wards] Stats fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/wards/:id/report ────────────────────────────────────────────────
// Returns full report data for a ward, intended for PDF/offline generation.
// Includes a unique report ID and timestamp.
router.get('/:id/report', async (req, res) => {
  try {
    const wardDef = WARD_DEFINITIONS.find(w => w.id === req.params.id);
    if (!wardDef) return res.status(404).json({ error: 'Ward not found' });

    const { data: complaints, error } = await supabase
      .from('complaints')
      .select('id, type, severity, status, area_name, description, latitude, longitude, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    const stats = getWardStats(wardDef, complaints || []);
    const reportId = `RPT-${wardDef.id.toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const generatedAt = new Date().toISOString();

    res.json({
      reportId,
      generatedAt,
      ward: {
        id: wardDef.id,
        name: wardDef.name,
        officer: wardDef.officer,
        contact: wardDef.contact,
        center: wardDef.center,
        description: wardDef.description,
        coordinates: wardDef.coordinates,
      },
      stats,
      remarks: req.query.remarks || 'No additional remarks provided.',
    });
  } catch (err) {
    console.error('[Wards] Report fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.WARD_DEFINITIONS = WARD_DEFINITIONS;
module.exports.isPointInPolygon = isPointInPolygon;
