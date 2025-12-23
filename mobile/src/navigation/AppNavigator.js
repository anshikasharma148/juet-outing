import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import CreateRequestScreen from '../screens/CreateRequestScreen';
import BrowseRequestsScreen from '../screens/BrowseRequestsScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OutingHistoryScreen from '../screens/OutingHistoryScreen';
import ActiveGroupScreen from '../screens/ActiveGroupScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Dashboard" 
      component={DashboardScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="CreateRequest" 
      component={CreateRequestScreen}
      options={{ title: 'Create Outing Request' }}
    />
    <Stack.Screen 
      name="BrowseRequests" 
      component={BrowseRequestsScreen}
      options={{ title: 'Browse Requests' }}
    />
    <Stack.Screen 
      name="ActiveGroup" 
      component={ActiveGroupScreen}
      options={{ title: 'Active Outing' }}
    />
    <Stack.Screen 
      name="OutingHistory" 
      component={OutingHistoryScreen}
      options={{ title: 'Outing History' }}
    />
  </Stack.Navigator>
);

const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Browse') {
            iconName = focused ? 'magnify' : 'magnify';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'message-text' : 'message-text-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Browse" component={BrowseRequestsScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default AppNavigator;

