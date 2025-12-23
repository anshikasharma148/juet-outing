import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Button, Text, Chip } from 'react-native-paper';
import { matchingAPI, locationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import * as Location from 'expo-location';

const ActiveGroupScreen = () => {
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
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
        
        // Load gate status
        try {
          const statusRes = await locationAPI.getGateStatus(groupRes.data.group._id);
          if (statusRes.data?.success) {
            setGateStatus(statusRes.data.gateStatus || []);
          }
        } catch (statusError) {
          console.error('Error loading gate status:', statusError);
        }
      }
    } catch (error) {
      console.error('Error loading group:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
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
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.container}>
        <Text>No active group found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
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
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
});

export default ActiveGroupScreen;

