import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, Text, Chip } from 'react-native-paper';
import { matchingAPI, locationAPI, outingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';

const ActiveGroupScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [group, setGroup] = useState(null);
  const [request, setRequest] = useState(null);
  const [gateStatus, setGateStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    loadGroup();
  }, []);

  const loadGroup = async () => {
    try {
      const groupRes = await matchingAPI.getActiveGroup();
      
      if (groupRes.data?.success && groupRes.data.group) {
        setGroup(groupRes.data.group);
        
        // Load request if it's a request-based group
        if (groupRes.data.group.requestId) {
          try {
            const requestRes = await outingAPI.getRequest(groupRes.data.group.requestId);
            if (requestRes.data?.success) {
              setRequest(requestRes.data.request);
            }
          } catch (err) {
            console.error('Error loading request:', err);
          }
        }
        
        // Load gate status (only if group has 3+ members)
        if (groupRes.data.group.members?.length >= 3) {
          try {
            const statusRes = await locationAPI.getGateStatus(groupRes.data.group._id);
            if (statusRes.data?.success) {
              setGateStatus(statusRes.data.gateStatus || []);
            }
          } catch (statusError) {
            // Silently fail if gate status not available (e.g., for requests with < 3 members)
            console.log('Gate status not available:', statusError.message);
          }
        }
      }
    } catch (error) {
      console.error('Error loading group:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Leave Outing',
      'Are you sure you want to leave this outing group?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              if (request) {
                await outingAPI.cancelRequest(request._id);
                Alert.alert('Success', 'You have left the outing group', [
                  { 
                    text: 'OK', 
                    onPress: () => {
                      // Try to go back, if not possible, navigate to Home tab
                      if (navigation.canGoBack()) {
                        navigation.goBack();
                      } else {
                        navigation.navigate('Home');
                      }
                    }
                  }
                ]);
              } else if (group) {
                // If no request but has group, try to find the request
                const groupRes = await matchingAPI.getActiveGroup();
                if (groupRes.data?.success && groupRes.data.group?.requestId) {
                  await outingAPI.cancelRequest(groupRes.data.group.requestId);
                  Alert.alert('Success', 'You have left the outing group', [
                    { 
                      text: 'OK', 
                      onPress: () => {
                        if (navigation.canGoBack()) {
                          navigation.goBack();
                        } else {
                          navigation.navigate('Home');
                        }
                      }
                    }
                  ]);
                }
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to leave group');
            }
          },
        },
      ]
    );
  };

  const handleCheckIn = async () => {
    // Only allow check-in if group has 3+ members
    if (!group || (group.members?.length || 0) < 3) {
      Alert.alert('Not Ready', 'You need at least 3 members to check in at the gate.');
      return;
    }

    try {
      setCheckingIn(true);
      const location = await Location.getCurrentPositionAsync({});
      
      await locationAPI.checkIn({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        groupId: group._id,
      });

      loadGroup();
    } catch (error) {
      console.error('Error checking in:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Text>No active group found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              Outing Details
            </Text>
            <Text variant="bodyLarge" style={styles.dateText}>
              {formatDate(group.outingDate)}
            </Text>
            <Text variant="bodyMedium" style={styles.timeText}>
              Time: {group.outingTime}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Group Members
            </Text>
            {group.members?.map((member, index) => {
              const atGate = gateStatus.some(
                (status) => status.userId?.toString() === member._id?.toString()
              );
              return (
                <View key={index} style={styles.memberItem}>
                  <View style={styles.memberInfo}>
                    <Text variant="bodyLarge">{member.name}</Text>
                    <Text variant="bodySmall" style={styles.memberDetails}>
                      Year {member.year}, Sem {member.semester}
                    </Text>
                  </View>
                  {atGate && (
                    <Chip mode="flat" style={styles.gateChip}>
                      At Gate
                    </Chip>
                  )}
                </View>
              );
            })}
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleCheckIn}
          loading={checkingIn}
          style={styles.button}
          icon="map-marker"
        >
          Check In at Gate
        </Button>

        <Button
          mode="outlined"
          onPress={handleCancel}
          style={[styles.button, styles.cancelButton]}
          buttonColor="#ff5252"
          textColor="#fff"
        >
          Leave Outing
        </Button>
      </View>
    </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dateText: {
    marginTop: 8,
    color: '#666',
  },
  timeText: {
    marginTop: 4,
    color: '#666',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  memberInfo: {
    flex: 1,
  },
  memberDetails: {
    color: '#666',
    marginTop: 4,
  },
  gateChip: {
    backgroundColor: '#4caf50',
  },
  button: {
    marginTop: 20,
    paddingVertical: 5,
  },
  cancelButton: {
    marginTop: 12,
  },
});

export default ActiveGroupScreen;

