import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Path,
  Circle,
  Line,
  G,
  Text as SvgText,
} from 'react-native-svg';
import { RootState } from '../../store';
import { fetchDashboardMetricsAction } from '../../store/actions/dashboardAction';
import { DashboardApiResponse } from '../../services/dashboardService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();

  const auth = useSelector((state: RootState) => state.auth);
  const survey = useSelector((state: RootState) => state.survey);

  // Dynamic API state (Zero hardcoded data or dummy fallbacks)
  const [dashboardData, setDashboardData] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Active Graph Tab: 'ERECTION_MIX' | 'SURVEY_AREA'
  const [activeGraphTab, setActiveGraphTab] = useState<'ERECTION_MIX' | 'SURVEY_AREA'>('ERECTION_MIX');

  // Prevent spamming concurrent requests
  const isFetchingRef = useRef(false);

  // Load metrics dynamically from backend API
  const loadMetrics = useCallback(() => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    dispatch(
      fetchDashboardMetricsAction(
        {},
        (data) => {
          isFetchingRef.current = false;
          setDashboardData(data);
          setLoading(false);
          setRefreshing(false);
          setFetchError(null);
        },
        (error) => {
          isFetchingRef.current = false;
          console.warn('Dashboard metrics fetch error:', error);
          setLoading(false);
          setRefreshing(false);
          setFetchError(typeof error === 'string' ? error : 'Failed to connect to backend server');
        }
      ) as any
    );
  }, [dispatch]);

  // Refresh whenever this tab screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadMetrics();
    }, [loadMetrics])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    isFetchingRef.current = false;
    loadMetrics();
  };

  // Dimensions for Chart SVG
  const chartCardWidth = SCREEN_WIDTH - 32;
  const svgWidth = Math.max(chartCardWidth - 24, 280);
  const svgHeight = 175;

  const chartMargin = { left: 32, right: 30, top: 18, bottom: 24 };
  const innerWidth = svgWidth - chartMargin.left - chartMargin.right;
  const innerHeight = svgHeight - chartMargin.top - chartMargin.bottom;
  const barWidth = 14;

  // Extract dynamic data arrays from API with maximum envelope safety
  const rawData: any = dashboardData || {};
  const actualData: any =
    rawData?.Data?.Data ||
    rawData?.Data?.data ||
    rawData?.Data ||
    rawData?.data ||
    rawData ||
    {};

  const erectionMixData: Array<{ day: string; date: string; poles: number; dtr: number; cableMeters: number }> =
    Array.isArray(actualData?.erection_mix_graph) ? actualData.erection_mix_graph : [];
  const surveyProgressData: Array<{ day: string; date: string; km: number; meters: number }> =
    Array.isArray(actualData?.survey_progress_graph) ? actualData.survey_progress_graph : [];
  const recentSurveys: any[] = Array.isArray(actualData?.recent_surveys) ? actualData.recent_surveys : [];
  const recentErections: any[] = Array.isArray(actualData?.recent_erections) ? actualData.recent_erections : [];
  const kpi = actualData?.kpi || null;

  // Dynamic Scales for Erection Mix Graph
  const maxStackUnits = Math.max(
    5,
    ...erectionMixData.map((d) => (Number(d.poles) || 0) + (Number(d.dtr) || 0))
  );
  const maxCableMeters = Math.max(
    100,
    ...erectionMixData.map((d) => Number(d.cableMeters) || 0)
  );

  // Dynamic Scales for Survey Progress Area Graph
  const maxKm = Math.max(1.0, ...surveyProgressData.map((d) => Number(d.km) || 0));

  // Compute Bezier Curve for Survey Progress dynamically
  const surveyPoints = surveyProgressData.map((item, idx) => {
    const totalPoints = Math.max(surveyProgressData.length - 1, 1);
    const x = chartMargin.left + (idx / totalPoints) * innerWidth;
    const y = chartMargin.top + innerHeight - ((Number(item.km) || 0) / maxKm) * innerHeight;
    return { x, y, ...item };
  });

  const generateSmoothAreaPath = () => {
    if (surveyPoints.length < 2) return { linePath: '', areaPath: '', peakIndex: -1 };

    let linePath = `M ${surveyPoints[0].x} ${surveyPoints[0].y}`;
    let maxVal = -1;
    let peakIndex = -1;

    for (let i = 0; i < surveyPoints.length; i++) {
      const val = Number(surveyPoints[i].km) || 0;
      if (val > maxVal && val > 0) {
        maxVal = val;
        peakIndex = i;
      }
    }

    for (let i = 0; i < surveyPoints.length - 1; i++) {
      const p0 = surveyPoints[i === 0 ? 0 : i - 1];
      const p1 = surveyPoints[i];
      const p2 = surveyPoints[i + 1];
      const p3 = surveyPoints[i + 2 < surveyPoints.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const groundY = chartMargin.top + innerHeight;
    const areaPath = `${linePath} L ${surveyPoints[surveyPoints.length - 1].x} ${groundY} L ${surveyPoints[0].x} ${groundY} Z`;
    return { linePath, areaPath, peakIndex };
  };

  const { linePath, areaPath, peakIndex } = generateSmoothAreaPath();

  // Mix Graph: Stringing line path
  const stringingPoints = erectionMixData.map((item, idx) => {
    const step = erectionMixData.length > 0 ? innerWidth / erectionMixData.length : innerWidth;
    const cx = chartMargin.left + idx * step + step / 2;
    const cy = chartMargin.top + innerHeight - ((Number(item.cableMeters) || 0) / maxCableMeters) * innerHeight;
    return { cx, cy, ...item };
  });

  let stringingLinePath = '';
  if (stringingPoints.length >= 2) {
    stringingPoints.forEach((pt, idx) => {
      if (idx === 0) stringingLinePath += `M ${pt.cx} ${pt.cy}`;
      else stringingLinePath += ` L ${pt.cx} ${pt.cy}`;
    });
  }

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        style={styles.scrollWrapper}
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 8, 34) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#0284C7']}
            tintColor="#0284C7"
          />
        }
      >
        {/* ========================================================= */}
        {/* 1. COMPACT TELEMETRY & IDENTITY HUD HEADER               */}
        {/* ========================================================= */}
        <View style={styles.topHudHeader}>
          <View style={styles.operatorCol}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandIcon}>⚡</Text>
              <Text style={styles.brandText}>GIS FIELD OPERATOR</Text>
            </View>
            <Text style={styles.operatorGreeting} numberOfLines={1}>
              {auth.firstName ? `${auth.firstName} ${auth.lastName}`.trim() : (auth.surveyorName || 'Field Surveyor')}
            </Text>
            <Text style={styles.operatorSub} numberOfLines={1}>
              {auth.roleName || auth.designationName || 'GIS Engineer'} • {auth.division || 'Central Grid'}
            </Text>
          </View>

          <View style={styles.telemetryCol}>
            {/* Live GPS Telemetry Indicator */}
            <View style={styles.gpsChip}>
              <View style={styles.gpsPulseDot} />
              <Text style={styles.gpsText}>±1.6m RTK</Text>
            </View>

            {/* Offline Sync Status Badge */}
            <TouchableOpacity
              style={[
                styles.syncQueueBadge,
                (survey.syncQueue?.length || 0) > 0 && styles.syncQueueBadgeActive,
              ]}
              onPress={() => navigation.navigate('SyncQueue')}
              activeOpacity={0.8}
            >
              <Text style={styles.syncQueueIcon}>📡</Text>
              <Text style={styles.syncQueueText}>
                {(survey.syncQueue?.length || 0) > 0 ? `${survey.syncQueue.length} Queued` : 'Synced'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CONNECTION NOTICE BANNER (NON-BLOCKING) */}
        {fetchError && (
          <View style={styles.errorBanner}>
            <View style={styles.errorBannerContent}>
              <Text style={styles.errorBannerIcon}>⚠️</Text>
              <Text style={styles.errorBannerText} numberOfLines={2}>
                {fetchError}
              </Text>
            </View>
            <TouchableOpacity style={styles.errorBannerRetryBtn} onPress={loadMetrics} activeOpacity={0.75}>
              <Text style={styles.errorBannerRetryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ========================================================= */}
        {/* 2. DYNAMIC DAILY PROGRESS KPI STRIP (FROM BACKEND)        */}
        {/* ========================================================= */}
        <View style={styles.kpiRow}>
          {/* Poles Erected */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiIcon}>🏗️</Text>
              <Text style={styles.kpiTrend}>
                {loading && !kpi ? '...' : `+${kpi?.poles_erected_today ?? 0} Today`}
              </Text>
            </View>
            <Text style={styles.kpiValue}>
              {loading && !kpi ? '-' : String(kpi?.total_poles_erected ?? 0)}
            </Text>
            <Text style={styles.kpiLabel}>POLES ERECTED</Text>
          </View>

          {/* DTR Platforms */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiIcon}>⚡</Text>
              <Text style={styles.kpiTrend}>
                {loading && !kpi ? '...' : `+${kpi?.dtrs_installed_today ?? 0} Units`}
              </Text>
            </View>
            <Text style={[styles.kpiValue, { color: '#8B5CF6' }]}>
              {loading && !kpi ? '-' : String(kpi?.total_dtrs_installed ?? 0)}
            </Text>
            <Text style={styles.kpiLabel}>DTR PLATFORMS</Text>
          </View>

          {/* Cable Strung */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiIcon}>➰</Text>
              <Text style={styles.kpiTrend}>
                {loading && !kpi ? '...' : `+${kpi?.cable_strung_km_today ?? 0} km`}
              </Text>
            </View>
            <Text style={[styles.kpiValue, { color: '#D97706' }]}>
              {loading && !kpi ? '-' : String(kpi?.total_cable_strung_km ?? 0)}
              <Text style={styles.kpiUnit}>km</Text>
            </Text>
            <Text style={styles.kpiLabel}>CABLE STRUNG</Text>
          </View>

          {/* Survey Route */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiIcon}>🗺️</Text>
              <Text style={styles.kpiTrend}>
                {loading && !kpi ? '...' : `+${kpi?.survey_route_km_today ?? 0} km`}
              </Text>
            </View>
            <Text style={[styles.kpiValue, { color: '#059669' }]}>
              {loading && !kpi ? '-' : String(kpi?.total_survey_route_km ?? 0)}
              <Text style={styles.kpiUnit}>km</Text>
            </Text>
            <Text style={styles.kpiLabel}>SURVEY ROUTE</Text>
          </View>
        </View>

        {/* ========================================================= */}
        {/* 3. DYNAMIC VISUAL ANALYTICS: MIX GRAPH OR AREA GRAPH      */}
        {/* ========================================================= */}
        <View style={styles.chartPanel}>
          {/* Segmented Switcher Header */}
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleCol}>
              <Text style={styles.chartPanelCategory}>OPERATIONAL ANALYTICS</Text>
              <Text style={styles.chartPanelTitle}>
                {activeGraphTab === 'ERECTION_MIX'
                  ? 'Erection & Stringing Mix'
                  : 'Survey Route Progression (km)'}
              </Text>
            </View>

            {/* Segmented Toggle Pills */}
            <View style={styles.segmentContainer}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  activeGraphTab === 'ERECTION_MIX' && styles.segmentBtnActive,
                ]}
                onPress={() => setActiveGraphTab('ERECTION_MIX')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentText,
                    activeGraphTab === 'ERECTION_MIX' && styles.segmentTextActive,
                  ]}
                >
                  Mix Graph
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  activeGraphTab === 'SURVEY_AREA' && styles.segmentBtnActive,
                ]}
                onPress={() => setActiveGraphTab('SURVEY_AREA')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentText,
                    activeGraphTab === 'SURVEY_AREA' && styles.segmentTextActive,
                  ]}
                >
                  Survey Line
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Legend Strip */}
          {activeGraphTab === 'ERECTION_MIX' ? (
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSquare, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.legendText}>Poles (pcs)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSquare, { backgroundColor: '#8B5CF6' }]} />
                <Text style={styles.legendText}>DTR Units</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.legendText}>Stringing (m)</Text>
              </View>
            </View>
          ) : (
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSquare, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendText}>Daily Surveyed Distance (Kilometers)</Text>
              </View>
              <View style={styles.legendBadge}>
                <Text style={styles.legendBadgeText}>
                  Total: {kpi?.total_survey_route_km ?? 0} km
                </Text>
              </View>
            </View>
          )}

          {/* SVG RENDERING CONTAINER */}
          <View style={styles.svgContainer}>
            {loading && !dashboardData ? (
              <View style={styles.chartLoadingSkeleton}>
                <ActivityIndicator size="small" color="#0284C7" />
                <Text style={styles.chartLoadingText}>Syncing live metrics from PostGIS...</Text>
              </View>
            ) : activeGraphTab === 'ERECTION_MIX' ? (
              // ----------------------------------------------------
              // GRAPH A: DYNAMIC STACKED BARS (POLES + DTR) + STRINGING
              // ----------------------------------------------------
              <Svg width={svgWidth} height={svgHeight}>
                <Defs>
                  <LinearGradient id="poleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#60A5FA" />
                    <Stop offset="100%" stopColor="#2563EB" />
                  </LinearGradient>
                  <LinearGradient id="dtrGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#A78BFA" />
                    <Stop offset="100%" stopColor="#7C3AED" />
                  </LinearGradient>
                </Defs>

                {/* Horizontal Gridlines & Y-Axis Labels (Left) */}
                {[0, Math.round(maxStackUnits / 2), maxStackUnits].map((val) => {
                  const y = chartMargin.top + innerHeight - (val / maxStackUnits) * innerHeight;
                  return (
                    <G key={`grid-erect-${val}`}>
                      <Line
                        x1={chartMargin.left}
                        y1={y}
                        x2={chartMargin.left + innerWidth}
                        y2={y}
                        stroke="rgba(148, 163, 184, 0.18)"
                        strokeDasharray={[3, 3]}
                        strokeWidth={1}
                      />
                      <SvgText
                        x={chartMargin.left - 6}
                        y={y + 3}
                        fontSize={8}
                        fontWeight="600"
                        fill="#94A3B8"
                        textAnchor="end"
                      >
                        {String(val)}
                      </SvgText>
                    </G>
                  );
                })}

                {/* Right Axis Labels (Cable Stringing: 0 to maxCableMeters) */}
                {[0, Math.round(maxCableMeters / 2), maxCableMeters].map((cableVal) => {
                  const y = chartMargin.top + innerHeight - (cableVal / maxCableMeters) * innerHeight;
                  return (
                    <SvgText
                      key={`cable-y-${cableVal}`}
                      x={chartMargin.left + innerWidth + 6}
                      y={y + 3}
                      fontSize={7.5}
                      fontWeight="600"
                      fill="#D97706"
                      textAnchor="start"
                    >
                      {cableVal === 0 ? '0m' : cableVal >= 1000 ? `${(cableVal / 1000).toFixed(1)}k` : `${cableVal}m`}
                    </SvgText>
                  );
                })}

                {/* Dynamic Stacked Bars */}
                {erectionMixData.map((item, idx) => {
                  const step = erectionMixData.length > 0 ? innerWidth / erectionMixData.length : innerWidth;
                  const x = chartMargin.left + idx * step + (step - barWidth) / 2;

                  const poleH = ((Number(item.poles) || 0) / maxStackUnits) * innerHeight;
                  const poleY = chartMargin.top + innerHeight - poleH;

                  const dtrH = ((Number(item.dtr) || 0) / maxStackUnits) * innerHeight;
                  const dtrY = poleY - dtrH;

                  return (
                    <G key={`bar-stack-${item.day}-${idx}`}>
                      {/* Pole Bar (Bottom Stack) */}
                      {poleH > 0 && (
                        <Rect
                          x={x}
                          y={poleY}
                          width={barWidth}
                          height={poleH}
                          fill="url(#poleGrad)"
                          rx={2}
                        />
                      )}

                      {/* DTR Bar (Top Stack) */}
                      {dtrH > 0 && (
                        <Rect
                          x={x}
                          y={dtrY}
                          width={barWidth}
                          height={dtrH}
                          fill="url(#dtrGrad)"
                          rx={2}
                        />
                      )}

                      {/* X-Axis Day Label */}
                      <SvgText
                        x={x + barWidth / 2}
                        y={chartMargin.top + innerHeight + 15}
                        fontSize={9}
                        fontWeight="700"
                        fill="#64748B"
                        textAnchor="middle"
                      >
                        {String(item.day || '')}
                      </SvgText>
                    </G>
                  );
                })}

                {/* Dynamic Cable Stringing Overlay Line */}
                {stringingLinePath && stringingLinePath.includes('L') ? (
                  <Path
                    d={stringingLinePath}
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}

                {/* Circular Nodes on Stringing Line */}
                {stringingPoints.map((pt, idx) => (
                  <Circle
                    key={`node-${idx}`}
                    cx={pt.cx}
                    cy={pt.cy}
                    r={3.8}
                    fill="#FFFFFF"
                    stroke="#D97706"
                    strokeWidth={2}
                  />
                ))}
              </Svg>
            ) : (
              // ----------------------------------------------------
              // GRAPH B: DYNAMIC SMOOTH AREA GRAPH (SURVEY LINE KM)
              // ----------------------------------------------------
              <Svg width={svgWidth} height={svgHeight}>
                <Defs>
                  <LinearGradient id="surveyAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#10B981" stopOpacity={0.45} />
                    <Stop offset="55%" stopColor="#10B981" stopOpacity={0.15} />
                    <Stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                  </LinearGradient>
                </Defs>

                {/* Horizontal Gridlines & Y-Axis Labels */}
                {[0, Math.round((maxKm / 2) * 10) / 10, maxKm].map((val) => {
                  const y = chartMargin.top + innerHeight - (val / maxKm) * innerHeight;
                  return (
                    <G key={`grid-km-${val}`}>
                      <Line
                        x1={chartMargin.left}
                        y1={y}
                        x2={chartMargin.left + innerWidth}
                        y2={y}
                        stroke="rgba(148, 163, 184, 0.18)"
                        strokeDasharray={[3, 3]}
                        strokeWidth={1}
                      />
                      <SvgText
                        x={chartMargin.left - 6}
                        y={y + 3}
                        fontSize={8}
                        fontWeight="600"
                        fill="#94A3B8"
                        textAnchor="end"
                      >
                        {val === 0 ? '0' : `${val}k`}
                      </SvgText>
                    </G>
                  );
                })}

                {/* Area Gradient Fill */}
                {areaPath && areaPath.includes('Z') ? (
                  <Path d={areaPath} fill="url(#surveyAreaGrad)" />
                ) : null}

                {/* Smooth Perimeter Line */}
                {linePath && linePath.includes('C') ? (
                  <Path
                    d={linePath}
                    stroke="#10B981"
                    strokeWidth={3}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}

                {/* Point Dots & X-Labels */}
                {surveyPoints.map((pt, idx) => (
                  <G key={`pt-${idx}`}>
                    <Circle
                      cx={pt.x}
                      cy={pt.y}
                      r={3.8}
                      fill="#FFFFFF"
                      stroke="#059669"
                      strokeWidth={2}
                    />

                    {/* Peak Callout Badge if > 0 */}
                    {idx === peakIndex && (Number(pt.km) || 0) > 0 && (
                      <G>
                        <Rect
                          x={pt.x - 22}
                          y={pt.y - 20}
                          width={44}
                          height={16}
                          rx={8}
                          fill="#059669"
                        />
                        <SvgText
                          x={pt.x}
                          y={pt.y - 9}
                          fontSize={8}
                          fontWeight="bold"
                          fill="#FFFFFF"
                          textAnchor="middle"
                        >
                          {String(pt.km)} km
                        </SvgText>
                      </G>
                    )}

                    {/* Day Label */}
                    <SvgText
                      x={pt.x}
                      y={chartMargin.top + innerHeight + 15}
                      fontSize={9}
                      fontWeight="700"
                      fill="#64748B"
                      textAnchor="middle"
                    >
                      {String(pt.day || '')}
                    </SvgText>
                  </G>
                ))}
              </Svg>
            )}
          </View>

          {/* Dynamic Footer Under Chart */}
          <View style={styles.chartFooterRow}>
            {activeGraphTab === 'ERECTION_MIX' ? (
              <>
                <Text style={styles.chartFooterMetric}>
                  Total Erected:{' '}
                  <Text style={styles.chartFooterHighlight}>
                    {kpi?.total_poles_erected ?? 0} Poles
                  </Text>{' '}
                  •{' '}
                  <Text style={styles.chartFooterHighlight}>
                    {kpi?.total_dtrs_installed ?? 0} DTRs
                  </Text>
                </Text>
                <Text style={styles.chartFooterMetric}>
                  Stringing:{' '}
                  <Text style={styles.chartFooterHighlight}>
                    {kpi?.total_cable_strung_km ?? 0} km
                  </Text>
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.chartFooterMetric}>
                  Total Route:{' '}
                  <Text style={styles.chartFooterHighlight}>
                    {kpi?.total_survey_route_km ?? 0} km
                  </Text>
                </Text>
                <Text style={styles.chartFooterMetric}>
                  Today:{' '}
                  <Text style={styles.chartFooterHighlight}>
                    +{kpi?.survey_route_km_today ?? 0} km
                  </Text>
                </Text>
              </>
            )}
          </View>
        </View>

        {/* ========================================================= */}
        {/* 4. QUICK LINKS / FAST-ACTION COMMAND DOCK                 */}
        {/* ========================================================= */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>QUICK ACTION LINKS</Text>
          <Text style={styles.sectionSub}>ONE-TAP FIELD ENTRY</Text>
        </View>

        <View style={styles.quickGrid}>
          {/* Quick Action 1: New Survey */}
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('SurveySetup')}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.quickIconWrap,
                {
                  backgroundColor: 'rgba(2, 132, 199, 0.1)',
                  borderColor: 'rgba(2, 132, 199, 0.3)',
                },
              ]}
            >
              <Text style={styles.quickIcon}>🗺️</Text>
            </View>
            <Text style={styles.quickTitle}>New Survey</Text>
            <Text style={styles.quickSub}>Map 33/11KV/LT</Text>
          </TouchableOpacity>

          {/* Quick Action 2: New Erection Setup */}
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('ErectionSetup')}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.quickIconWrap,
                {
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  borderColor: 'rgba(139, 92, 246, 0.3)',
                },
              ]}
            >
              <Text style={styles.quickIcon}>⚡</Text>
            </View>
            <Text style={styles.quickTitle}>New Erection</Text>
            <Text style={styles.quickSub}>Init DWG Project</Text>
          </TouchableOpacity>

          {/* Quick Action 3: Erection Execution */}
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('ErectionExecution')}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.quickIconWrap,
                {
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                },
              ]}
            >
              <Text style={styles.quickIcon}>🏗️</Text>
            </View>
            <Text style={styles.quickTitle}>Erection Exec</Text>
            <Text style={styles.quickSub}>Poles, BOM & Span</Text>
          </TouchableOpacity>

          {/* Quick Action 4: Offline Sync Queue */}
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('SyncQueue')}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.quickIconWrap,
                {
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                },
              ]}
            >
              <Text style={styles.quickIcon}>📡</Text>
            </View>
            <Text style={styles.quickTitle}>Sync Terminal</Text>
            <Text style={styles.quickSub}>
              {(survey.syncQueue?.length || 0) > 0 ? `${survey.syncQueue.length} Ready` : 'PostGIS Push'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ========================================================= */}
        {/* 5. RECENT SURVEY RUNS (DYNAMIC FROM BACKEND API)          */}
        {/* ========================================================= */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>RECENT SURVEY RUNS</Text>
            <Text style={styles.sectionSub}>LAST 5 LOCATIONS & SYNC STATUS</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('SurveyList')} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>View All &gt;</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recordsList}>
          {recentSurveys.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🗺️</Text>
              <Text style={styles.emptyTitle}>
                {loading && !dashboardData ? 'Loading Survey Runs...' : 'No Survey Runs Yet'}
              </Text>
              <Text style={styles.emptySub}>
                {loading && !dashboardData
                  ? 'Connecting to database server...'
                  : 'Initialize a new electrical survey line route using Quick Actions above.'}
              </Text>
            </View>
          ) : (
            recentSurveys.map((item) => (
              <TouchableOpacity
                key={String(item.id)}
                style={styles.recordCard}
                onPress={() => navigation.navigate('SurveyList')}
                activeOpacity={0.8}
              >
                <View style={styles.recordMainCol}>
                  <View style={styles.recordBadgeRow}>
                    {/* Voltage Class Pill */}
                    <View
                      style={[
                        styles.voltagePill,
                        item.voltageClass === '33KV HT' && styles.voltage33KV,
                        item.voltageClass === '11KV HT' && styles.voltage11KV,
                        item.voltageClass === 'LT 440V' && styles.voltage440V,
                      ]}
                    >
                      <Text
                        style={[
                          styles.voltageText,
                          item.voltageClass === '33KV HT' && { color: '#9333EA' },
                          item.voltageClass === '11KV HT' && { color: '#0284C7' },
                          item.voltageClass === 'LT 440V' && { color: '#059669' },
                        ]}
                      >
                        {item.voltageClass || 'SURVEY'}
                      </Text>
                    </View>

                    {/* Sync Status Badge */}
                    <View
                      style={[
                        styles.statusPill,
                        item.status === 'SYNCED' ? styles.statusPillSynced : styles.statusPillPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          item.status === 'SYNCED' ? { color: '#059669' } : { color: '#D97706' },
                        ]}
                      >
                        {item.status === 'SYNCED' ? '● SYNCED' : '▲ PENDING'}
                      </Text>
                    </View>

                    {item.timeAgo ? <Text style={styles.recordTime}>{String(item.timeAgo)}</Text> : null}
                  </View>

                  {/* Location Name */}
                  <Text style={styles.recordLocation} numberOfLines={1}>
                    {item.location || 'Survey Route'}
                  </Text>
                  <Text style={styles.recordSubLocation} numberOfLines={1}>
                    {item.subLocation || 'Section'}
                  </Text>

                  {/* Structures Captured */}
                  <View style={styles.recordMetricsRow}>
                    <Text style={styles.recordMetricTag}>
                      📍 {item.polesCount ?? 0} Poles {(item.dtrCount ?? 0) > 0 ? `• ${item.dtrCount} DTR` : ''}
                    </Text>
                    {(Number(item.distanceMeters) || 0) > 0 && (
                      <>
                        <Text style={styles.recordMetricDot}>•</Text>
                        <Text style={styles.recordMetricTag}>📏 {item.distanceMeters}m Span</Text>
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.recordArrowBox}>
                  <Text style={styles.recordArrow}>›</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ========================================================= */}
        {/* 6. RECENT ERECTION PROJECTS (DYNAMIC FROM BACKEND API)    */}
        {/* ========================================================= */}
        <View style={[styles.sectionHeaderRow, { marginTop: 12 }]}>
          <View>
            <Text style={styles.sectionTitle}>RECENT ERECTION PROJECTS</Text>
            <Text style={styles.sectionSub}>LAST 5 LOCATIONS & ERECTION STATUS</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('ErectionExecution')} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>View All &gt;</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recordsList}>
          {recentErections.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🏗️</Text>
              <Text style={styles.emptyTitle}>
                {loading && !dashboardData ? 'Loading Erection Projects...' : 'No Erection Projects Yet'}
              </Text>
              <Text style={styles.emptySub}>
                {loading && !dashboardData
                  ? 'Connecting to database server...'
                  : 'Start pole erections and structure specifications via Quick Actions above.'}
              </Text>
            </View>
          ) : (
            recentErections.map((item) => {
              const erected = Number(item.erectedPoles) || 0;
              const total = Math.max(Number(item.totalPoles) || 1, 1);
              const pct = Math.min(100, Math.round((erected / total) * 100));
              return (
                <TouchableOpacity
                  key={String(item.id)}
                  style={styles.recordCard}
                  onPress={() => navigation.navigate('ErectionExecution')}
                  activeOpacity={0.8}
                >
                  <View style={styles.recordMainCol}>
                    <View style={styles.recordBadgeRow}>
                      {/* Drawing Number Chip */}
                      <View style={styles.drawingNoChip}>
                        <Text style={styles.drawingNoText}>{item.drawingNo || `DWG-${item.id}`}</Text>
                      </View>

                      {/* Status Badge */}
                      <View
                        style={[
                          styles.statusPill,
                          item.status === 'COMPLETED' ? styles.statusPillSynced : styles.statusPillPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            item.status === 'COMPLETED' ? { color: '#059669' } : { color: '#D97706' },
                          ]}
                        >
                          {item.status === 'COMPLETED' ? '✓ FINISHED' : '⚡ IN-PROGRESS'}
                        </Text>
                      </View>

                      <Text style={styles.recordPctText}>{pct}%</Text>
                    </View>

                    {/* Location Details */}
                    <Text style={styles.recordLocation} numberOfLines={1}>
                      {item.location || 'Project Location'}
                    </Text>
                    <Text style={styles.recordSubLocation} numberOfLines={1}>
                      {item.subLocation || 'Grid Section'} • {item.contractor || 'Contractor N/A'}
                    </Text>

                    {/* Mini Progress Bar & Counts */}
                    <View style={styles.erectProgressRow}>
                      <View style={styles.miniBarBg}>
                        <View
                          style={[
                            styles.miniBarFill,
                            {
                              width: `${pct}%`,
                              backgroundColor: item.status === 'COMPLETED' ? '#10B981' : '#F59E0B',
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.erectCountText}>
                        {erected} Poles Erected
                      </Text>
                    </View>
                  </View>

                  <View style={styles.recordArrowBox}>
                    <Text style={styles.recordArrow}>›</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* ========================================================= */}
        {/* 7. SYSTEM FOOTER & STORAGE INTEGRITY                       */}
        {/* ========================================================= */}
        <View style={styles.systemFooter}>
          <Text style={styles.footerVersion}>GIS FIELD OPERATING SYSTEM • V1.0.4</Text>
          <Text style={styles.footerSyncInfo}>
            Connected to PostGIS Server • Live Telemetry Active
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// -------------------------------------------------------------
// STYLES: ELEGANT, MODERN, COMPACT & BEAUTIFUL
// -------------------------------------------------------------
const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },

  // 1. TOP HUD HEADER
  topHudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.8)',
  },
  operatorCol: {
    flex: 1,
    paddingRight: 10,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  brandIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  brandText: {
    color: '#0284C7',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  operatorGreeting: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  operatorSub: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },
  telemetryCol: {
    alignItems: 'flex-end',
    gap: 5,
  },
  gpsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  gpsPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  gpsText: {
    color: '#047857',
    fontSize: 9.5,
    fontWeight: '700',
  },
  syncQueueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: 'rgba(2, 132, 199, 0.2)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  syncQueueBadgeActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  syncQueueIcon: {
    fontSize: 9.5,
    marginRight: 4,
  },
  syncQueueText: {
    color: '#0284C7',
    fontSize: 9.5,
    fontWeight: '700',
  },

  // ERROR BANNER
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  errorBannerIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  errorBannerRetryBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  errorBannerRetryText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // 2. DAILY PROGRESS KPI STRIP
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 6,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(226, 232, 240, 0.8)',
    borderWidth: 1.2,
    borderRadius: 12,
    padding: 9,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  kpiIcon: {
    fontSize: 12,
  },
  kpiTrend: {
    color: '#059669',
    fontSize: 8,
    fontWeight: '700',
  },
  kpiValue: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  kpiUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  kpiLabel: {
    color: '#64748B',
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // 3. CHART PANEL
  chartPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(226, 232, 240, 0.8)',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  chartTitleCol: {
    flex: 1,
    paddingRight: 8,
  },
  chartPanelCategory: {
    color: '#0284C7',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  chartPanelTitle: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '800',
    marginTop: 1,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
  },
  segmentBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#0284C7',
    fontWeight: '800',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendSquare: {
    width: 8,
    height: 8,
    borderRadius: 2,
    marginRight: 4,
  },
  legendLine: {
    width: 12,
    height: 2.5,
    borderRadius: 1,
    marginRight: 4,
  },
  legendText: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
  },
  legendBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 'auto',
  },
  legendBadgeText: {
    color: '#059669',
    fontSize: 8.5,
    fontWeight: '700',
  },
  svgContainer: {
    alignItems: 'center',
    marginVertical: 4,
    minHeight: 175,
    justifyContent: 'center',
  },
  chartLoadingSkeleton: {
    height: 175,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartLoadingText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 8,
  },
  chartFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.8)',
  },
  chartFooterMetric: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '500',
  },
  chartFooterHighlight: {
    color: '#0F172A',
    fontWeight: '800',
  },

  // 4. QUICK ACTIONS DOCK
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sectionSub: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 1,
  },
  viewAllText: {
    color: '#0284C7',
    fontSize: 10.5,
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 18,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(226, 232, 240, 0.8)',
    borderWidth: 1.2,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickIcon: {
    fontSize: 16,
  },
  quickTitle: {
    color: '#0F172A',
    fontSize: 10.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  quickSub: {
    color: '#64748B',
    fontSize: 7.5,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },

  // 5 & 6. RECORD CARDS (SURVEY & ERECTION LISTS)
  recordsList: {
    gap: 8,
    marginBottom: 14,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(226, 232, 240, 0.8)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  emptySub: {
    color: '#64748B',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(226, 232, 240, 0.8)',
    borderWidth: 1.2,
    borderRadius: 14,
    padding: 12,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  recordMainCol: {
    flex: 1,
    paddingRight: 8,
  },
  recordBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  voltagePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  voltage33KV: {
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
  },
  voltage11KV: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
  },
  voltage440V: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  voltageText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  drawingNoChip: {
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  drawingNoText: {
    color: '#0F172A',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillSynced: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  statusPillPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  statusPillText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  recordTime: {
    color: '#94A3B8',
    fontSize: 8.5,
    fontWeight: '500',
    marginLeft: 'auto',
  },
  recordPctText: {
    color: '#0284C7',
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 'auto',
  },
  recordLocation: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  recordSubLocation: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '500',
    marginTop: 2,
  },
  recordMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  recordMetricTag: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '600',
  },
  recordMetricDot: {
    color: '#CBD5E1',
    fontSize: 8,
  },
  erectProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  miniBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(226, 232, 240, 0.9)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  erectCountText: {
    color: '#475569',
    fontSize: 8.5,
    fontWeight: '700',
  },
  recordArrowBox: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordArrow: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '700',
  },

  // 7. SYSTEM FOOTER
  systemFooter: {
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.7)',
    marginTop: 6,
  },
  footerVersion: {
    color: '#94A3B8',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  footerSyncInfo: {
    color: '#CBD5E1',
    fontSize: 8,
    fontWeight: '600',
    marginTop: 2,
  },
});
