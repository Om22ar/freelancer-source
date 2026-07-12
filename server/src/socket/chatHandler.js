import jwt from 'jsonwebtoken';
import db from '../config/database.js';

export default function setupChatSocket(io) {
  // Authenticate socket connections via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`User connected: ${userId} (socket: ${socket.id})`);

    // Join user's personal room for notifications
    socket.join(`user:${userId}`);

    // Join a contract conversation room
    socket.on('join_conversation', async (contractId) => {
      try {
        // Verify user belongs to this contract
        const contract = await db('contracts').where({ id: contractId }).first();
        if (!contract) return;
        if (contract.client_id !== userId && contract.freelancer_id !== userId) return;

        socket.join(`contract:${contractId}`);
        socket.emit('joined_conversation', { contractId });
      } catch (err) {
        console.error('Join conversation error:', err);
      }
    });

    // Leave a conversation room
    socket.on('leave_conversation', (contractId) => {
      socket.leave(`contract:${contractId}`);
    });

    // Send a message via socket
    socket.on('send_message', async (data) => {
      try {
        const { contractId, content } = data;
        if (!contractId || !content?.trim()) return;

        // Verify user belongs to this contract
        const contract = await db('contracts').where({ id: contractId }).first();
        if (!contract) return;
        if (contract.client_id !== userId && contract.freelancer_id !== userId) return;

        const receiverId = contract.client_id === userId ? contract.freelancer_id : contract.client_id;

        // Persist message
        const [message] = await db('messages')
          .insert({
            sender_id: userId,
            receiver_id: receiverId,
            contract_id: contractId,
            content: content.trim()
          })
          .returning('*');

        // Get sender info
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

        // Broadcast to conversation room
        io.to(`contract:${contractId}`).emit('new_message', enrichedMessage);

        // Notify receiver if not in the room
        io.to(`user:${receiverId}`).emit('message_notification', {
          contractId,
          message: enrichedMessage
        });
      } catch (err) {
        console.error('Socket send_message error:', err);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Typing indicators
    socket.on('typing_start', (contractId) => {
      socket.to(`contract:${contractId}`).emit('user_typing', {
        userId,
        contractId
      });
    });

    socket.on('typing_stop', (contractId) => {
      socket.to(`contract:${contractId}`).emit('user_stopped_typing', {
        userId,
        contractId
      });
    });

    // Mark messages as read
    socket.on('mark_read', async (contractId) => {
      try {
        await db('messages')
          .where({ contract_id: contractId, is_read: false })
          .whereNot('sender_id', userId)
          .update({ is_read: true });

        socket.to(`contract:${contractId}`).emit('messages_read', {
          contractId,
          readBy: userId
        });
      } catch (err) {
        console.error('Mark read error:', err);
      }
    });

    // Online status
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
      io.emit('user_offline', { userId });
    });

    // Broadcast online status
    io.emit('user_online', { userId });
  });
}
