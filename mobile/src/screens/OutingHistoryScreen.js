import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { userAPI } from '../services/api';

const OutingHistoryScreen = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await userAPI.getHistory();
      setHistory(response.data.history || []);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.dateText}>
          {formatDate(item.outingDate)}
        </Text>
        <Text variant="bodySmall" style={styles.timeText}>
          {item.outingTime}
        </Text>
        <Text variant="bodySmall" style={styles.membersText}>
          Members: {item.members?.map((m) => m.name).join(', ')}
        </Text>
        <Text variant="bodySmall" style={styles.statusText}>
          Status: {item.status}
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No outing history
            </Text>
          </View>
        }
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
  dateText: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timeText: {
    color: '#666',
    marginBottom: 8,
  },
  membersText: {
    color: '#666',
    marginTop: 8,
  },
  statusText: {
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
  },
});

export default OutingHistoryScreen;

