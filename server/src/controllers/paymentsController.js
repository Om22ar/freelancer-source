import Stripe from 'stripe';
import db from '../config/database.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create a payment intent (escrow deposit)
export const createPaymentIntent = async (req, res) => {
  try {
    const { contractId } = req.body;
    const userId = req.user.id;

    // Verify contract exists and user is the client
    const contract = await db('contracts')
      .where({ id: contractId, client_id: userId, status: 'active' })
      .first();

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found or unauthorized' });
    }

    // Check if payment already exists for this contract
    const existingPayment = await db('payments')
      .where({ contract_id: contractId })
      .whereIn('status', ['pending', 'held'])
      .first();

    if (existingPayment) {
      return res.status(409).json({ error: 'Payment already initiated for this contract' });
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(contract.amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        contractId: contract.id,
        clientId: userId,
        freelancerId: contract.freelancer_id
      },
      payment_method_types: ['card']
    });

    // Store payment record
    const [payment] = await db('payments')
      .insert({
        contract_id: contractId,
        amount: contract.amount,
        stripe_payment_id: paymentIntent.id,
        status: 'pending'
      })
      .returning('*');

    res.status(201).json({
      payment,
      clientSecret: paymentIntent.client_secret
    });
  } catch (err) {
    console.error('Create payment intent error:', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
};

// Confirm payment was successful (called after Stripe confirms)
export const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    // Verify with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not yet confirmed by Stripe' });
    }

    // Update payment status to held (escrow)
    const [payment] = await db('payments')
      .where({ stripe_payment_id: paymentIntentId })
      .update({ status: 'held' })
      .returning('*');

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    res.json({ payment, message: 'Payment held in escrow' });
  } catch (err) {
    console.error('Confirm payment error:', err);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
};

// Release escrow payment to freelancer (client approves work)
export const releasePayment = async (req, res) => {
  try {
    const { contractId } = req.body;
    const userId = req.user.id;

    // Verify client owns this contract
    const contract = await db('contracts')
      .where({ id: contractId, client_id: userId })
      .first();

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found or unauthorized' });
    }

    // Find held payment
    const payment = await db('payments')
      .where({ contract_id: contractId, status: 'held' })
      .first();

    if (!payment) {
      return res.status(404).json({ error: 'No held payment found for this contract' });
    }

    // Release payment (in production, trigger Stripe Transfer to freelancer's connected account)
    await db.transaction(async (trx) => {
      await trx('payments')
        .where({ id: payment.id })
        .update({ status: 'released' });

      await trx('contracts')
        .where({ id: contractId })
        .update({ status: 'completed', completed_at: new Date() });

      await trx('jobs')
        .where({ id: contract.job_id })
        .update({ status: 'completed', updated_at: new Date() });
    });

    res.json({ message: 'Payment released to freelancer. Contract completed.' });
  } catch (err) {
    console.error('Release payment error:', err);
    res.status(500).json({ error: 'Failed to release payment' });
  }
};

// Request refund (dispute scenario)
export const requestRefund = async (req, res) => {
  try {
    const { contractId, reason } = req.body;
    const userId = req.user.id;

    const contract = await db('contracts')
      .where({ id: contractId, client_id: userId })
      .first();

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found or unauthorized' });
    }

    const payment = await db('payments')
      .where({ contract_id: contractId, status: 'held' })
      .first();

    if (!payment) {
      return res.status(404).json({ error: 'No held payment to refund' });
    }

    // Create Stripe refund
    await stripe.refunds.create({
      payment_intent: payment.stripe_payment_id,
      reason: 'requested_by_customer'
    });

    await db.transaction(async (trx) => {
      await trx('payments')
        .where({ id: payment.id })
        .update({ status: 'refunded' });

      await trx('contracts')
        .where({ id: contractId })
        .update({ status: 'disputed' });
    });

    res.json({ message: 'Refund initiated. Contract marked as disputed.' });
  } catch (err) {
    console.error('Refund error:', err);
    res.status(500).json({ error: 'Failed to process refund' });
  }
};

// Get payment history for user
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const userField = role === 'client' ? 'contracts.client_id' : 'contracts.freelancer_id';

    const payments = await db('payments')
      .select(
        'payments.*',
        'contracts.job_id',
        'jobs.title as job_title',
        'freelancer.first_name as freelancer_name',
        'client.first_name as client_name'
      )
      .join('contracts', 'payments.contract_id', 'contracts.id')
      .join('jobs', 'contracts.job_id', 'jobs.id')
      .join('users as freelancer', 'contracts.freelancer_id', 'freelancer.id')
      .join('users as client', 'contracts.client_id', 'client.id')
      .where(userField, userId)
      .orderBy('payments.created_at', 'desc');

    res.json(payments);
  } catch (err) {
    console.error('Payment history error:', err);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
};
