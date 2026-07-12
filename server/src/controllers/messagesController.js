import db from '../config/database.js';

export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all contracts where user is a participant
    const conversations = await db('contracts')
      .select(
        'contracts.id as contract_id',
        'contracts.status',
        'jobs.title as job_title',
        'freelancer.id as freelancer_id',
        'freelancer.first_name as freelancer_first_name',
        'freelancer.last_name as freelancer_last_name',
        'freelancer.avatar_url as freelancer_avatar',
        'client.id as client_id',
        'client.first_name as client_first_name',
        'client.last_name as client_last_name',
        'client.avatar_url as client_avatar'
      )
      .join('jobs', 'contracts.job_id', 'jobs.id')
      .join('users as freelancer', 'contracts.freelancer_id', 'freelancer.id')
      .join('users as client', 'contracts.client_id', 'client.id')
      .where('contracts.client_id', userId)
      .orWhere('contracts.freelancer_id', userId)
      .orderBy('contracts.started_at', 'desc');

    // Get last message and unread count for each conversation
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await db('messages')
          .where('contract_id', conv.contract_id)
          .orderBy('created_at', 'desc')
          .first();

        const [{ count: unreadCount }] = await db('messages')
          .where({ contract_id: conv.contract_id, is_read: false })
          .whereNot('sender_id', userId)
          .count();

        return {
          ...conv,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            senderId: lastMessage.sender_id,
            createdAt: lastMessage.created_at
          } : null,
          unreadCount: Number(unreadCount)
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { contractId } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Verify user is part of this contract
    const contract = await db('contracts').where({ id: contractId }).first();
    if (!contract) return res.status(404).json({ error: 'Conversation not found' });
    if (contract.client_id !== userId && contract.freelancer_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this conversation' });
    }

    // Fetch messages
    const messages = await db('messages')
      .select('messages.*', 'users.first_name', 'users.last_name', 'users.avatar_url')
      .join('users', 'messages.sender_id', 'users.id')
      .where('messages.contract_id', contractId)
      .orderBy('messages.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Mark messages as read
    await db('messages')
      .where({ contract_id: contractId, is_read: false })
      .whereNot('sender_id', userId)
      .update({ is_read: true });

    const [{ count }] = await db('messages').where('contract_id', contractId).count();

    res.json({
      messages: messages.reverse(),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(count),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { contractId, content } = req.body;
    const userId = req.user.id;

    // Verify user is part of this contract
    const contract = await db('contracts').where({ id: contractId }).first();
    if (!contract) return res.status(404).json({ error: 'Conversation not found' });
    if (contract.client_id !== userId && contract.freelancer_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to send messages here' });
    }

    const receiverId = contract.client_id === userId ? contract.freelancer_id : contract.client_id;

    const [message] = await db('messages')
      .insert({
        sender_id: userId,
        receiver_id: receiverId,
        contract_id: contractId,
        content
      })
      .returning('*');

    // Fetch sender info for the response
    const sender = await db('users')
      .select('first_name', 'last_name', 'avatar_url')
      .where({ id: userId })
      .first();

    const enrichedMessage = {
      ...message,
      first_name: sender.first_name,
      last_name: sender.last_name,
      avatar_url: sender.avatar_url
    };

    res.status(201).json(enrichedMessage);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
};
