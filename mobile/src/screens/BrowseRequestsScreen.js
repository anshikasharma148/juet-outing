import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, Text, Chip, FAB, Dialog, Portal } from 'react-native-paper';
import { outingAPI, matchingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const BrowseRequestsScreen = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showReadyDialog, setShowReadyDialog] = useState(false);
  const [readyMessage, setReadyMessage] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const response = await outingAPI.getRequests({ excludeOwn: 'true' });
      const allRequests = response.data.requests || [];
      
      // Filter out expired requests (previous days or expired today)
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const validRequests = allRequests.filter(request => {
        const requestDate = new Date(request.date);
        const requestDay = new Date(requestDate.getFullYear(), requestDate.getMonth(), requestDate.getDate());
        
        // Only show today's or future requests
        return requestDay >= today && new Date(request.expiresAt) > now;
      });
      
      setRequests(validRequests);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleJoin = async (requestId) => {
    try {
      const response = await matchingAPI.joinRequest(requestId);
      if (response.data?.groupReady) {
        const memberCount = response.data.request?.members?.length || 3;
        setReadyMessage(`🎉 Great! Your group now has ${memberCount} members! You're ready for outing!`);
        setShowReadyDialog(true);
      } else {
        const memberCount = response.data.request?.members?.length || 1;
        const needed = Math.max(0, 3 - memberCount);
        Alert.alert(
          'Joined Successfully',
          `${needed} more member${needed !== 1 ? 's' : ''} needed to be ready for outing.`
        );
      }
      loadRequests();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to join request');
    }
  };

  const handleAutoMatch = async () => {
    try {
      const response = await matchingAPI.autoMatch();
      if (response.data?.groupReady) {
        const memberCount = response.data.request?.members?.length || 3;
        Alert.alert(
          'Auto-Match Success! 🎉',
          `Your group now has ${memberCount} members! You're ready for outing!`
        );
      } else {
        const memberCount = response.data.request?.members?.length || 1;
        const needed = Math.max(0, 3 - memberCount);
        Alert.alert(
          'Auto-Match Complete',
          `Matched with ${response.data.joinedRequests?.length || 0} request(s). ${needed} more member${needed !== 1 ? 's' : ''} needed.`
        );
      }
      loadRequests();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to auto-match';
      if (error.response?.status === 404) {
        Alert.alert(
          'No Active Request',
          'You need to create an outing request first before using auto-match.',
          [
            { text: 'OK' },
            { 
              text: 'Create Request', 
              onPress: () => navigation.navigate('CreateRequest') 
            }
          ]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderRequest = ({ item }) => {
    const isMember = item.members?.some(
      (m) => m._id?.toString() === user?.id?.toString()
    );
    const now = new Date();
    const requestDate = new Date(item.date);
    const requestDay = new Date(requestDate.getFullYear(), requestDate.getMonth(), requestDate.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isExpired = requestDay < today || new Date(item.expiresAt) <= now;
    // Allow joining even if 3+ members (more can join)
    const canJoin = !isMember && !isExpired && item.status !== 'cancelled';

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View>
              <Text variant="titleMedium">{item.userId?.name}</Text>
              <Text variant="bodySmall" style={styles.userInfo}>
                Year {item.userId?.year}, Sem {item.userId?.semester}
              </Text>
            </View>
            <Chip mode="flat" style={[
              styles.chip,
              (item.members?.length || 1) >= 3 && styles.readyChip
            ]}>
              {item.members?.length || 1}{item.status === 'ready' ? '+' : ''} {item.status === 'ready' ? 'Ready!' : 'members'}
            </Chip>
          </View>
          <Text variant="bodyMedium" style={styles.dateText}>
            {formatDate(item.date)} at {item.time}
          </Text>
          {canJoin && (
            <Button
              mode="contained"
              onPress={() => handleJoin(item._id)}
              style={styles.joinButton}
            >
              Join
            </Button>
          )}
          {isMember && (
            <Text variant="bodySmall" style={styles.memberText}>
              You are a member
            </Text>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadRequests} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No requests available
            </Text>
          </View>
        }
      />
      <FAB
        icon="auto-fix"
        label="Auto Match"
        style={styles.fab}
        onPress={handleAutoMatch}
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
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    color: '#666',
    marginTop: 4,
  },
  chip: {
    height: 28,
  },
  readyChip: {
    backgroundColor: '#4caf50',
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
  dateText: {
    marginTop: 8,
    color: '#666',
  },
  joinButton: {
    marginTop: 12,
  },
  memberText: {
    marginTop: 12,
    color: '#4caf50',
    fontStyle: 'italic',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
});

export default BrowseRequestsScreen;


