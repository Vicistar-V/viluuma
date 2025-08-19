import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserMessage {
  id: string;
  message_type: string;
  title: string;
  body: string;
  created_at: string;
  is_acknowledged: boolean;
}

export const useUserMessages = () => {
  const { user } = useAuth();
  const [displayedMessage, setDisplayedMessage] = useState<UserMessage | null>(null);
  const [allUnacknowledgedMessages, setAllUnacknowledgedMessages] = useState<UserMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasShownMessageThisSession, setHasShownMessageThisSession] = useState(false);

  // Fetch all unacknowledged messages
  const fetchUnacknowledgedMessages = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_messages')
        .select('*')
        .eq('is_acknowledged', false)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching unacknowledged messages:', error);
        return;
      }

      setAllUnacknowledgedMessages(data || []);
      
      // Intelligently select and display ONE message if we haven't shown one this session
      if (!hasShownMessageThisSession && data && data.length > 0) {
        selectAndDisplayPriorityMessage(data);
      }

    } catch (error) {
      console.error('Error in fetchUnacknowledgedMessages:', error);
    } finally {
      setLoading(false);
    }
  }, [user, hasShownMessageThisSession]);

  // Intelligent priority-based message selection
  const selectAndDisplayPriorityMessage = (messages: UserMessage[]) => {
    // Priority system: deadline_warning > slump_detector > momentum_booster
    const messageTypesPriority = ['deadline_warning', 'slump_detector', 'momentum_booster'];
    
    let priorityMessage: UserMessage | null = null;
    
    for (const messageType of messageTypesPriority) {
      priorityMessage = messages.find(msg => msg.message_type === messageType) || null;
      if (priorityMessage) break;
    }
    
    // If no priority message found, take the oldest one
    if (!priorityMessage) {
      priorityMessage = messages[0];
    }

    if (priorityMessage) {
      setDisplayedMessage(priorityMessage);
      setHasShownMessageThisSession(true);
      
      // CRITICAL: Auto-acknowledge immediately on display (display = acknowledged)
      autoAcknowledgeMessage(priorityMessage.id);
    }
  };

  // Auto-acknowledge when message is displayed (the key to human-centric design)
  const autoAcknowledgeMessage = async (messageId: string) => {
    try {
      const { error } = await supabase.rpc('acknowledge_message', { 
        p_message_id: messageId 
      });
      
      if (error) {
        console.error('Error auto-acknowledging message:', error);
        return;
      }
      
      console.log('Message auto-acknowledged on display:', messageId);
      
      // Cancel any pending push notifications for this message
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const { notifications } = await LocalNotifications.getPending();
        
        // Find and cancel notifications related to this message
        const relatedNotifications = notifications.filter(notification => 
          notification.extra?.messageId === messageId || 
          notification.id.toString().includes(messageId)
        );
        
        if (relatedNotifications.length > 0) {
          await LocalNotifications.cancel({
            notifications: relatedNotifications.map(n => ({ id: n.id }))
          });
          console.log(`Cancelled ${relatedNotifications.length} pending notifications for message ${messageId}`);
        }
      } catch (notificationError) {
        console.warn('Could not cancel pending notifications:', notificationError);
      }
      
      // Remove from local state
      setAllUnacknowledgedMessages(prev => prev.filter(msg => msg.id !== messageId));
      
    } catch (error) {
      console.error('Error in autoAcknowledgeMessage:', error);
    }
  };

  // Manual dismiss (user clicks X)
  const dismissMessage = useCallback(() => {
    setDisplayedMessage(null);
  }, []);

  // No longer needed - remove the acknowledgeMessage function since auto-acknowledgment handles everything

  // Fetch messages on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchUnacknowledgedMessages();
    }
  }, [user, fetchUnacknowledgedMessages]);

  // Reset session flag when user changes
  useEffect(() => {
    setHasShownMessageThisSession(false);
    setDisplayedMessage(null);
  }, [user]);

  return {
    displayedMessage,
    allUnacknowledgedMessages,
    loading,
    hasShownMessageThisSession,
    fetchUnacknowledgedMessages,
    dismissMessage,
  };
};