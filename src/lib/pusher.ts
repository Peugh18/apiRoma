import Pusher from 'pusher';

// Initialize Pusher client using environment variables. These should be set in your deployment environment.
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER || 'mt1',
  useTLS: true,
});

/**
 * Broadcast a message to the Laravel frontend via Pusher.
 * The event name and channel are conventionally defined on the Laravel side.
 * Adjust `channel` and `event` as needed to match the Laravel listener.
 */
export async function broadcastChatMessage(payload: {
  wa_id: string;
  sender_phone: string;
  message_body: string;
  direction: 'inbound' | 'outbound';
}) {
  try {
    await pusher.trigger('chatbot-channel', 'new-message', payload);
  } catch (err) {
    console.error('Pusher broadcast failed:', err);
  }
}
