import React from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState, loadPersistedState, hydrateAuth, hydrateStore } from './src/store';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, 
  Text,
  View
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import IntroScreen from './src/screens/auth/IntroScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import DashboardScreen from './src/screens/dashboard/DashboardScreen';
import SurveyListScreen from './src/screens/survey/SurveyListScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import ActiveSurveyScreen from './src/screens/survey/ActiveSurveyScreen';
import SyncQueueScreen from './src/screens/sync/SyncQueueScreen';
import SurveyDetailsScreen from './src/screens/survey/SurveyDetailsScreen';
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
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    async function prepare() {
      try {
        const state = await loadPersistedState();
        if (state) {
          if (state.auth) {
            store.dispatch(hydrateAuth(state.auth));
          }
          if (state.survey) {
            store.dispatch(hydrateStore(state.survey));
          }
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#080B11', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#06B6D4', fontSize: 12, fontWeight: 'bold', letterSpacing: 2 }}>GIS SURVEY TERMINAL</Text>
        <Text style={{ color: '#9CA3AF', fontSize: 9, marginTop: 10, letterSpacing: 1 }}>HYDRATING SECURE DATABASE...</Text>
      </View>
    );
  }

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
