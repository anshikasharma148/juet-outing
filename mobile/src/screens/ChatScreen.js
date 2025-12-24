import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Text, IconButton, Avatar, Menu, Divider } from 'react-native-paper';
import { messageAPI, matchingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

const ChatScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [groupId, setGroupId] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const [menuVisible, setMenuVisible] = useState({});

  useEffect(() => {
    loadActiveGroup();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const loadActiveGroup = async () => {
    try {
      const groupRes = await matchingAPI.getActiveGroup().catch(() => ({ data: { success: false } }));
      if (groupRes.data?.success && groupRes.data.group?._id) {
        const gId = groupRes.data.group._id;
        const group = groupRes.data.group;
        setGroupId(gId);
        setGroupInfo(group);
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
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some(m => m._id === message._id)) {
          return prev;
        }
        return [...prev, message];
      });
    });

    socketRef.current.on('typing', (data) => {
      if (data.userId !== user?.id) {
        setTyping(true);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(false);
        }, 3000);
      }
    });

    socketRef.current.on('stop-typing', () => {
      setTyping(false);
    });
  };

  const handleTyping = () => {
    if (socketRef.current && groupId) {
      socketRef.current.emit('typing', { groupId, userId: user?.id });
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !groupId || sending) return;

    setSending(true);
    try {
      await messageAPI.sendMessage({
        groupId,
        text: newMessage.trim(),
      });
      setNewMessage('');
      if (socketRef.current) {
        socketRef.current.emit('stop-typing', { groupId, userId: user?.id });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
      setShowScrollButton(false);
    }, 100);
  };

  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
    setShowScrollButton(!isNearBottom);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const formatDateHeader = (timestamp, prevTimestamp) => {
    if (!prevTimestamp) return null;
    
    const date = new Date(timestamp);
    const prevDate = new Date(prevTimestamp);
    const today = new Date();
    
    const dateStr = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
    const prevDateStr = prevDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
    
    if (dateStr !== prevDateStr) {
      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      }
      return dateStr;
    }
    return null;
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getAvatarColor = (name) => {
    const colors = [
      '#6200ee', '#03a9f4', '#4caf50', '#ff9800', 
      '#e91e63', '#9c27b0', '#00bcd4', '#ff5722'
    ];
    if (!name) return colors[0];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const copyToClipboard = (text) => {
    // In a real app, you'd use Clipboard from @react-native-clipboard/clipboard
    Alert.alert('Copied', 'Message copied to clipboard');
    setMenuVisible({});
  };

  const commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
    '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
    '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
    '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
    '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖',
    '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡',
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👏',
    '🙌', '👐', '🤲', '🤝', '🙏', '💪', '❤️', '💯',
    '🔥', '⭐', '✨', '🎉', '🎊', '🎈', '🎁', '💝',
  ];

  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const shouldShowAvatar = (currentMessage, previousMessage) => {
    if (!previousMessage) return true;
    if (currentMessage.senderId?._id?.toString() !== previousMessage.senderId?._id?.toString()) {
      return true;
    }
    const timeDiff = new Date(currentMessage.timestamp) - new Date(previousMessage.timestamp);
    return timeDiff > 5 * 60 * 1000; // 5 minutes
  };

  const renderMessage = ({ item, index }) => {
    const isOwn = item.senderId?._id?.toString() === user?.id?.toString();
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar = shouldShowAvatar(item, previousMessage);
    const dateHeader = formatDateHeader(item.timestamp, previousMessage?.timestamp);
    const menuId = item._id?.toString() || index.toString();

    return (
      <View>
        {dateHeader && (
          <View style={styles.dateHeader}>
            <View style={styles.dateHeaderLine} />
            <Text style={styles.dateHeaderText}>{dateHeader}</Text>
            <View style={styles.dateHeaderLine} />
          </View>
        )}
        <View
          style={[
            styles.messageRow,
            isOwn ? styles.ownMessageRow : styles.otherMessageRow,
          ]}
        >
          {!isOwn && (
            <View style={styles.avatarContainer}>
              {showAvatar ? (
                <Avatar.Text
                  size={36}
                  label={getInitials(item.senderId?.name)}
                  style={{ backgroundColor: getAvatarColor(item.senderId?.name) }}
                />
              ) : (
                <View style={{ width: 36 }} />
              )}
            </View>
          )}
          <View style={styles.messageContentWrapper}>
            {!isOwn && showAvatar && (
              <Text style={styles.senderName}>{item.senderId?.name}</Text>
            )}
            <TouchableOpacity
              style={[
                styles.messageBubble,
                isOwn ? styles.ownMessageBubble : styles.otherMessageBubble,
              ]}
              onLongPress={() => {
                setMenuVisible({ [menuId]: true });
              }}
              delayLongPress={300}
            >
              <Text style={[
                styles.messageText,
                isOwn ? styles.ownMessageText : styles.otherMessageText,
              ]}>
                {item.text}
              </Text>
              <View style={styles.messageFooter}>
                <Text style={[
                  styles.timestamp,
                  isOwn ? styles.ownTimestamp : styles.otherTimestamp,
                ]}>
                  {formatTime(item.timestamp)}
                </Text>
                {isOwn && (
                  <Text style={styles.statusIcon}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
            <Menu
              visible={menuVisible[menuId] || false}
              onDismiss={() => setMenuVisible({})}
              anchor={<View />}
            >
              <Menu.Item
                onPress={() => copyToClipboard(item.text)}
                title="Copy"
                leadingIcon="content-copy"
              />
            </Menu>
          </View>
          {isOwn && (
            <View style={styles.avatarContainer}>
              {showAvatar ? (
                <Avatar.Text
                  size={36}
                  label={getInitials(user?.name)}
                  style={{ backgroundColor: getAvatarColor(user?.name) }}
                />
              ) : (
                <View style={{ width: 36 }} />
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    if (!groupInfo) return null;
    
    const members = groupInfo.members || [];
    const memberNames = members.map(m => m.name || m).join(', ');
    
    return (
      <View style={styles.header}>
        {navigation && navigation.canGoBack() && (
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
          />
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {members.length === 3 ? 'Outing Group' : 'Outing Request'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {memberNames}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!groupId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Avatar.Icon size={80} icon="chat-outline" style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No Active Chat</Text>
          <Text style={styles.emptyText}>
            Create or join an outing to start chatting with your group members.
          </Text>
          <Text style={styles.emptySubtext}>
            Chat is available when 2 or more girls are matched.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.chatContainer}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item, index) => item._id?.toString() || index.toString()}
              contentContainerStyle={styles.messagesList}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              ListEmptyComponent={
                <View style={styles.emptyChatContainer}>
                  <Avatar.Icon size={60} icon="chat-outline" style={styles.emptyChatIcon} />
                  <Text style={styles.emptyChatText}>No messages yet</Text>
                  <Text style={styles.emptyChatSubtext}>Start the conversation!</Text>
                </View>
              }
            />
            {typing && (
              <View style={styles.typingIndicator}>
                <Text style={styles.typingText}>Someone is typing...</Text>
              </View>
            )}
            {showScrollButton && (
              <TouchableOpacity
                style={styles.scrollButton}
                onPress={scrollToBottom}
              >
                <IconButton icon="arrow-down" size={20} iconColor="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </TouchableWithoutFeedback>
        {showEmojiPicker && (
          <View style={styles.emojiPickerContainer}>
            <View style={styles.emojiPickerHeader}>
              <Text style={styles.emojiPickerTitle}>Emojis</Text>
              <IconButton
                icon="close"
                size={20}
                onPress={() => setShowEmojiPicker(false)}
              />
            </View>
            <View style={styles.emojiGrid}>
              {commonEmojis.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.emojiButton}
                  onPress={() => handleEmojiSelect(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              mode="flat"
              value={newMessage}
              onChangeText={(text) => {
                setNewMessage(text);
                if (text.length > 0 && !typing) {
                  handleTyping();
                }
              }}
              placeholder="Type a message..."
              style={styles.input}
              multiline
              maxLength={500}
              right={
                <TextInput.Icon
                  icon="emoticon-happy-outline"
                  onPress={() => {
                    setShowEmojiPicker(!showEmojiPicker);
                    Keyboard.dismiss();
                  }}
                />
              }
            />
          </View>
          <TouchableOpacity
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled,
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <IconButton icon="send" size={24} iconColor="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    backgroundColor: '#e0e0e0',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dateHeaderText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  ownMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginHorizontal: 8,
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  messageContentWrapper: {
    maxWidth: '70%',
    flexDirection: 'column',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: '100%',
  },
  ownMessageBubble: {
    backgroundColor: '#6200ee',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  timestamp: {
    fontSize: 11,
    marginRight: 4,
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherTimestamp: {
    color: '#999',
  },
  statusIcon: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#999',
  },
  scrollButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    backgroundColor: '#6200ee',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputWrapper: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    maxHeight: 100,
  },
  input: {
    backgroundColor: 'transparent',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: '#6200ee',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    elevation: 0,
  },
  emptyChatContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyChatIcon: {
    backgroundColor: '#e0e0e0',
    marginBottom: 16,
  },
  emptyChatText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#999',
  },
  emojiPickerContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    maxHeight: 250,
  },
  emojiPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  emojiPickerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    maxHeight: 200,
  },
  emojiButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  emojiText: {
    fontSize: 24,
  },
});

export default ChatScreen;
