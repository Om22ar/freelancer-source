import { useState } from 'react';
import api from '../lib/api';

export default function PaymentCheckout({ contractId, amount, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('initial'); // initial, processing, success

  const handleFundEscrow = async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/payments/create-intent', { contractId });

      // In production, you'd use Stripe Elements here to collect card details
      // and confirm the payment intent with data.clientSecret
      // For now, simulate the flow:
      setStep('processing');

      // After Stripe confirms (via webhook or client-side confirmation)
      // Call confirm endpoint
      setTimeout(async () => {
        try {
          await api.post('/payments/confirm', {
            paymentIntentId: data.payment.stripe_payment_id
          });
          setStep('success');
          onSuccess?.();
        } catch (err) {
          setError('Payment confirmation failed. Check your payment method.');
          setStep('initial');
        }
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initiate payment');
      setStep('initial');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="text-3xl mb-2">✓</div>
        <h3 className="font-semibold text-green-700">Payment Secured</h3>
        <p className="text-sm text-green-600 mt-1">${amount} held in escrow until you approve the work.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="font-semibold text-gray-900 mb-2">Fund Escrow</h3>
      <p className="text-sm text-gray-500 mb-4">
        Deposit <span className="font-bold">${amount}</span> into escrow. Funds are held securely until you approve the freelancer's work.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleFundEscrow}
        disabled={loading || step === 'processing'}
        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {step === 'processing' ? 'Processing payment...' : loading ? 'Initiating...' : `Pay $${amount} into Escrow`}
      </button>

      <p className="text-xs text-gray-400 mt-3 text-center">
        Secured by Stripe. Your card will be charged immediately but funds are only released when you approve.
      </p>
    </div>
  );
}
