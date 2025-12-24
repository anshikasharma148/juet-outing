import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Text, List, Divider, Switch } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

const SettingsScreen = () => {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [locationEnabled, setLocationEnabled] = React.useState(true);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Preferences
              </Text>
              <List.Item
                title="Push Notifications"
                description="Receive notifications for matches and messages"
                left={(props) => <List.Icon {...props} icon="bell" />}
                right={() => (
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    disabled={true}
                  />
                )}
              />
              <Divider />
              <List.Item
                title="Location Services"
                description="Allow location access for gate check-in"
                left={(props) => <List.Icon {...props} icon="map-marker" />}
                right={() => (
                  <Switch
                    value={locationEnabled}
                    onValueChange={setLocationEnabled}
                    disabled={true}
                  />
                )}
              />
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                About
              </Text>
              <List.Item
                title="App Version"
                description="1.0.0"
                left={(props) => <List.Icon {...props} icon="information" />}
              />
              <Divider />
              <List.Item
                title="Help & Support"
                description="Get help with using the app"
                left={(props) => <List.Icon {...props} icon="help-circle" />}
                onPress={() => {}}
              />
            </Card.Content>
          </Card>
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
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
});

export default SettingsScreen;

