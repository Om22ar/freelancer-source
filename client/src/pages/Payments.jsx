import { useState, useEffect } from 'react';
import api from '../lib/api';
import useAuthStore from '../store/authStore';

export default function Payments() {
  const user = useAuthStore((state) => state.user);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const { data } = await api.get('/payments/history');
        setPayments(data);
      } catch (err) {
        console.error('Failed to fetch payments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  const handleRelease = async (contractId) => {
    if (!confirm('Release payment to freelancer? This cannot be undone.')) return;
    try {
      await api.post('/payments/release', { contractId });
      setPayments((prev) =>
        prev.map((p) =>
          p.contract_id === contractId ? { ...p, status: 'released' } : p
        )
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to release payment');
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    held: 'bg-blue-100 text-blue-700',
    released: 'bg-green-100 text-green-700',
    refunded: 'bg-red-100 text-red-700'
  };

  const statusLabels = {
    pending: 'Processing',
    held: 'In Escrow',
    released: 'Paid',
    refunded: 'Refunded'
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading payments...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">
        {user?.role === 'client' ? 'Payment History' : 'Earnings'}
      </h1>
      <p className="text-gray-500 mb-8">
        {user?.role === 'client'
          ? 'Track your payments and release funds to freelancers'
          : 'View your earnings from completed contracts'}
      </p>

      {payments.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-12 text-center text-gray-500">
          No payment history yet.
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white border border-gray-200 rounded-xl p-6 flex items-center justify-between"
            >
              <div>
                <h3 className="font-semibold text-gray-900">{payment.job_title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {user?.role === 'client' ? `To: ${payment.freelancer_name}` : `From: ${payment.client_name}`}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(payment.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[payment.status]}`}>
                  {statusLabels[payment.status]}
                </span>
                <span className="text-xl font-bold text-gray-900">${payment.amount}</span>

                {user?.role === 'client' && payment.status === 'held' && (
                  <button
                    onClick={() => handleRelease(payment.contract_id)}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg font-medium hover:bg-green-700 transition"
                  >
                    Release
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {payments.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-xl p-6 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Total {user?.role === 'client' ? 'Spent' : 'Earned'}</p>
            <p className="text-2xl font-bold text-gray-900">
              ${payments
                .filter((p) => p.status === 'released')
                .reduce((sum, p) => sum + Number(p.amount), 0)
                .toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">In Escrow</p>
            <p className="text-2xl font-bold text-indigo-600">
              ${payments
                .filter((p) => p.status === 'held')
                .reduce((sum, p) => sum + Number(p.amount), 0)
                .toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Transactions</p>
            <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
          </div>
        </div>
      )}
    </div>
  );
}
