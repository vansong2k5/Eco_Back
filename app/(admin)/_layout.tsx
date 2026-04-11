import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/colors';

export default function AdminTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: Colors.textTertiary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1C2E20', // Màu tối cho Admin
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Thống kê',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? 'chart-bar' : 'chart-bar-stacked'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="qr-gen"
        options={{
          title: 'Tạo mã QR',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? 'qrcode-plus' : 'qrcode'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="qr-list"
        options={{
          title: 'Kho QR',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? 'text-box-search' : 'text-box-search-outline'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Lịch sử',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? 'clipboard-text' : 'clipboard-text-outline'} size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
