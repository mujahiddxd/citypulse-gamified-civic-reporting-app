import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const COLORS = ['var(--primary-700)', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0'];

const AdminAnalytics = () => {
  const [timeData, setTimeData] = useState([]);
  const [typeData, setTypeData] = useState([]);
  const [areaData, setAreaData] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    if (session?.access_token) localStorage.setItem('access_token', session.access_token);
    fetchAll();
  }, [session?.access_token]);

  const fetchAll = async () => {
    try {
      const [time, type, area, users] = await Promise.all([
        api.get('/analytics/complaints-over-time'),
        api.get('/analytics/type-distribution'),
        api.get('/analytics/area-counts'),
        api.get('/analytics/top-users'),
      ]);
      setTimeData(time.data.slice(-30));
      setTypeData(type.data);
      setAreaData(area.data.slice(0, 8));
      setTopUsers(users.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const CHART_STYLE = { background: 'transparent', fontSize: '11px' };
  const AXIS_STYLE = { fill: '#757575', fontSize: '10px' };
  const TOOLTIP_STYLE = { background: '#1F1F1F', border: '1px solid #333', borderRadius: '8px', color: '#F5F5F5', fontSize: '0.8rem' };

  if (loading) return <AdminLayout title="Analytics"><div>Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="📈 Analytics">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Complaints Over Time */}
        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', textTransform: 'uppercase', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
            📅 Complaints Over Time (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={timeData} style={CHART_STYLE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="date" tick={AXIS_STYLE} tickFormatter={d => d.slice(5)} />
              <YAxis tick={AXIS_STYLE} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="var(--primary-700)" strokeWidth={2} dot={false} name="Total" />
              <Line type="monotone" dataKey="approved" stroke="#4CAF50" strokeWidth={2} dot={false} name="Approved" />
              <Line type="monotone" dataKey="rejected" stroke="#FF9800" strokeWidth={2} dot={false} name="Rejected" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <div className="grid grid-2">
          {/* Type Distribution */}
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', textTransform: 'uppercase', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
              🥧 Complaint Type Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Area Counts */}
          <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', textTransform: 'uppercase', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
              📍 Area-wise Complaint Count
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={areaData} layout="vertical" style={CHART_STYLE}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={false} />
                <XAxis type="number" tick={AXIS_STYLE} />
                <YAxis dataKey="area" type="category" tick={AXIS_STYLE} width={100} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="var(--primary-700)" radius={[0, 4, 4, 0]} name="Complaints" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Top Users by XP */}
        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', textTransform: 'uppercase', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
            🏆 Top 10 Users by XP
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topUsers} layout="vertical" style={CHART_STYLE}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" horizontal={false} />
              <XAxis type="number" tick={AXIS_STYLE} />
              <YAxis dataKey="username" type="category" tick={AXIS_STYLE} width={100} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="xp" fill="#FFD700" radius={[0, 4, 4, 0]} name="XP" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
