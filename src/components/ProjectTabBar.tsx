import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { RootState } from '../store';

const labels: Record<string, string> = {
  Dashboard: 'DASH\nBOARD', SurveyList: 'SURVEY\nRUNS',
  ErectionExecution: 'ERECTION\nEXECUTION', SyncQueue: 'SYNC\nTERMINAL', Profile: 'MY\nPROFILE',
};

function TabIcon({ name, color }: { name: string; color: string }) {
  return <Svg width={21} height={21} viewBox="0 0 28 28" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {name === 'Dashboard' && <><Rect x="3" y="3" width="9" height="10" rx="2" fill={color} /><Rect x="17" y="3" width="8" height="6" rx="2" /><Rect x="3" y="18" width="9" height="7" rx="2" /><Rect x="17" y="14" width="8" height="11" rx="2" fill={color} /></>}
    {name === 'SurveyList' && <><Rect x="5" y="5" width="18" height="21" rx="2" /><Rect x="10" y="2" width="8" height="6" rx="2" fill={color} /><Path d="M9 12H19M9 17H19M9 22H17" /></>}
    {name === 'ErectionExecution' && <><Path d="M3 7H25L19 3H10L3 7ZM10 7V25M15 7V25M7 25H18M10 11L15 16L10 21M15 11L10 16L15 21M23 7V17M21 18Q23 22 25 18" /><Line x1="4" y1="10" x2="4" y2="14" /></>}
    {name === 'SyncQueue' && <><Path d="M7 21H5C0 20 1 11 7 11C8 2 21 2 22 11C29 11 29 21 23 21H21" fill={color} /><Path d="M14 25V13M10 17L14 13L18 17" /></>}
    {name === 'Profile' && <><Circle cx="14" cy="8" r="6" fill={color} /><Path d="M3 26C3 12 25 12 25 26Z" fill={color} /></>}
  </Svg>;
}

export default function ProjectTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const queueLength = useSelector((store: RootState) => store.survey.syncQueue.length);
  const isErection = state.routes[state.index].name === 'ErectionExecution';
  return <View style={[styles.container, isErection && styles.erectionContainer]}>
    {isErection && <View style={styles.landscape} pointerEvents="none">
      <Image source={require('../../assets/erection-footer-v2.png')} style={styles.landscapeImage} resizeMode="stretch" />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="landscapeFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#EFF7FF" stopOpacity={1} />
            <Stop offset="35%" stopColor="#EFF7FF" stopOpacity={0.65} />
            <Stop offset="75%" stopColor="#EFF7FF" stopOpacity={0.12} />
            <Stop offset="100%" stopColor="#EFF7FF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#landscapeFade)" />
      </Svg>
    </View>}
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 5) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const color = focused ? '#852CFA' : '#4E6187';
        const options = descriptors[route.key].options;
        return <TouchableOpacity key={route.key} accessibilityRole="button"
          accessibilityState={{ selected: focused }} accessibilityLabel={options.tabBarAccessibilityLabel || options.title || labels[route.name]}
          testID={options.tabBarTestID} activeOpacity={0.75} style={styles.tab}
          onPress={() => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          }}
          onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}>
          <View style={styles.iconWrap}><TabIcon name={route.name} color={color} />
            {route.name === 'SyncQueue' && queueLength > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{queueLength > 99 ? '99+' : queueLength}</Text></View>}
          </View>
          <Text style={[styles.label, { color }]}>{labels[route.name]}</Text>
          {focused && <View style={styles.indicator} />}
        </TouchableOpacity>;
      })}
    </View>
    {isErection && <TouchableOpacity style={styles.addButton} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Create erection execution" onPress={() => navigation.getParent()?.navigate('ErectionSetup')}>
      <Svg width={38} height={38} viewBox="0 0 58 58"><Defs><LinearGradient id="addGradient" x1="0%" y1="0%" x2="100%" y2="100%"><Stop offset="0" stopColor="#26BBFF" /><Stop offset="0.55" stopColor="#6262FF" /><Stop offset="1" stopColor="#A42AF3" /></LinearGradient></Defs><Circle cx="29" cy="29" r="29" fill="url(#addGradient)" /><Path d="M29 18V40M18 29H40" stroke="white" strokeWidth="2.5" strokeLinecap="round" /></Svg>
    </TouchableOpacity>}
  </View>;
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#EFF7FF', overflow: 'visible' },
  erectionContainer: { paddingTop: 36 },
  landscape: { position: 'absolute', top: 0, left: 0, right: 0, height: 48, overflow: 'hidden' },
  landscapeImage: { position: 'absolute', bottom: 0, left: 0, width: '100%', height: 68 },
  bar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 8, shadowColor: '#5576A5', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  tab: { flex: 1, alignItems: 'center', paddingBottom: 7, minHeight: 54 },
  iconWrap: { height: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  label: { fontSize: 8, lineHeight: 10, fontWeight: '700', textAlign: 'center' },
  indicator: { position: 'absolute', bottom: 1, width: '72%', height: 3, borderRadius: 2, backgroundColor: '#852CFA' },
  badge: { position: 'absolute', top: -5, right: -12, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3, backgroundColor: '#FF953B', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  addButton: { position: 'absolute', top: 0, left: '50%', marginLeft: -22, width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#943DF1', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 9, zIndex: 20, elevation: 12 },
});
