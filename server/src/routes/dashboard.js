import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import db from '../config/database.js';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const userField = role === 'client' ? 'client_id' : 'freelancer_id';

    // Active contracts
    const [{ count: activeContracts }] = await db('contracts')
      .where({ [userField]: userId, status: 'active' }).count();

    // Completed contracts
    const [{ count: completedContracts }] = await db('contracts')
      .where({ [userField]: userId, status: 'completed' }).count();

    // Total amount from completed contracts
    const [{ sum: totalAmount }] = await db('contracts')
      .where({ [userField]: userId, status: 'completed' })
      .sum('amount');

    // This month
    const [{ sum: thisMonth }] = await db('contracts')
      .where({ [userField]: userId, status: 'completed' })
      .where('completed_at', '>=', startOfMonth)
      .sum('amount');

    // Last month
    const [{ sum: lastMonth }] = await db('contracts')
      .where({ [userField]: userId, status: 'completed' })
      .whereBetween('completed_at', [startOfLastMonth, endOfLastMonth])
      .sum('amount');

    // This year
    const [{ sum: thisYear }] = await db('contracts')
      .where({ [userField]: userId, status: 'completed' })
      .where('completed_at', '>=', startOfYear)
      .sum('amount');

    // Pending (held in escrow)
    const [{ sum: pendingAmount }] = await db('payments')
      .join('contracts', 'payments.contract_id', 'contracts.id')
      .where({ [`contracts.${userField}`]: userId, 'payments.status': 'held' })
      .sum('payments.amount');

    // Open items (jobs or bids)
    let openItems = 0;
    if (role === 'client') {
      const [{ count }] = await db('jobs').where({ client_id: userId, status: 'open' }).count();
      openItems = Number(count);
    } else {
      const [{ count }] = await db('bids').where({ freelancer_id: userId, status: 'pending' }).count();
      openItems = Number(count);
    }

    res.json({
      activeContracts: Number(activeContracts),
      completedContracts: Number(completedContracts),
      totalAmount: Number(totalAmount) || 0,
      thisMonth: Number(thisMonth) || 0,
      lastMonth: Number(lastMonth) || 0,
      thisYear: Number(thisYear) || 0,
      pendingAmount: Number(pendingAmount) || 0,
      openItems
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/dashboard/contracts
router.get('/contracts', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const userField = role === 'client' ? 'client_id' : 'freelancer_id';

    const contracts = await db('contracts')
      .select(
        'contracts.*',
        'jobs.title as job_title',
        'freelancer.first_name as freelancer_first_name',
        'freelancer.last_name as freelancer_last_name',
        'client.first_name as client_first_name',
        'client.last_name as client_last_name',
        'bids.delivery_time'
      )
      .join('jobs', 'contracts.job_id', 'jobs.id')
      .join('users as freelancer', 'contracts.freelancer_id', 'freelancer.id')
      .join('users as client', 'contracts.client_id', 'client.id')
      .leftJoin('bids', 'contracts.bid_id', 'bids.id')
      .where(`contracts.${userField}`, userId)
      .where('contracts.status', 'active')
      .orderBy('contracts.started_at', 'desc');

    res.json(contracts);
  } catch (err) {
    console.error('Dashboard contracts error:', err);
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
});

// GET /api/dashboard/activity
router.get('/activity', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const activity = [];

    // Recent payments
    const payments = await db('payments')
      .join('contracts', 'payments.contract_id', 'contracts.id')
      .join('jobs', 'contracts.job_id', 'jobs.id')
      .where(role === 'client' ? 'contracts.client_id' : 'contracts.freelancer_id', userId)
      .orderBy('payments.created_at', 'desc')
      .limit(3)
      .select('payments.amount', 'payments.status', 'payments.created_at', 'jobs.title');

    payments.forEach(p => {
      activity.push({
        type: 'payment',
        text: `$${p.amount} ${p.status} for "${p.title}"`,
        time: timeAgo(p.created_at)
      });
    });

    // Recent bids (if client: bids received; if freelancer: bid status changes)
    if (role === 'client') {
      const bids = await db('bids')
        .join('jobs', 'bids.job_id', 'jobs.id')
        .join('users', 'bids.freelancer_id', 'users.id')
        .where('jobs.client_id', userId)
        .orderBy('bids.created_at', 'desc')
        .limit(3)
        .select('users.first_name', 'jobs.title', 'bids.amount', 'bids.created_at');

      bids.forEach(b => {
        activity.push({
          type: 'bid',
          text: `${b.first_name} bid $${b.amount} on "${b.title}"`,
          time: timeAgo(b.created_at)
        });
      });
    } else {
      const bids = await db('bids')
        .join('jobs', 'bids.job_id', 'jobs.id')
        .where('bids.freelancer_id', userId)
        .whereNot('bids.status', 'pending')
        .orderBy('bids.created_at', 'desc')
        .limit(3)
        .select('jobs.title', 'bids.status', 'bids.created_at');

      bids.forEach(b => {
        activity.push({
          type: 'bid',
          text: `Your bid on "${b.title}" was ${b.status}`,
          time: timeAgo(b.created_at)
        });
      });
    }

    // Sort by most recent and limit to 8
    activity.sort((a, b) => new Date(b.rawTime) - new Date(a.rawTime));
    res.json(activity.slice(0, 8));
  } catch (err) {
    console.error('Dashboard activity error:', err);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default router;
