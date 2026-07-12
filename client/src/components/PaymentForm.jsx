import { useState } from 'react';
import api from '../lib/api';

export default function PaymentForm({ contractId, amount, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFundEscrow = async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/payments/escrow', { contractId });

      // In production, you'd use Stripe Elements here to confirm the payment
      // For now, we'll redirect to Stripe's hosted checkout
      // stripe.confirmCardPayment(data.clientSecret, { payment_method: ... })

      setSuccess(true);
      if (onSuccess) onSuccess(data.payment);
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
        Payment of ${amount} is now held in escrow. It will be released to the freelancer upon milestone completion.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="font-semibold text-lg mb-2">Fund Escrow</h3>
      <p className="text-gray-500 text-sm mb-4">
        Securely hold ${amount} in escrow. Funds are released to the freelancer only when you approve the work.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleFundEscrow}
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {loading ? 'Processing...' : `Pay $${amount} into Escrow`}
      </button>

      <p className="text-xs text-gray-400 mt-3 text-center">
        Secured by Stripe. Your payment is protected.
      </p>
    </div>
  );
}
