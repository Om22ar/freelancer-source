import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import useAuthStore from '../store/authStore';

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState({ amount: '', deliveryTime: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const { data } = await api.get(`/jobs/${id}`);
        setJob(data);
      } catch (err) {
        console.error('Failed to fetch job:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const handleSubmitBid = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/bids', {
        jobId: id,
        amount: Number(proposal.amount),
        deliveryTime: proposal.deliveryTime,
        proposal: proposal.text
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit bid:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!job) return <div className="text-center py-12 text-gray-500">Job not found</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid grid-cols-3 gap-8">
        {/* Main content */}
        <div className="col-span-2">
          <span className="text-sm font-medium text-indigo-600 uppercase tracking-wide">{job.category}</span>
          <h1 className="text-3xl font-bold mt-2">{job.title}</h1>
          <p className="text-gray-500 mt-2">Posted by {job.first_name} {job.last_name}</p>

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{job.description}</p>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Skills Required</h2>
            <div className="flex gap-2 flex-wrap">
              {job.skills_required?.map(skill => (
                <span key={skill} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">{skill}</span>
              ))}
            </div>
          </div>

          {/* Bid form for freelancers */}
          {user?.role === 'freelancer' && !submitted && (
            <div className="mt-10 bg-gray-50 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Submit a Proposal</h2>
              <form onSubmit={handleSubmitBid} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Bid ($)</label>
                    <input
                      type="number"
                      value={proposal.amount}
                      onChange={(e) => setProposal({ ...proposal, amount: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter amount"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Time</label>
                    <input
                      type="text"
                      value={proposal.deliveryTime}
                      onChange={(e) => setProposal({ ...proposal, deliveryTime: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. 2 weeks"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cover Letter</label>
                  <textarea
                    value={proposal.text}
                    onChange={(e) => setProposal({ ...proposal, text: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-32"
                    placeholder="Explain why you're the best fit for this job..."
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Proposal'}
                </button>
              </form>
            </div>
          )}

          {submitted && (
            <div className="mt-10 bg-green-50 border border-green-200 text-green-700 p-6 rounded-xl">
              Your proposal has been submitted! The client will review it shortly.
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl p-6 sticky top-8">
            <div className="text-2xl font-bold">${job.budget_min} - ${job.budget_max}</div>
            <div className="text-gray-500 text-sm mt-1 capitalize">{job.budget_type} price</div>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Duration</span>
                <span className="font-medium">{job.duration || 'Not specified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Proposals</span>
                <span className="font-medium">{job.bidCount} submitted</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="font-medium capitalize">{job.status}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-2">About the Client</h3>
              <div className="flex items-center gap-3">
                {job.avatar_url ? (
                  <img src={job.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-medium text-gray-600">
                    {job.first_name?.[0]}{job.last_name?.[0]}
                  </div>
                )}
                <div>
                  <div className="font-medium">{job.first_name} {job.last_name}</div>
                  {job.is_verified && <span className="text-xs text-green-600">Verified</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
