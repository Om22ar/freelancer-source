import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import useAuthStore from '../store/authStore';

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [statsRes, contractsRes, activityRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/contracts'),
          api.get('/dashboard/activity')
        ]);
        setStats(statsRes.data);
        setContracts(contractsRes.data);
        setRecentActivity(activityRes.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.firstName}</h1>
          <p className="text-gray-500 mt-1 capitalize">{user?.role} Dashboard</p>
        </div>
        {user?.role === 'client' ? (
          <Link to="/jobs/new" className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition">
            Post a Job
          </Link>
        ) : (
          <Link to="/jobs" className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition">
            Find Work
          </Link>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-6 mb-10">
        <StatCard
          label={user?.role === 'client' ? 'Total Spent' : 'Total Earned'}
          value={`$${stats?.totalAmount?.toLocaleString() || '0'}`}
          sub={user?.role === 'client' ? 'All time' : 'All time'}
          accent
        />
        <StatCard
          label="Active Contracts"
          value={stats?.activeContracts || 0}
          sub="In progress"
        />
        <StatCard
          label={user?.role === 'client' ? 'Open Jobs' : 'Pending Proposals'}
          value={stats?.openItems || 0}
          sub={user?.role === 'client' ? 'Accepting bids' : 'Awaiting response'}
        />
        <StatCard
          label="Completed"
          value={stats?.completedContracts || 0}
          sub="All time"
        />
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Active Contracts */}
        <div className="col-span-2">
          <h2 className="text-xl font-semibold mb-4">Active Contracts</h2>
          {contracts.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500">
              No active contracts yet. {user?.role === 'client' ? 'Post a job to get started!' : 'Browse jobs and submit proposals.'}
            </div>
          ) : (
            <div className="space-y-4">
              {contracts.map(contract => (
                <ContractCard key={contract.id} contract={contract} userRole={user?.role} />
              ))}
            </div>
          )}
        </div>

        {/* Earnings / Spending breakdown */}
        <div className="col-span-1">
          <h2 className="text-xl font-semibold mb-4">
            {user?.role === 'client' ? 'Spending' : 'Earnings'}
          </h2>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="space-y-4">
              <EarningRow label="This Month" amount={stats?.thisMonth || 0} />
              <EarningRow label="Last Month" amount={stats?.lastMonth || 0} />
              <EarningRow label="This Year" amount={stats?.thisYear || 0} />
              <div className="pt-4 border-t">
                <EarningRow label="Pending Release" amount={stats?.pendingAmount || 0} highlight />
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <h2 className="text-xl font-semibold mt-8 mb-4">Recent Activity</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      item.type === 'payment' ? 'bg-green-500' :
                      item.type === 'bid' ? 'bg-blue-500' :
                      item.type === 'message' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`} />
                    <div>
                      <p className="text-sm text-gray-700">{item.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${accent ? 'text-indigo-600' : 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function ContractCard({ contract, userRole }) {
  const otherParty = userRole === 'client'
    ? `${contract.freelancer_first_name} ${contract.freelancer_last_name}`
    : `${contract.client_first_name} ${contract.client_last_name}`;

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-700',
    disputed: 'bg-red-100 text-red-700'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{contract.job_title}</h3>
          <p className="text-sm text-gray-500 mt-1">with {otherParty}</p>
        </div>
        <div className="text-right">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[contract.status] || 'bg-gray-100 text-gray-700'}`}>
            {contract.status}
          </span>
          <p className="text-lg font-bold mt-2">${contract.amount}</p>
        </div>
      </div>
      <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
        <span>Started {new Date(contract.started_at).toLocaleDateString()}</span>
        {contract.delivery_time && <span>Delivery: {contract.delivery_time}</span>}
      </div>
    </div>
  );
}

function EarningRow({ label, amount, highlight }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-indigo-600' : 'text-gray-900'}`}>
        ${amount.toLocaleString()}
      </span>
    </div>
  );
}
