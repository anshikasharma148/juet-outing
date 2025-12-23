import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, Text } from 'react-native';
import { Provider as PaperProvider, Button } from 'react-native-paper';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import * as Location from 'expo-location';

// Notifications removed - not supported in Expo Go SDK 53+
// Will be added back when using development build

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const [locationPermission, setLocationPermission] = useState(null);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        // Request location permission (non-blocking)
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          setLocationPermission(status === 'granted');
        } catch (e) {
          console.log('Location permission error:', e);
        }

        // Notifications removed - not supported in Expo Go SDK 53+
      } catch (e) {
        console.error('Init error:', e);
        setError(e.message);
      } finally {
        setInitLoading(false);
      }
    })();
  }, []);

  // Log errors for debugging
  useEffect(() => {
    if (error) {
      console.error('App Error:', error);
    }
  }, [error]);

  if (loading || initLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
        <Text style={{ color: 'red', textAlign: 'center', marginBottom: 20 }}>Error: {error}</Text>
        <Button onPress={() => setError(null)}>Retry</Button>
      </View>
    );
  }

  return isAuthenticated ? <AppNavigator /> : <AuthNavigator />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <PaperProvider>
        <AuthProvider>
          <NavigationContainer>
            <AppContent />
          </NavigationContainer>
        </AuthProvider>
      </PaperProvider>
    </ErrorBoundary>
  );
}

