import React from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState } from './src/store';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  Text 
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import IntroScreen from './src/screens/IntroScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SurveyListScreen from './src/screens/SurveyListScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ActiveSurveyScreen from './src/screens/ActiveSurveyScreen';
import SyncQueueScreen from './src/screens/SyncQueueScreen';
import SurveyDetailsScreen from './src/screens/SurveyDetailsScreen';
import Theme from './src/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const queueLength = useSelector((state: RootState) => state.survey.syncQueue.length);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(17, 24, 39, 0.96)',
          borderTopWidth: 1.5,
          borderTopColor: 'rgba(6, 182, 212, 0.25)',
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          height: 60 + (insets.bottom > 0 ? insets.bottom - 4 : 0),
        },
        tabBarActiveTintColor: Theme.colors.glowCyan,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: 'bold',
          letterSpacing: 0.5,
          marginTop: 2,
        },
        tabBarIcon: ({ color }) => {
          let iconName = '🖥️';
          if (route.name === 'Dashboard') iconName = '🖥️';
          else if (route.name === 'SurveyList') iconName = '📋';
          else if (route.name === 'SyncQueue') iconName = '📡';
          else if (route.name === 'Profile') iconName = '👤';
          return <Text style={{ fontSize: 18, color }}>{iconName}</Text>;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'DASHBOARD' }} />
      <Tab.Screen name="SurveyList" component={SurveyListScreen} options={{ title: 'SURVEY RUNS' }} />
      <Tab.Screen 
        name="SyncQueue" 
        component={SyncQueueScreen} 
        options={{ 
          title: 'SYNC TERMINAL',
          tabBarBadge: queueLength > 0 ? queueLength : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Theme.colors.warning,
            color: '#000',
            fontSize: 9,
            fontWeight: 'bold',
          }
        }} 
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'MY PROFILE' }} />
    </Tab.Navigator>
  );
}

function IntroScreenWrapper({ navigation }: any) {
  return <IntroScreen onEnter={() => navigation.replace('Login')} />;
}

function LoginScreenWrapper({ navigation }: any) {
  const dispatch = useDispatch();
  return (
    <LoginScreen 
      onLogin={(username, surveyorId, division) => {
        dispatch({ type: 'auth/login', payload: { name: username, srvId: surveyorId, div: division } });
        navigation.replace('MainTabs');
      }} 
    />
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
            }}
            initialRouteName="Intro"
          >
            <Stack.Screen name="Intro" component={IntroScreenWrapper} />
            <Stack.Screen name="Login" component={LoginScreenWrapper} />
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="ActiveSurvey" component={ActiveSurveyScreen} />
            <Stack.Screen name="SurveyDetails" component={SurveyDetailsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
});
