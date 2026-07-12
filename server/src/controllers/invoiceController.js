import db from '../config/database.js';

export const generateInvoice = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const payment = await db('payments')
      .select(
        'payments.*',
        'contracts.job_id',
        'contracts.client_id',
        'contracts.freelancer_id',
        'jobs.title as job_title',
        'jobs.description as job_description',
        'client.first_name as client_first_name',
        'client.last_name as client_last_name',
        'client.email as client_email',
        'freelancer.first_name as freelancer_first_name',
        'freelancer.last_name as freelancer_last_name',
        'freelancer.email as freelancer_email'
      )
      .join('contracts', 'payments.contract_id', 'contracts.id')
      .join('jobs', 'contracts.job_id', 'jobs.id')
      .join('users as client', 'contracts.client_id', 'client.id')
      .join('users as freelancer', 'contracts.freelancer_id', 'freelancer.id')
      .where('payments.id', paymentId)
      .first();

    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    // Verify user is part of this contract
    if (payment.client_id !== userId && payment.freelancer_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const invoice = {
      invoiceNumber: `INV-${payment.id.slice(0, 8).toUpperCase()}`,
      date: new Date(payment.created_at).toLocaleDateString(),
      status: payment.status,
      project: {
        title: payment.job_title,
        description: payment.job_description
      },
      client: {
        name: `${payment.client_first_name} ${payment.client_last_name}`,
        email: payment.client_email
      },
      freelancer: {
        name: `${payment.freelancer_first_name} ${payment.freelancer_last_name}`,
        email: payment.freelancer_email
      },
      amount: Number(payment.amount),
      platformFee: Number(payment.amount) * 0.05, // 5% platform fee
      netAmount: Number(payment.amount) * 0.95,
      currency: 'USD',
      paymentMethod: 'Stripe',
      stripeId: payment.stripe_payment_id
    };

    res.json(invoice);
  } catch (err) {
    console.error('Generate invoice error:', err);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const userField = role === 'client' ? 'client_id' : 'freelancer_id';

    const invoices = await db('payments')
      .select(
        'payments.id',
        'payments.amount',
        'payments.status',
        'payments.created_at',
        'jobs.title as job_title',
        'freelancer.first_name as freelancer_name',
        'client.first_name as client_name'
      )
      .join('contracts', 'payments.contract_id', 'contracts.id')
      .join('jobs', 'contracts.job_id', 'jobs.id')
      .join('users as freelancer', 'contracts.freelancer_id', 'freelancer.id')
      .join('users as client', 'contracts.client_id', 'client.id')
      .where(`contracts.${userField}`, userId)
      .where('payments.status', 'released')
      .orderBy('payments.created_at', 'desc');

    res.json(invoices);
  } catch (err) {
    console.error('Get invoices error:', err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};
