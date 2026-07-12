import db from '../config/database.js';

export const createJob = async (req, res) => {
  try {
    const { title, description, category, skillsRequired, budgetMin, budgetMax, budgetType, duration } = req.body;

    const [job] = await db('jobs')
      .insert({
        client_id: req.user.id,
        title,
        description,
        category,
        skills_required: skillsRequired,
        budget_min: budgetMin,
        budget_max: budgetMax,
        budget_type: budgetType,
        duration
      })
      .returning('*');

    res.status(201).json(job);
  } catch (err) {
    console.error('Create job error:', err);
    res.status(500).json({ error: 'Failed to create job' });
  }
};

export const getJobs = async (req, res) => {
  try {
    const { category, budgetType, minBudget, maxBudget, skills, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = db('jobs')
      .select('jobs.*', 'users.first_name', 'users.last_name', 'users.avatar_url')
      .join('users', 'jobs.client_id', 'users.id')
      .where('jobs.status', 'open')
      .orderBy('jobs.created_at', 'desc');

    if (category) query = query.where('jobs.category', category);
    if (budgetType) query = query.where('jobs.budget_type', budgetType);
    if (minBudget) query = query.where('jobs.budget_min', '>=', minBudget);
    if (maxBudget) query = query.where('jobs.budget_max', '<=', maxBudget);
    if (skills) query = query.whereRaw('jobs.skills_required && ?', [skills.split(',')]);
    if (search) query = query.where(function() {
      this.whereILike('jobs.title', `%${search}%`)
        .orWhereILike('jobs.description', `%${search}%`);
    });

    const [{ count }] = await db('jobs').where('status', 'open').count();
    const jobs = await query.limit(limit).offset(offset);

    res.json({
      jobs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(count),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error('Get jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

export const getJob = async (req, res) => {
  try {
    const job = await db('jobs')
      .select('jobs.*', 'users.first_name', 'users.last_name', 'users.avatar_url', 'users.is_verified')
      .join('users', 'jobs.client_id', 'users.id')
      .where('jobs.id', req.params.id)
      .first();

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get bid count for this job
    const [{ count: bidCount }] = await db('bids').where('job_id', job.id).count();
    job.bidCount = Number(bidCount);

    res.json(job);
  } catch (err) {
    console.error('Get job error:', err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
};

export const updateJob = async (req, res) => {
  try {
    const job = await db('jobs').where({ id: req.params.id, client_id: req.user.id }).first();

    if (!job) {
      return res.status(404).json({ error: 'Job not found or unauthorized' });
    }

    const { title, description, category, skillsRequired, budgetMin, budgetMax, budgetType, duration, status } = req.body;

    // Restrict status transitions: clients can only cancel, not mark as completed
    if (status && status !== 'cancelled' && status !== 'open') {
      return res.status(400).json({ error: 'You can only cancel or reopen a job. Completion happens via contract flow.' });
    }

    const [updated] = await db('jobs')
      .where({ id: req.params.id })
      .update({
        title: title || job.title,
        description: description || job.description,
        category: category || job.category,
        skills_required: skillsRequired || job.skills_required,
        budget_min: budgetMin || job.budget_min,
        budget_max: budgetMax || job.budget_max,
        budget_type: budgetType || job.budget_type,
        duration: duration || job.duration,
        status: status || job.status,
        updated_at: new Date()
      })
      .returning('*');

    res.json(updated);
  } catch (err) {
    console.error('Update job error:', err);
    res.status(500).json({ error: 'Failed to update job' });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const job = await db('jobs').where({ id: req.params.id, client_id: req.user.id }).first();

    if (!job) {
      return res.status(404).json({ error: 'Job not found or unauthorized' });
    }

    // Only allow deletion if no bids have been accepted
    const acceptedBids = await db('bids').where({ job_id: job.id, status: 'accepted' }).first();
    if (acceptedBids) {
      return res.status(400).json({ error: 'Cannot delete a job with an active contract' });
    }

    await db('jobs').where({ id: req.params.id }).update({ status: 'cancelled', updated_at: new Date() });
    res.json({ message: 'Job cancelled successfully' });
  } catch (err) {
    console.error('Delete job error:', err);
    res.status(500).json({ error: 'Failed to delete job' });
  }
};

export const getMyJobs = async (req, res) => {
  try {
    const jobs = await db('jobs')
      .where('client_id', req.user.id)
      .orderBy('created_at', 'desc');

    res.json(jobs);
  } catch (err) {
    console.error('Get my jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch your jobs' });
  }
};
