import stripe from '../config/stripe.js';
import db from '../config/database.js';

// Create a payment intent and hold funds in escrow
export const createEscrowPayment = async (req, res) => {
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

    // Create Stripe payment intent (capture later for escrow)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(contract.amount * 100), // cents
      currency: 'usd',
      capture_method: 'manual', // hold funds, release later
      metadata: {
        contract_id: contractId,
        client_id: userId,
        freelancer_id: contract.freelancer_id
      }
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
    console.error('Create escrow payment error:', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
};

// Release escrow funds to freelancer (milestone completed)
export const releasePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    // Get payment and verify ownership
    const payment = await db('payments').where({ id: paymentId }).first();
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const contract = await db('contracts')
      .where({ id: payment.contract_id, client_id: userId })
      .first();

    if (!contract) {
      return res.status(403).json({ error: 'Only the client can release payments' });
    }

    if (payment.status !== 'held') {
      return res.status(400).json({ error: 'Payment is not in escrow' });
    }

    // Capture the payment intent (releases funds)
    await stripe.paymentIntents.capture(payment.stripe_payment_id);

    // Update payment status
    await db('payments').where({ id: paymentId }).update({ status: 'released' });

    // Check if this completes the contract
    const pendingPayments = await db('payments')
      .where({ contract_id: contract.id })
      .whereIn('status', ['pending', 'held'])
      .count();

    if (Number(pendingPayments[0].count) === 0) {
      await db('contracts')
        .where({ id: contract.id })
        .update({ status: 'completed', completed_at: new Date() });
    }

    res.json({ message: 'Payment released to freelancer', status: 'released' });
  } catch (err) {
    console.error('Release payment error:', err);
    res.status(500).json({ error: 'Failed to release payment' });
  }
};

// Request a refund (dispute scenario)
export const refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const payment = await db('payments').where({ id: paymentId }).first();
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const contract = await db('contracts')
      .where({ id: payment.contract_id, client_id: userId })
      .first();

    if (!contract) {
      return res.status(403).json({ error: 'Only the client can request refunds' });
    }

    if (payment.status !== 'held') {
      return res.status(400).json({ error: 'Can only refund held payments' });
    }

    // Cancel the payment intent (refunds the hold)
    await stripe.paymentIntents.cancel(payment.stripe_payment_id);

    await db('payments').where({ id: paymentId }).update({ status: 'refunded' });

    res.json({ message: 'Payment refunded', status: 'refunded' });
  } catch (err) {
    console.error('Refund payment error:', err);
    res.status(500).json({ error: 'Failed to refund payment' });
  }
};

// Get payment history for the logged-in user
export const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const userField = role === 'client' ? 'client_id' : 'freelancer_id';

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
      .where(`contracts.${userField}`, userId)
      .orderBy('payments.created_at', 'desc');

    res.json(payments);
  } catch (err) {
    console.error('Get payment history error:', err);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
};

// Stripe webhook handler
export const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  switch (event.type) {
    case 'payment_intent.amount_capturable_updated': {
      // Funds are now held in escrow
      const paymentIntent = event.data.object;
      await db('payments')
        .where({ stripe_payment_id: paymentIntent.id })
        .update({ status: 'held' });
      break;
    }

    case 'payment_intent.succeeded': {
      // Payment captured (released to freelancer)
      const paymentIntent = event.data.object;
      await db('payments')
        .where({ stripe_payment_id: paymentIntent.id })
        .update({ status: 'released' });
      break;
    }

    case 'payment_intent.canceled': {
      // Payment refunded
      const paymentIntent = event.data.object;
      await db('payments')
        .where({ stripe_payment_id: paymentIntent.id })
        .update({ status: 'refunded' });
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      await db('payments')
        .where({ stripe_payment_id: paymentIntent.id })
        .update({ status: 'pending' });
      break;
    }

    default:
      console.log(`Unhandled webhook event: ${event.type}`);
  }

  res.json({ received: true });
};
