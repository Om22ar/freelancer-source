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

  const handleRelease = async (paymentId) => {
    if (!confirm('Release payment to freelancer? This cannot be undone.')) return;
    try {
      await api.post(`/payments/${paymentId}/release`);
      setPayments(payments.map(p => p.id === paymentId ? { ...p, status: 'released' } : p));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to release payment');
    }
  };

  const handleRefund = async (paymentId) => {
    if (!confirm('Refund this payment? Funds will be returned to you.')) return;
    try {
      await api.post(`/payments/${paymentId}/refund`);
      setPayments(payments.map(p => p.id === paymentId ? { ...p, status: 'refunded' } : p));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to refund payment');
    }
  };

  const statusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      held: 'bg-blue-100 text-blue-700',
      released: 'bg-green-100 text-green-700',
      refunded: 'bg-gray-100 text-gray-700'
    };
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status === 'held' ? 'In Escrow' : status}
      </span>
    );
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading payments...</div>;

  // Calculate totals
  const totalReleased = payments.filter(p => p.status === 'released').reduce((sum, p) => sum + Number(p.amount), 0);
  const totalHeld = payments.filter(p => p.status === 'held').reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        {user?.role === 'client' ? 'Payment History' : 'Earnings'}
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-500">{user?.role === 'client' ? 'Total Paid' : 'Total Earned'}</p>
          <p className="text-3xl font-bold text-green-600 mt-2">${totalReleased.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-500">In Escrow</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">${totalHeld.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-sm text-gray-500">Total Transactions</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{payments.length}</p>
        </div>
      </div>

      {/* Payment list */}
      {payments.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500">
          No payment history yet.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Project</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">{user?.role === 'client' ? 'Freelancer' : 'Client'}</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Amount</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Date</th>
                {user?.role === 'client' && <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map(payment => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{payment.job_title}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {user?.role === 'client' ? payment.freelancer_name : payment.client_name}
                  </td>
                  <td className="px-6 py-4 font-semibold">${Number(payment.amount).toLocaleString()}</td>
                  <td className="px-6 py-4">{statusBadge(payment.status)}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </td>
                  {user?.role === 'client' && (
                    <td className="px-6 py-4">
                      {payment.status === 'held' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRelease(payment.id)}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg font-medium hover:bg-green-700"
                          >
                            Release
                          </button>
                          <button
                            onClick={() => handleRefund(payment.id)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-lg font-medium hover:bg-red-100"
                          >
                            Refund
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
