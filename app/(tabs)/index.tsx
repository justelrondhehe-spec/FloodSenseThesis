import * as Location from 'expo-location';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import MapView, { Marker, Polyline, Circle, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/AppHeader';
import { Colors, Spacing, Radius, Fonts } from '../../constants/theme';
import { alerts as initialAlerts } from '../../constants/data'; // Renamed to initialAlerts
import { useTheme } from '../../constants/ThemeContext';

// --- FIREBASE ---
import { ref, onValue } from 'firebase/database';
import { db } from '../../constants/firebase';

// ---------------------------------------------------------------------------
// Types & Map Layers
// ---------------------------------------------------------------------------
type LayerKey = 'street' | 'satellite' | 'terrain' | 'cycle' | 'transport';

interface MapLayer {
  key: LayerKey;
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  description: string;
  tileUrl: string;
  baseUrl?: string;
  nativeSatellite?: boolean;
}

const MAP_LAYERS: MapLayer[] = [
  { key: 'street', label: 'Street', icon: 'map', description: 'Standard street map', tileUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png' },
  { key: 'satellite', label: 'Satellite', icon: 'globe', description: 'Aerial/satellite imagery', tileUrl: '', nativeSatellite: true },
  { key: 'terrain', label: 'Terrain', icon: 'triangle', description: 'Elevation & contours', tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}' },
  { key: 'cycle', label: 'Cycle', icon: 'wind', description: 'Cycling routes', baseUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', tileUrl: 'https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png' },
  { key: 'transport', label: 'Transport', icon: 'truck', description: 'Transit & transport network', tileUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png' },
];

const FLOOD_LOCATION = { latitude: 14.5965, longitude: 120.9820 };

interface EvacArea {
  name: string;
  coordinate: { latitude: number; longitude: number; };
}

const EVAC_AREAS: EvacArea[] = [
  { name: 'SM City Manila', coordinate: { latitude: 14.589856887783418, longitude: 120.98314042065157 } },
  { name: 'PNU Gymnasium', coordinate: { latitude: 14.58836845294668, longitude: 120.98263528399174 } },
  { name: 'YMCA of Manila', coordinate: { latitude: 14.588845283492326, longitude: 120.98254227148138 } },
  { name: 'Maceda Building', coordinate: { latitude: 14.587614491989854, longitude: 120.9827890805987 } },
];

const INITIAL_REGION = {
  latitude: 14.5995, longitude: 120.9850,
  latitudeDelta: 0.012, longitudeDelta: 0.010,
};

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------
function WaterLevelWidget({ unitSystem, level }: { unitSystem: string; level: number }) {
  const displayLevel = unitSystem === 'imperial' ? (level * 0.0328084).toFixed(2) : (level / 100).toFixed(2);
  const unitLabel = unitSystem === 'imperial' ? 'feet' : 'meters';
  const fillPercentage = Math.min(Math.max((level / 200) * 100, 10), 100); 

  return (
    <View style={styles.waterCard}>
      <Text style={styles.waterLabel}>WATER LEVEL</Text>
      <View style={styles.waterVisual}>
        <LinearGradient colors={['#2EC4B6', '#1A8FA6']} style={[styles.waterFill, { height: `${fillPercentage}%` }]} />
        <Text style={styles.waterValue}>{displayLevel}</Text>
        <Text style={styles.waterUnit}>{unitLabel}</Text>
      </View>
      <TouchableOpacity style={styles.trendBadge}>
        <Feather name="activity" size={12} color={Colors.textWhite} />
        <Text style={styles.trendText}> Live Data</Text>
      </TouchableOpacity>
    </View>
  );
}

function AlertItem({ alert, cardBg, textPrimary, textSecondary }: { alert: any; cardBg: string; textPrimary: string; textSecondary: string; }) {
  const colorMap: any = { warning: Colors.orange, info: Colors.teal, safe: Colors.green, notice: Colors.navyLight };
  const iconMap: any = { warning: 'alert-triangle', info: 'info', safe: 'check-circle', notice: 'info' };
  
  const color = colorMap[alert.type] || Colors.navyLight;
  const icon = iconMap[alert.type] || 'bell';

  return (
    <View style={[styles.alertCard, { borderLeftColor: color, backgroundColor: cardBg }]}>
      <View style={[styles.alertIcon, { backgroundColor: color }]}>
        <Feather name={icon} size={16} color={Colors.textWhite} />
      </View>
      <View style={styles.alertBody}>
        <Text style={[styles.alertTitle, { color }]}>{alert.title}</Text>
        <Text style={[styles.alertMsg, { color: textSecondary }]}>{alert.message}</Text>
        <View style={styles.alertTime}>
          <Feather name="clock" size={10} color={textSecondary} />
          <Text style={[styles.alertTimeText, { color: textSecondary }]}> {alert.time}</Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function HomeScreen() {
  const { darkMode, fontSize, unitSystem } = useTheme();
  const [mapRegion, setMapRegion] = useState(INITIAL_REGION);
  const [activeLayer, setActiveLayer] = useState<LayerKey>('street');
  const [pickerVisible, setPickerVisible] = useState(false);

  // --- ALERTS & NOTIFICATIONS STATE ---
  const [recentAlerts, setRecentAlerts] = useState(initialAlerts);
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const prevStatusRef = useRef<string | null>(null);

  // --- SENSOR & LOCATION STATE ---
  const [liveWaterLevel, setLiveWaterLevel] = useState<number>(0);
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<any>(null);
  const [activeRoute, setActiveRoute] = useState<{coords: any[], distance: number, time: number, name: string} | null>(null);

  // 1. Logic for categorizing the flood risk based on water level
  const getFloodStatus = (level: number) => {
    if (level >= 190) {
      return {
        gradient: [Colors.redLight || '#ff7b72', Colors.red, Colors.redDark || '#8a0000'],
        topBadgeColor: Colors.red, iconName: 'alert-octagon' as const,
        riskText: 'HIGH RISK', warnLabel: 'CRITICAL WARNING', warnDesc: 'Severe flood warning — Evacuate immediately',
        alertType: 'warning'
      };
    } else if (level >= 150) {
      return {
        gradient: [Colors.orangeLight, Colors.orange, Colors.orangeDark],
        topBadgeColor: Colors.warning || Colors.orange, iconName: 'alert-triangle' as const,
        riskText: 'MODERATE RISK', warnLabel: 'FLOOD WARNING', warnDesc: 'Moderate flood risk — Stay alert',
        alertType: 'warning'
      };
    } else if (level >= 100) {
      return {
        gradient: ['#1B4F72', '#0D3B5E', '#0A2640'], 
        topBadgeColor: Colors.teal, iconName: 'info' as const,
        riskText: 'ADVISORY', warnLabel: 'WATER RISING', warnDesc: 'Monitor local channels for updates',
        alertType: 'info'
      };
    } else {
      return {
        gradient: ['#2EC4B6', '#1A8FA6', '#0d8b80'], 
        topBadgeColor: Colors.green, iconName: 'check-circle' as const,
        riskText: 'LOW RISK', warnLabel: 'NORMAL STATUS', warnDesc: 'Water levels are within safe limits',
        alertType: 'safe'
      };
    }
  };

  const currentStatus = getFloodStatus(liveWaterLevel);

  // 2. Listen for Firebase Data Updates
  useEffect(() => {
    const sensorRef = ref(db, 'sensors/sensor_id_01');
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.current_reading !== undefined) {
        setLiveWaterLevel(data.current_reading);
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Status Change Detection & Alert Generation
  useEffect(() => {
    // If this is the very first render, just set the ref and don't pop up
    if (prevStatusRef.current === null) {
      prevStatusRef.current = currentStatus.riskText;
      return;
    }

    // If the status text changed (e.g. went from LOW RISK to ADVISORY)
    if (currentStatus.riskText !== prevStatusRef.current) {
      
      // Show the massive popup to the user
      setShowStatusPopup(true);

      // Create a new alert object
      // Create a new alert object
      const newAlert = {
        id: Date.now().toString(),
        type: currentStatus.alertType as 'warning' | 'info' | 'safe' | 'notice', // <-- Added type casting here
        title: `Status Changed: ${currentStatus.warnLabel}`,
        message: currentStatus.warnDesc,
        time: 'Just now'
      };

      // Push it to the top of our Recent Alerts list
      setRecentAlerts(prev => [newAlert, ...prev]);

      // Update our ref so we don't trigger it again until it changes again
      prevStatusRef.current = currentStatus.riskText;
    }
  }, [currentStatus.riskText]); // Only re-run if the risk text actually changes

  // 4. GPS Setup
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  // 5. Navigation Action
  const handleNavigate = () => {
    if (!userLocation) {
      Alert.alert("Locating...", "Still waiting for your GPS location. Make sure location services are on.");
      return;
    }

    let minDistance = Infinity;
    let nearestArea: EvacArea | null = null;

    EVAC_AREAS.forEach(area => {
      const dist = getDistance(userLocation.latitude, userLocation.longitude, area.coordinate.latitude, area.coordinate.longitude);
      if (dist < minDistance) { minDistance = dist; nearestArea = area; }
    });

    if (nearestArea) {
      const timeInMins = Math.max(1, Math.ceil(minDistance * 12)); 
      setActiveRoute({ coords: [userLocation, nearestArea.coordinate], distance: minDistance, time: timeInMins, name: nearestArea.name });

      if (mapRef.current) {
        mapRef.current.fitToCoordinates([userLocation, nearestArea.coordinate], { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true });
      }
    }
  };

  const currentLayer = MAP_LAYERS.find((layer) => layer.key === activeLayer)!;
  const displayDistance = activeRoute ? (unitSystem === 'imperial' ? (activeRoute.distance * 0.621371).toFixed(2) + ' mi' : (activeRoute.distance < 1 ? Math.round(activeRoute.distance * 1000) + ' m' : activeRoute.distance.toFixed(2) + ' km')) : '--';
  const displayTime = activeRoute ? `Est. ${activeRoute.time} mins walk` : 'Standby';

  const bg = darkMode ? '#0a1628' : Colors.bgLight;
  const cardBg = darkMode ? '#0d1f33' : Colors.bgWhite;
  const textPrimary = darkMode ? '#ffffff' : Colors.textDark;
  const textSecondary = darkMode ? '#aaaaaa' : Colors.textGray;
  const borderColor = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const fs = fontSize === 'small' ? 0.85 : fontSize === 'large' ? 1.2 : 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={[]}>
      <AppHeader />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={[styles.greetRow, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
          <View>
            <Text style={[styles.greetSub, { color: textSecondary, fontSize: Fonts.sizes.xs * fs }]}>GOOD DAY</Text>
            <Text style={[styles.greetTitle, { color: textPrimary, fontSize: Fonts.sizes.lg * fs }]}>Stay safe, Resident 👋</Text>
          </View>
          <View style={[styles.warnBadge, { borderColor: currentStatus.topBadgeColor, backgroundColor: `${currentStatus.topBadgeColor}15` }]}>
            <Feather name={currentStatus.iconName} size={13} color={currentStatus.topBadgeColor} />
            <Text style={[styles.warnText, { color: currentStatus.topBadgeColor, fontSize: Fonts.sizes.xs * fs }]}> {currentStatus.riskText}</Text>
          </View>
        </View>

        <LinearGradient colors={currentStatus.gradient as [string, string, string]} style={styles.floodCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.floodCardHeader}>
            <View style={styles.floodAlertIcon}>
              <Feather name={currentStatus.iconName} size={20} color={currentStatus.gradient[1]} />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={[styles.floodWarningLabel, { fontSize: Fonts.sizes.xs * fs }]}>{currentStatus.warnLabel}</Text>
              <Text style={[styles.floodWarningDesc, { fontSize: Fonts.sizes.sm * fs }]}>{currentStatus.warnDesc}</Text>
            </View>
            <View style={styles.riskBadge}>
              <Text style={[styles.riskText, { fontSize: 10 * fs }]}>{currentStatus.riskText}</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <WaterLevelWidget unitSystem={unitSystem} level={liveWaterLevel} />
          </View>
        </LinearGradient>

        <View style={[styles.mapSection, { backgroundColor: cardBg }]}>
          <View style={styles.mapSectionHeader}>
            <Text style={[styles.sectionTitle, { color: textPrimary, fontSize: Fonts.sizes.md * fs }]}>Evacuation Map</Text>
            <TouchableOpacity style={[styles.layerBtn, { backgroundColor: cardBg, borderColor }]} onPress={() => setPickerVisible(true)} activeOpacity={0.8}>
              <Feather name={currentLayer.icon} size={13} color={Colors.teal} />
              <Text style={[styles.layerBtnText, { color: textPrimary, fontSize: Fonts.sizes.xs * fs }]}>{currentLayer.label}</Text>
              <Feather name="chevron-down" size={12} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.mockMap}>
            <MapView ref={mapRef} style={StyleSheet.absoluteFillObject} provider={PROVIDER_DEFAULT} initialRegion={mapRegion} onRegionChangeComplete={(region) => setMapRegion(region)} mapType={currentLayer.nativeSatellite ? 'satellite' : 'standard'} showsUserLocation showsMyLocationButton showsCompass rotateEnabled scrollEnabled zoomEnabled zoomControlEnabled zoomTapEnabled pitchEnabled={false}>
              {!currentLayer.nativeSatellite && currentLayer.baseUrl && <UrlTile urlTemplate={currentLayer.baseUrl} maximumZ={19} flipY={false} tileSize={256} zIndex={0} />}
              {!currentLayer.nativeSatellite && currentLayer.tileUrl !== '' && <UrlTile urlTemplate={currentLayer.tileUrl} maximumZ={19} flipY={false} tileSize={256} zIndex={currentLayer.baseUrl ? 1 : 0} opacity={currentLayer.baseUrl ? 0.8 : 1} />}
              <Circle center={FLOOD_LOCATION} radius={130} strokeColor="rgba(231,76,60,0.8)" fillColor="rgba(231,76,60,0.18)" strokeWidth={2} />
              {activeRoute && <Polyline coordinates={activeRoute.coords} strokeColor={Colors.teal} strokeWidth={4} lineDashPattern={[10, 6]} />}
              {EVAC_AREAS.map((area) => (
                <Marker key={area.name} coordinate={area.coordinate} anchor={{ x: 0.5, y: 1 }}>
                  <View style={styles.markerWrap}><View style={styles.markerOrange}><Feather name="home" size={10} color="#fff" /></View></View>
                </Marker>
              ))}
              {userLocation && (
                <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
                  <View style={styles.markerWrap}><View style={styles.markerTeal}><Feather name="map-pin" size={16} color="#fff" /></View><View style={[styles.markerLabel, { backgroundColor: '#0d8b80' }]}><Text style={styles.markerLabelText}>YOU</Text></View></View>
                </Marker>
              )}
              <Marker coordinate={FLOOD_LOCATION} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
                <View style={styles.markerWrap}><View style={styles.markerRed}><Feather name="alert-triangle" size={13} color="#fff" /></View><View style={[styles.markerLabel, { backgroundColor: Colors.redDark }]}><Text style={styles.markerLabelText}>FLOOD ZONE</Text></View></View>
              </Marker>
            </MapView>
            <View style={styles.distanceCard}>
              <Text style={styles.distanceLabel}>DISTANCE</Text>
              <Text style={styles.distanceValue}>{displayDistance}</Text>
              <Text style={styles.distanceSub}>{displayTime}</Text>
            </View>
            <View style={styles.locationLabel}>
              <Text style={styles.locationLabelText}>{activeRoute ? 'To ' + activeRoute.name : 'Brgy 659 - Manila'}</Text>
            </View>
          </View>

          <LinearGradient colors={[Colors.navyMid, Colors.teal]} style={styles.navigateBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <TouchableOpacity style={styles.navigateBtnInner} onPress={handleNavigate}>
              <Feather name="navigation" size={18} color={Colors.textWhite} />
              <Text style={[styles.navigateBtnText, { fontSize: Fonts.sizes.base * fs }]}>Navigate to Nearest Evacuation Area</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Recent Alerts Section using dynamic state! */}
        <View style={styles.alertsSection}>
          <View style={styles.alertsSectionHeader}>
            <Text style={[styles.sectionTitle, { color: textPrimary, fontSize: Fonts.sizes.md * fs }]}>Recent Alerts</Text>
            <View style={styles.alertBadgeBtn}>
              <Feather name="bell" size={16} color={Colors.textWhite} />
              <View style={styles.alertBadge}><Text style={styles.alertBadgeText}>{recentAlerts.length}</Text></View>
            </View>
          </View>
          {recentAlerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} cardBg={cardBg} textPrimary={textPrimary} textSecondary={textSecondary} />
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Layer Picker Modal */}
      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={[styles.layerPicker, { backgroundColor: cardBg }]}>
            <View style={styles.pickerHandle} />
            <Text style={[styles.pickerTitle, { color: textPrimary }]}>Map Style</Text>
            {MAP_LAYERS.map((layer, i) => {
              const isActive = activeLayer === layer.key;
              return (
                <TouchableOpacity key={layer.key} style={[styles.pickerItem, { borderBottomColor: borderColor }, i === MAP_LAYERS.length - 1 && { borderBottomWidth: 0 }]} onPress={() => { setActiveLayer(layer.key); setPickerVisible(false); }} activeOpacity={0.75}>
                  <View style={[styles.pickerIconWrap, { backgroundColor: isActive ? Colors.teal : 'rgba(46,196,182,0.12)' }]}><Feather name={layer.icon} size={16} color={isActive ? '#fff' : Colors.teal} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickerLabel, { color: isActive ? Colors.teal : textPrimary }]}>{layer.label}</Text>
                    <Text style={[styles.pickerDesc, { color: textSecondary }]}>{layer.description}</Text>
                  </View>
                  {isActive && <View style={styles.pickerCheck}><Feather name="check" size={13} color={Colors.teal} /></View>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* --- NEW STATUS NOTIFICATION POPUP --- */}
      <Modal visible={showStatusPopup} transparent animationType="fade" onRequestClose={() => setShowStatusPopup(false)}>
        <View style={styles.popupBackdrop}>
          <LinearGradient
            colors={currentStatus.gradient as [string, string, string]}
            style={styles.popupCard}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <View style={styles.popupIconWrap}>
              <Feather name={currentStatus.iconName} size={42} color={currentStatus.gradient[1]} />
            </View>
            <Text style={styles.popupRiskText}>{currentStatus.riskText}</Text>
            <Text style={styles.popupTitle}>{currentStatus.warnLabel}</Text>
            <Text style={styles.popupDesc}>{currentStatus.warnDesc}</Text>

            <TouchableOpacity style={styles.popupBtn} onPress={() => setShowStatusPopup(false)} activeOpacity={0.8}>
              <Text style={styles.popupBtnText}>Acknowledge</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  greetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  greetSub: { fontWeight: '600', letterSpacing: 1 },
  greetTitle: { fontWeight: '800', marginTop: 2 },
  warnBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.warning, backgroundColor: 'rgba(243,156,18,0.08)' },
  warnText: { fontWeight: '700', color: Colors.warning, letterSpacing: 0.5 },
  floodCard: { margin: Spacing.base, borderRadius: Radius.xl, padding: Spacing.base, gap: Spacing.md },
  floodCardHeader: { flexDirection: 'row', alignItems: 'center' },
  floodAlertIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  floodWarningLabel: { color: 'rgba(255,255,255,0.8)', fontWeight: '700', letterSpacing: 1 },
  floodWarningDesc: { color: Colors.textWhite, fontWeight: '600' },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  riskText: { color: Colors.textWhite, fontWeight: '800', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statsCol: { flex: 1, gap: Spacing.sm },
  waterCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.lg, padding: Spacing.sm, alignItems: 'center', overflow: 'hidden' },
  waterLabel: { fontSize: 9, color: Colors.textWhite, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  waterVisual: { width: '100%', flex: 1, minHeight: 100, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  waterFill: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', opacity: 0.9 },
  waterValue: { fontSize: 34, fontWeight: '900', color: Colors.textWhite, zIndex: 1, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  waterUnit: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600', zIndex: 1, marginBottom: 6 },
  trendBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  trendText: { fontSize: 11, color: Colors.textWhite, fontWeight: '700' },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: Radius.md, padding: 10 },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  statLabel: { fontSize: 9, color: Colors.textLight, fontWeight: '700', letterSpacing: 0.8 },
  statValue: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.textWhite },
  statSub: { fontSize: 10, color: Colors.textLight },
  liveFooter: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 8, gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.tealLight },
  liveText: { flex: 1, color: Colors.textWhite, fontWeight: '600' },
  liveTime: { color: Colors.textLight, fontWeight: '600' },
  mapSection: { marginHorizontal: Spacing.base, borderRadius: Radius.xl, padding: Spacing.base, marginBottom: Spacing.base },
  mapSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontWeight: '800' },
  layerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 6 },
  layerBtnText: { fontWeight: '600' },
  mockMap: { height: 200, borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.md, position: 'relative' },
  markerWrap: { alignItems: 'center' },
  markerTeal: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.teal, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.6)' },
  markerRed: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.red, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  markerGreen: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  markerOrange: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#f39c12', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', },
  markerLabel: { marginTop: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  markerLabelText: { fontSize: 8, color: '#fff', fontWeight: '800', letterSpacing: 0.5 },
  distanceCard: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(13,59,94,0.92)', borderRadius: Radius.md, padding: 10, borderWidth: 1, borderColor: 'rgba(46,196,182,0.3)' },
  distanceLabel: { fontSize: 8, color: Colors.textLight, fontWeight: '700', letterSpacing: 1 },
  distanceValue: { fontSize: Fonts.sizes.xl, fontWeight: '900', color: Colors.teal },
  distanceSub: { fontSize: 9, color: Colors.textLight, fontWeight: '600' },
  locationLabel: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(13,59,94,0.85)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  locationLabelText: { fontSize: 10, color: Colors.textWhite, fontWeight: '600' },
  navigateBtn: { borderRadius: Radius.full, overflow: 'hidden' },
  navigateBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  navigateBtnText: { fontWeight: '800', color: Colors.textWhite, letterSpacing: 0.3 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  layerPicker: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.base, paddingBottom: 36 },
  pickerHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(150,150,150,0.4)', alignSelf: 'center', marginBottom: 14 },
  pickerTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', marginBottom: Spacing.md },
  pickerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1 },
  pickerIconWrap: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  pickerLabel: { fontWeight: '700', fontSize: Fonts.sizes.base },
  pickerDesc: { fontSize: Fonts.sizes.xs, marginTop: 1 },
  pickerCheck: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(46,196,182,0.15)', alignItems: 'center', justifyContent: 'center' },
  alertsSection: { paddingHorizontal: Spacing.base },
  alertsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  alertBadgeBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.navyMid, alignItems: 'center', justifyContent: 'center' },
  alertBadge: { position: 'absolute', top: 4, right: 4, minWidth: 14, height: 14, borderRadius: 7, backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  alertBadgeText: { fontSize: 8, color: Colors.textWhite, fontWeight: '800' },
  alertCard: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderLeftWidth: 4, gap: Spacing.sm, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  alertIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  alertBody: { flex: 1 },
  alertTitle: { fontSize: Fonts.sizes.sm, fontWeight: '800', marginBottom: 2 },
  alertMsg: { fontSize: Fonts.sizes.sm, marginBottom: 4 },
  alertTime: { flexDirection: 'row', alignItems: 'center' },
  alertTimeText: { fontSize: 10 },
  
  // NEW POPUP STYLES
  popupBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  popupCard: { width: '100%', borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  popupIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  popupRiskText: { color: 'rgba(255,255,255,0.8)', fontWeight: '800', letterSpacing: 2, fontSize: Fonts.sizes.sm, marginBottom: 4 },
  popupTitle: { color: Colors.textWhite, fontWeight: '900', fontSize: Fonts.sizes.xxl, textAlign: 'center', marginBottom: Spacing.sm },
  popupDesc: { color: Colors.textWhite, fontSize: Fonts.sizes.base, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 22 },
  popupBtn: { width: '100%', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 16, borderRadius: Radius.full, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  popupBtnText: { color: Colors.textWhite, fontWeight: '800', fontSize: Fonts.sizes.md, letterSpacing: 0.5 },
});