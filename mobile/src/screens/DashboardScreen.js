import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Button, Text, FAB, Chip } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { matchingAPI, outingAPI } from '../services/api';
import { useNavigation } from '@react-navigation/native';

const DashboardScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [activeGroup, setActiveGroup] = useState(null);
  const [myRequest, setMyRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [groupRes, requestsRes] = await Promise.all([
        matchingAPI.getActiveGroup().catch(() => ({ data: { success: false } })),
        outingAPI.getMyRequests(),
      ]);

      if (groupRes.data?.success) {
        setActiveGroup(groupRes.data.group);
      } else {
        setActiveGroup(null);
      }

      const activeRequest = requestsRes.data.requests?.find(
        (r) => r.status === 'pending' || r.status === 'matched'
      );
      setMyRequest(activeRequest || null);
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

  return (
    <View style={styles.container}>
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
                  {activeGroup.members?.length || 0} members
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
                  {myRequest.members?.length || 1}/3 members
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('BrowseRequests')}
                  style={styles.button}
                >
                  Find Members
                </Button>
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
    </View>
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
});

export default DashboardScreen;

