import Stripe from 'stripe';
import db from '../config/database.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handleStripeWebhook = async (req, res) => {
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

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        await db('payments')
          .where({ stripe_payment_id: paymentIntent.id })
          .update({ status: 'held' });
        console.log(`Payment ${paymentIntent.id} held in escrow`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        await db('payments')
          .where({ stripe_payment_id: paymentIntent.id })
          .update({ status: 'pending' });
        console.log(`Payment ${paymentIntent.id} failed`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        await db('payments')
          .where({ stripe_payment_id: charge.payment_intent })
          .update({ status: 'refunded' });
        console.log(`Payment ${charge.payment_intent} refunded`);
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};
