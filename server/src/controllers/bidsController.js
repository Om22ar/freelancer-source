import db from '../config/database.js';

export const submitBid = async (req, res) => {
  try {
    const { jobId, amount, deliveryTime, proposal } = req.body;

    // Check job exists and is open
    const job = await db('jobs').where({ id: jobId, status: 'open' }).first();
    if (!job) {
      return res.status(404).json({ error: 'Job not found or no longer accepting bids' });
    }

    // Prevent client from bidding on their own job
    if (job.client_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot bid on your own job' });
    }

    // Prevent duplicate bids
    const existingBid = await db('bids').where({ job_id: jobId, freelancer_id: req.user.id }).first();
    if (existingBid) {
      return res.status(409).json({ error: 'You already submitted a bid for this job' });
    }

    const [bid] = await db('bids')
      .insert({
        job_id: jobId,
        freelancer_id: req.user.id,
        amount,
        delivery_time: deliveryTime,
        proposal
      })
      .returning('*');

    res.status(201).json(bid);
  } catch (err) {
    console.error('Submit bid error:', err);
    res.status(500).json({ error: 'Failed to submit bid' });
  }
};

export const getBidsForJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Only job owner can see all bids
    const job = await db('jobs').where({ id: jobId }).first();
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.client_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the job owner can view all bids' });
    }

    const bids = await db('bids')
      .select('bids.*', 'users.first_name', 'users.last_name', 'users.avatar_url', 'users.skills', 'users.hourly_rate')
      .join('users', 'bids.freelancer_id', 'users.id')
      .where('bids.job_id', jobId)
      .orderBy('bids.created_at', 'desc');

    res.json(bids);
  } catch (err) {
    console.error('Get bids error:', err);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
};

export const acceptBid = async (req, res) => {
  try {
    const { id } = req.params;

    const bid = await db('bids').where({ id }).first();
    if (!bid) return res.status(404).json({ error: 'Bid not found' });

    // Verify the job belongs to this user
    const job = await db('jobs').where({ id: bid.job_id, client_id: req.user.id }).first();
    if (!job) return res.status(403).json({ error: 'Unauthorized' });

    // Accept bid and reject all others
    await db.transaction(async (trx) => {
      await trx('bids').where({ id }).update({ status: 'accepted' });
      await trx('bids').where('job_id', bid.job_id).whereNot({ id }).update({ status: 'rejected' });
      await trx('jobs').where({ id: bid.job_id }).update({ status: 'in_progress', updated_at: new Date() });

      // Create contract
      await trx('contracts').insert({
        job_id: bid.job_id,
        client_id: req.user.id,
        freelancer_id: bid.freelancer_id,
        bid_id: bid.id,
        amount: bid.amount
      });
    });

    res.json({ message: 'Bid accepted, contract created' });
  } catch (err) {
    console.error('Accept bid error:', err);
    res.status(500).json({ error: 'Failed to accept bid' });
  }
};

export const withdrawBid = async (req, res) => {
  try {
    const bid = await db('bids').where({ id: req.params.id, freelancer_id: req.user.id }).first();
    if (!bid) return res.status(404).json({ error: 'Bid not found' });
    if (bid.status !== 'pending') return res.status(400).json({ error: 'Can only withdraw pending bids' });

    await db('bids').where({ id: req.params.id }).update({ status: 'withdrawn' });
    res.json({ message: 'Bid withdrawn' });
  } catch (err) {
    console.error('Withdraw bid error:', err);
    res.status(500).json({ error: 'Failed to withdraw bid' });
  }
};
