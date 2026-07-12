import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

const CATEGORIES = ['Web Development', 'Mobile App', 'Design', 'Writing', 'Marketing', 'Data Science', 'DevOps', 'Other'];

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', category: '', budgetType: '' });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const fetchJobs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page });
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.budgetType) params.append('budgetType', filters.budgetType);

      const { data } = await api.get(`/jobs?${params}`);
      setJobs(data.jobs);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Browse Jobs</h1>
        <Link
          to="/jobs/new"
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          Post a Job
        </Link>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex gap-4 mb-8 flex-wrap">
        <input
          type="text"
          placeholder="Search jobs..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="flex-1 min-w-[200px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select
          value={filters.budgetType}
          onChange={(e) => setFilters({ ...filters, budgetType: e.target.value })}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Any Budget Type</option>
          <option value="fixed">Fixed Price</option>
          <option value="hourly">Hourly</option>
        </select>
        <button type="submit" className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800">
          Search
        </button>
      </form>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No jobs found. Try adjusting your filters.</div>
      ) : (
        <div className="space-y-4">
          {jobs.map(job => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="block bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{job.title}</h2>
                  <p className="text-gray-500 mt-1">{job.first_name} {job.last_name} &middot; {job.category}</p>
                  <p className="text-gray-600 mt-2 line-clamp-2">{job.description}</p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {job.skills_required?.slice(0, 4).map(skill => (
                      <span key={skill} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{skill}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-6">
                  <div className="text-lg font-bold text-gray-900">
                    ${job.budget_min} - ${job.budget_max}
                  </div>
                  <div className="text-sm text-gray-500">{job.budget_type}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: pagination.pages }, (_, i) => (
            <button
              key={i}
              onClick={() => fetchJobs(i + 1)}
              className={`px-4 py-2 rounded-lg ${pagination.page === i + 1 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
