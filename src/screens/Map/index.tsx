import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Linking, TouchableOpacity, Platform } from 'react-native';
import { Colors } from '../../constants/colors';
import { FontSize, FontWeight } from '../../constants/typography';
import { Spacing, Radius } from '../../constants/spacing';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

const MOCK_COLLECTION_POINTS = [
  // Hà Nội
  { id: '1', name: 'Trạm EcoBack Bách Khoa', latitude: 21.00519, longitude: 105.84558, scanCount: 1540, address: 'Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội' },
  { id: '2', name: 'Trạm EcoBack Cầu Giấy', latitude: 21.03623, longitude: 105.79058, scanCount: 920, address: '120 Cầu Giấy, Hà Nội' },
  { id: '3', name: 'Trạm EcoBack Hoàn Kiếm', latitude: 21.02851, longitude: 105.85416, scanCount: 4200, address: 'Phố đi bộ Hồ Gươm, Hà Nội' },
  { id: '4', name: 'Trạm EcoBack Đống Đa', latitude: 21.01807, longitude: 105.82662, scanCount: 750, address: 'Ngõ 119 Hồ Đắc Di, Hà Nội' },
  { id: '5', name: 'Trạm EcoBack Tây Hồ', latitude: 21.05832, longitude: 105.82672, scanCount: 310, address: 'Thung lũng hoa, Tây Hồ, Hà Nội' },
  // TP.HCM
  { id: '11', name: 'Trạm EcoBack Quận 1', latitude: 10.77688, longitude: 106.70080, scanCount: 3205, address: 'Phố đi bộ Nguyễn Huệ, TP.HCM' },
  { id: '12', name: 'Trạm EcoBack Landmark 81', latitude: 10.79463, longitude: 106.72146, scanCount: 5120, address: 'Vinhomes Central Park, Q.Bình Thạnh' },
];

export default function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Từ chối quyền truy cập vị trí');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    })();
  }, []);

  const openNavigation = (lat: number, lng: number) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`
    });
    if (url) Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Điểm Thu Gom</Text>
      </View>
      
      <View style={styles.mapContainer}>
        <MapView 
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: location ? location.coords.latitude : 21.0285,
            longitude: location ? location.coords.longitude : 105.8542,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          showsUserLocation={true}
        >
          {MOCK_COLLECTION_POINTS.map(point => (
            <Marker
              key={point.id}
              coordinate={{ latitude: point.latitude, longitude: point.longitude }}
              pinColor={Colors.primary}
            >
              <Callout tooltip>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>{point.name}</Text>
                  <Text style={styles.calloutAddress}>{point.address}</Text>
                  <Text style={styles.calloutStats}>
                    Đã thu gom: <Text style={styles.highlight}>{point.scanCount}</Text> lần
                  </Text>
                  <TouchableOpacity onPress={() => openNavigation(point.latitude, point.longitude)} style={styles.navigateBtn}>
                    <Text style={styles.navigateText}>📍 Dẫn đường</Text>
                  </TouchableOpacity>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
    zIndex: 1,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: 'bold', color: Colors.textPrimary },
  mapContainer: { flex: 1, borderRadius: Radius.lg, overflow: 'hidden' },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  calloutContainer: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    width: 220,
    elevation: 4,
  },
  calloutTitle: { fontSize: FontSize.md, fontWeight: 'bold', color: Colors.primary, marginBottom: 4 },
  calloutAddress: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 8 },
  calloutStats: { fontSize: FontSize.sm, color: Colors.textPrimary, marginBottom: 12 },
  highlight: { fontWeight: 'bold', color: Colors.success },
  navigateBtn: { backgroundColor: '#E8F5E9', paddingVertical: 6, borderRadius: Radius.sm, alignItems: 'center', borderColor: Colors.success, borderWidth: 1 },
  navigateText: { color: Colors.success, fontWeight: 'bold', fontSize: FontSize.sm },
});
