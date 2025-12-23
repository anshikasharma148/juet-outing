import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Card, Button, Text, Chip, FAB } from 'react-native-paper';
import { outingAPI, matchingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const BrowseRequestsScreen = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const response = await outingAPI.getRequests({ excludeOwn: 'true' });
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleJoin = async (requestId) => {
    try {
      await matchingAPI.joinRequest(requestId);
      loadRequests();
    } catch (error) {
      console.error('Error joining request:', error);
    }
  };

  const handleAutoMatch = async () => {
    try {
      await matchingAPI.autoMatch();
      loadRequests();
    } catch (error) {
      console.error('Error auto-matching:', error);
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
    const canJoin = item.members?.length < 3 && !isMember;

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
            <Chip mode="flat" style={styles.chip}>
              {item.members?.length || 1}/3
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
    <View style={styles.container}>
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
    </View>
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

