import React from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState, navigateTo, login } from './src/store';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, View } from 'react-native';

import IntroScreen from './src/screens/IntroScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ActiveSurveyScreen from './src/screens/ActiveSurveyScreen';
import SyncQueueScreen from './src/screens/SyncQueueScreen';
import Theme from './src/theme';

function AppContent() {
  const currentScreen = useSelector((state: RootState) => state.navigation.currentScreen);
  const dispatch = useDispatch();

  const handleEnterConsole = () => {
    dispatch(navigateTo('LOGIN'));
  };

  const handleLogin = (username: string, surveyorId: string, division: string) => {
    dispatch(login({ name: username, srvId: surveyorId, div: division }));
    dispatch(navigateTo('DASHBOARD'));
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'INTRO':
        return <IntroScreen onEnter={handleEnterConsole} />;
      case 'LOGIN':
        return <LoginScreen onLogin={handleLogin} />;
      case 'DASHBOARD':
        return <DashboardScreen />;
      case 'SURVEY':
        return <ActiveSurveyScreen />;
      case 'QUEUE':
        return <SyncQueueScreen />;
      default:
        return <IntroScreen onEnter={handleEnterConsole} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        {renderScreen()}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  container: {
    flex: 1,
  },
});

