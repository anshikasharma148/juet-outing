import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Card } from 'react-native-paper';
import { messageAPI, matchingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

const ChatScreen = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [groupId, setGroupId] = useState(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadActiveGroup();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const loadActiveGroup = async () => {
    try {
      const groupRes = await matchingAPI.getActiveGroup().catch(() => ({ data: { success: false } }));
      if (groupRes.data?.success && groupRes.data.group?._id) {
        const gId = groupRes.data.group._id;
        setGroupId(gId);
        loadMessages(gId);
        connectSocket(gId);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading group:', error);
      setLoading(false);
    }
  };

  const loadMessages = async (gId) => {
    try {
      const response = await messageAPI.getMessages(gId);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectSocket = (gId) => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    socketRef.current.emit('join-group', gId);

    socketRef.current.on('new-message', (message) => {
      setMessages((prev) => [...prev, message]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !groupId) return;

    try {
      await messageAPI.sendMessage({
        groupId,
        text: newMessage.trim(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessage = ({ item }) => {
    const isOwn = item.senderId?._id?.toString() === user?.id?.toString();
    
    return (
      <View
        style={[
          styles.messageContainer,
          isOwn ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {!isOwn && (
          <Text variant="bodySmall" style={styles.senderName}>
            {item.senderId?.name}
          </Text>
        )}
        <Card
          style={[
            styles.messageCard,
            isOwn ? styles.ownMessageCard : styles.otherMessageCard,
          ]}
        >
          <Card.Content style={styles.messageContent}>
            <Text variant="bodyMedium">{item.text}</Text>
            <Text variant="bodySmall" style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!groupId) {
    return (
      <View style={styles.container}>
        <Text variant="bodyLarge" style={styles.emptyText}>
          No active group. Create or join an outing to start chatting.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item, index) => item._id || index.toString()}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }}
      />
      <View style={styles.inputContainer}>
        <TextInput
          mode="outlined"
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          style={styles.input}
          multiline
        />
        <Button
          mode="contained"
          onPress={handleSend}
          style={styles.sendButton}
          disabled={!newMessage.trim()}
        >
          Send
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  senderName: {
    marginBottom: 4,
    marginLeft: 8,
    color: '#666',
  },
  messageCard: {
    maxWidth: '75%',
  },
  ownMessageCard: {
    backgroundColor: '#6200ee',
  },
  otherMessageCard: {
    backgroundColor: '#fff',
  },
  messageContent: {
    padding: 12,
  },
  timestamp: {
    marginTop: 4,
    opacity: 0.7,
    fontSize: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
  },
});

export default ChatScreen;

