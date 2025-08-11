import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function TalentChat({ conversationId, talentId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // Load existing messages
  useEffect(() => {
    if (!conversationId) return;
    fetchMessages();

    // Subscribe to new messages for this conversation
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  async function fetchMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error) {
      setMessages(data);
    } else {
      console.error('Error fetching messages:', error);
    }
  }

  async function sendMessage() {
    if (!newMessage.trim()) return;

    const { error } = await supabase.from('messages').insert([
      {
        conversation_id: conversationId,
        user_id: talentId,
        content: newMessage,
        sender_type: 'talent'
      }
    ]);

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
    }
  }

  return (
    <div>
      <div style={{ height: '300px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
        {messages.map((msg) => (
          <div key={msg.id}>
            <strong>{msg.sender_type}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type your message..."
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
