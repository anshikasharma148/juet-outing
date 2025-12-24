import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, Text, FAB, Chip, Dialog, Portal } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { matchingAPI, outingAPI } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

const DashboardScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [activeGroup, setActiveGroup] = useState(null);
  const [myRequest, setMyRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReadyDialog, setShowReadyDialog] = useState(false);
  const [readyMessage, setReadyMessage] = useState('');
  const socketRef = React.useRef(null);

  useEffect(() => {
    loadData();
    setupSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Refresh when screen comes into focus (e.g., after leaving a group)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const setupSocket = () => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    socketRef.current.on('group-ready', (data) => {
      setReadyMessage(`🎉 Your group now has ${data.members?.length || 3}+ members! You're ready for outing!`);
      setShowReadyDialog(true);
      loadData(); // Refresh data
    });

    socketRef.current.on('member-joined', (data) => {
      // Refresh data when someone joins
      loadData();
    });

    socketRef.current.on('member-left', (data) => {
      // Refresh data when someone leaves
      loadData();
    });

    socketRef.current.on('request-cancelled', (data) => {
      Alert.alert(
        'Outing Update',
        `${data.cancelledBy} ${data.isCreator ? 'cancelled' : 'left'} the outing.`,
        [{ text: 'OK', onPress: () => loadData() }]
      );
    });
  };

  const loadData = async () => {
    try {
      const [groupRes, requestsRes] = await Promise.all([
        matchingAPI.getActiveGroup().catch(() => ({ data: { success: false } })),
        outingAPI.getMyRequests(),
      ]);

      // Only set active group if user is actually a member
      if (groupRes.data?.success && groupRes.data.group) {
        const group = groupRes.data.group;
        const userIsMember = group.members?.some(m => {
          const memberId = m._id?.toString() || m.toString();
          return memberId === user?.id?.toString();
        });
        
        if (userIsMember) {
          setActiveGroup(group);
        } else {
          setActiveGroup(null);
        }
      } else {
        setActiveGroup(null);
      }

      // Filter to only show requests where user is actually a member
      const activeRequest = requestsRes.data.requests?.find((r) => {
        const isActive = r.status === 'pending' || r.status === 'matched' || r.status === 'ready';
        if (!isActive || r.status === 'cancelled') return false;
        
        // Check if user is creator
        const isCreator = r.userId?._id?.toString() === user?.id?.toString() || 
                         r.userId?.toString() === user?.id?.toString();
        if (isCreator) {
          return true;
        }
        
        // Check if user is in members array
        return r.members?.some(m => {
          const memberId = m._id?.toString() || m.toString();
          return memberId === user?.id?.toString();
        });
      });
      
      setMyRequest(activeRequest || null);
      
      // Join socket room if there's an active request
      if (activeRequest && socketRef.current) {
        socketRef.current.emit('join-group', activeRequest._id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Outing',
      'Are you sure you want to cancel this outing?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              if (myRequest) {
                await outingAPI.cancelRequest(myRequest._id);
                // Clear state immediately
                setMyRequest(null);
                setActiveGroup(null);
                Alert.alert('Success', 'Outing request cancelled', [
                  { text: 'OK', onPress: () => loadData() }
                ]);
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to cancel request');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          <Text variant="headlineSmall" style={styles.greeting}>
            Hello, {user?.name}!
          </Text>

          {activeGroup ? (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Text variant="titleLarge">Active Outing</Text>
                  <Chip mode="flat" style={styles.chip}>
                    {activeGroup.status}
                  </Chip>
                </View>
                <Text variant="bodyMedium" style={styles.dateText}>
                  {formatDate(activeGroup.outingDate)} at {activeGroup.outingTime}
                </Text>
                <Text variant="bodySmall" style={styles.membersText}>
                  {activeGroup.members?.length || 0} member{(activeGroup.members?.length || 0) !== 1 ? 's' : ''}
                  {activeGroup.status === 'ready' || (activeGroup.members?.length || 0) >= 3 
                    ? ' - Ready for Outing! 🎉' 
                    : ` (${Math.max(0, 3 - (activeGroup.members?.length || 0))} more needed)`}
                </Text>
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('ActiveGroup')}
                  style={styles.button}
                >
                  View Details
                </Button>
              </Card.Content>
            </Card>
          ) : myRequest ? (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Text variant="titleLarge">Your Request</Text>
                  <Chip mode="flat" style={styles.chip}>
                    {myRequest.status}
                  </Chip>
                </View>
                <Text variant="bodyMedium" style={styles.dateText}>
                  {formatDate(myRequest.date)} at {myRequest.time}
                </Text>
                <Text variant="bodySmall" style={styles.membersText}>
                  {myRequest.members?.length || 1} member{myRequest.members?.length !== 1 ? 's' : ''}
                  {myRequest.status === 'ready' ? ' - Ready for Outing! 🎉' : ` (${Math.max(0, 3 - (myRequest.members?.length || 1))} more needed)`}
                </Text>
                <View style={styles.buttonRow}>
                  <Button
                    mode="outlined"
                    onPress={() => navigation.navigate('BrowseRequests')}
                    style={[styles.button, styles.buttonHalf]}
                  >
                    Find Members
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={handleCancel}
                    style={[styles.button, styles.buttonHalf]}
                    buttonColor="#ff5252"
                    textColor="#fff"
                  >
                    Cancel
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ) : (
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.emptyTitle}>
                  No Active Outing
                </Text>
                <Text variant="bodyMedium" style={styles.emptyText}>
                  Create a new outing request to get started
                </Text>
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('CreateRequest')}
                  style={styles.button}
                >
                  Create Request
                </Button>
              </Card.Content>
            </Card>
          )}

          <View style={styles.quickActions}>
            <Button
              mode="outlined"
              icon="plus"
              onPress={() => navigation.navigate('CreateRequest')}
              style={styles.actionButton}
            >
              New Request
            </Button>
            <Button
              mode="outlined"
              icon="magnify"
              onPress={() => navigation.navigate('BrowseRequests')}
              style={styles.actionButton}
            >
              Browse
            </Button>
          </View>
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateRequest')}
      />

      <Portal>
        <Dialog
          visible={showReadyDialog}
          onDismiss={() => setShowReadyDialog(false)}
        >
          <Dialog.Icon icon="check-circle" size={48} color="#4caf50" />
          <Dialog.Title style={styles.dialogTitle}>Ready for Outing! 🎉</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>{readyMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowReadyDialog(false)}>Great!</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  greeting: {
    marginBottom: 20,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chip: {
    height: 28,
  },
  dateText: {
    marginTop: 8,
    color: '#666',
  },
  membersText: {
    marginTop: 4,
    color: '#999',
  },
  button: {
    marginTop: 16,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  buttonHalf: {
    flex: 1,
  },
  dialogTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  dialogText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 8,
  },
});

export default DashboardScreen;


