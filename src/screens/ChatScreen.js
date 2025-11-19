// ./src/screens/ChatScreen.js
import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AuthContext } from '../contexts/AuthContext';
import API from '../api/api';
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons';

const ChatScreen = ({ route, navigation }) => {
  const { user } = useContext(AuthContext);
  const { supportUser, currentUser } = route.params || {};
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(supportUser?.online || false);
  const flatListRef = useRef(null);

  // Fetch chat history when component mounts
  useEffect(() => {
    fetchChatHistory();
    
    // Set up real-time updates (simulated with interval for demo)
    const interval = setInterval(() => {
      checkForNewMessages();
      updateOnlineStatus();
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [supportUser?._id, currentUser?._id]);

  // Fetch chat history from API
  const fetchChatHistory = async () => {
    if (!supportUser?._id || !currentUser?._id) return;
    
    setLoading(true);
    try {
      // Try to fetch existing chat history
      const response = await API.get('/chats', {
        params: {
          participant1: currentUser._id,
          participant2: supportUser._id
        }
      });

      if (response.data && response.data.messages) {
        setMessages(response.data.messages);
      } else {
        // If no history exists, create initial welcome message
        const welcomeMessage = getWelcomeMessage();
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.log('Error fetching chat history:', error);
      // If API fails, start with welcome message
      const welcomeMessage = getWelcomeMessage();
      setMessages([welcomeMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Get appropriate welcome message based on support user role
  const getWelcomeMessage = () => {
    const welcomeMessages = {
      artisan: {
        _id: 'welcome_1',
        text: "Hello! I'm here to help you with custom orders and artisan services. What can I assist you with today?",
        senderId: supportUser?._id,
        senderName: supportUser?.name,
        senderRole: supportUser?.role,
        timestamp: new Date().toISOString(),
        type: 'received'
      },
      inventory: {
        _id: 'welcome_1',
        text: "Hi there! I can help you with product availability, stock inquiries, and inventory-related questions.",
        senderId: supportUser?._id,
        senderName: supportUser?.name,
        senderRole: supportUser?.role,
        timestamp: new Date().toISOString(),
        type: 'received'
      },
      finance: {
        _id: 'welcome_1',
        text: "Welcome! I'm from the finance department. I can assist with payment issues, billing questions, and financial inquiries.",
        senderId: supportUser?._id,
        senderName: supportUser?.name,
        senderRole: supportUser?.role,
        timestamp: new Date().toISOString(),
        type: 'received'
      },
      support: {
        _id: 'welcome_1',
        text: "Hello! How can I help you today? I'm here to assist with any questions or issues you might have.",
        senderId: supportUser?._id,
        senderName: supportUser?.name,
        senderRole: supportUser?.role,
        timestamp: new Date().toISOString(),
        type: 'received'
      }
    };

    return welcomeMessages[supportUser?.role] || welcomeMessages.support;
  };

  // Check for new messages from the support user
  const checkForNewMessages = async () => {
    if (!supportUser?._id || !currentUser?._id) return;

    try {
      const response = await API.get('/chats/latest', {
        params: {
          participant1: currentUser._id,
          participant2: supportUser._id,
          lastMessageId: messages[messages.length - 1]?._id
        }
      });

      if (response.data && response.data.newMessages) {
        setMessages(prev => [...prev, ...response.data.newMessages]);
      }
    } catch (error) {
      console.log('Error checking for new messages:', error);
    }
  };

  // Update online status
  const updateOnlineStatus = async () => {
    try {
      const response = await API.get(`/users/${supportUser?._id}/status`);
      if (response.data) {
        setIsOnline(response.data.online);
      }
    } catch (error) {
      console.log('Error updating online status:', error);
      // For demo purposes, simulate random online status
      setIsOnline(Math.random() > 0.3);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Send message to the support user
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageData = {
      _id: `temp_${Date.now()}`,
      text: newMessage.trim(),
      senderId: currentUser?._id,
      senderName: currentUser?.name,
      senderRole: currentUser?.role,
      receiverId: supportUser?._id,
      receiverName: supportUser?.name,
      receiverRole: supportUser?.role,
      timestamp: new Date().toISOString(),
      type: 'sent',
      status: 'sending'
    };

    // Optimistically add message to UI
    setMessages(prev => [...prev, messageData]);
    setNewMessage('');
    setSending(true);

    try {
      // Send message to backend
      const response = await API.post('/chats/send', {
        senderId: currentUser?._id,
        receiverId: supportUser?._id,
        text: newMessage.trim(),
        timestamp: new Date().toISOString()
      });

      if (response.data && response.data.message) {
        // Replace temporary message with server response
        setMessages(prev => 
          prev.map(msg => 
            msg._id === messageData._id 
              ? { ...response.data.message, status: 'sent' }
              : msg
          )
        );

        // Notify support user about new message (in real app, this would be via WebSocket)
        await API.post('/notifications/send', {
          userId: supportUser?._id,
          title: 'New Message',
          message: `New message from ${currentUser?.name}`,
          type: 'chat'
        });

      } else {
        // If API fails, mark message as failed
        setMessages(prev => 
          prev.map(msg => 
            msg._id === messageData._id 
              ? { ...msg, status: 'failed' }
              : msg
          )
        );
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.log('Error sending message:', error);
      // Mark message as failed
      setMessages(prev => 
        prev.map(msg => 
          msg._id === messageData._id 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
      Alert.alert('Error', 'Failed to send message. Please check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  // Retry sending failed message
  const retrySendMessage = async (messageId) => {
    const failedMessage = messages.find(msg => msg._id === messageId);
    if (!failedMessage) return;

    setMessages(prev => 
      prev.map(msg => 
        msg._id === messageId 
          ? { ...msg, status: 'sending' }
          : msg
      )
    );

    try {
      const response = await API.post('/chats/send', {
        senderId: currentUser?._id,
        receiverId: supportUser?._id,
        text: failedMessage.text,
        timestamp: new Date().toISOString()
      });

      if (response.data && response.data.message) {
        setMessages(prev => 
          prev.map(msg => 
            msg._id === messageId 
              ? { ...response.data.message, status: 'sent' }
              : msg
          )
        );
      }
    } catch (error) {
      setMessages(prev => 
        prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
    }
  };

  const formatTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return 'Now';
    }
  };

  const formatDate = (timestamp) => {
    try {
      const messageDate = new Date(timestamp);
      const today = new Date();
      
      if (messageDate.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (messageDate.toDateString() === new Date(today.setDate(today.getDate() - 1)).toDateString()) {
        return 'Yesterday';
      } else {
        return messageDate.toLocaleDateString();
      }
    } catch (error) {
      return '';
    }
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const grouped = {};
    messages.forEach(message => {
      const date = formatDate(message.timestamp);
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(message);
    });
    return grouped;
  };

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageBubble,
      item.type === 'sent' ? styles.sentMessage : styles.receivedMessage
    ]}>
      <Text style={[
        styles.messageText,
        item.type === 'sent' ? styles.sentMessageText : styles.receivedMessageText
      ]}>
        {item.text}
      </Text>
      <View style={styles.messageFooter}>
        <Text style={styles.messageTime}>
          {formatTime(item.timestamp)}
        </Text>
        {item.type === 'sent' && (
          <View style={styles.messageStatus}>
            {item.status === 'sending' && (
              <ActivityIndicator size="small" color="#999" />
            )}
            {item.status === 'sent' && (
              <MaterialIcons name="check" size={12} color="#999" />
            )}
            {item.status === 'failed' && (
              <TouchableOpacity onPress={() => retrySendMessage(item._id)}>
                <MaterialIcons name="error-outline" size={12} color="#ff4444" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );

  const renderDateSeparator = ({ item }) => (
    <View style={styles.dateSeparator}>
      <Text style={styles.dateSeparatorText}>{item}</Text>
    </View>
  );

  // Flatten grouped messages for FlatList
  const getFlatListData = () => {
    const grouped = groupMessagesByDate();
    const flatData = [];
    
    Object.keys(grouped).forEach(date => {
      flatData.push({ type: 'date', key: date, data: date });
      grouped[date].forEach(message => {
        flatData.push({ type: 'message', key: message._id, data: message });
      });
    });
    
    return flatData;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#1a3a8f" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{supportUser?.name}</Text>
          <Text style={[styles.headerStatus, { color: isOnline ? '#4CAF50' : '#999' }]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
          <Text style={styles.headerRole}>
            {supportUser?.description || getRoleDisplayName(supportUser?.role)}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <MaterialIcons name="more-vert" size={24} color="#1a3a8f" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a3a8f" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={getFlatListData()}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => 
            item.type === 'date' 
              ? renderDateSeparator(item)
              : renderMessage({ item: item.data })
          }
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubble-ellipses-outline" size={64} color="#ccc" />
              <Text style={styles.emptyChatText}>Start a conversation</Text>
              <Text style={styles.emptyChatSubtext}>
                Send a message to {supportUser?.name} to get help with your inquiries
              </Text>
            </View>
          }
        />
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type your message..."
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
          editable={!sending}
        />
        <TouchableOpacity 
          style={[
            styles.sendButton, 
            (!newMessage.trim() || sending) && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

// Helper function to get role display name
const getRoleDisplayName = (role) => {
  const roleNames = {
    artisan: 'Artisan Expert',
    inventory: 'Inventory Team',
    finance: 'Finance Department',
    support: 'Customer Support',
    admin: 'Administrator',
    supervisor: 'Supervisor',
    supplier: 'Supplier'
  };
  return roleNames[role] || 'Support Team';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  headerStatus: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  headerRole: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
  },
  headerButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#1a3a8f',
    borderBottomRightRadius: 4,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  sentMessageText: {
    color: '#fff',
  },
  receivedMessageText: {
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
    opacity: 0.7,
    marginRight: 4,
  },
  messageStatus: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e6e6e6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    fontSize: 16,
    lineHeight: 20,
  },
  sendButton: {
    backgroundColor: '#1a3a8f',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyChatText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '500',
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ChatScreen;