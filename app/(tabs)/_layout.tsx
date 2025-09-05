import { Tabs, usePathname } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { FontAwesome, Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#25B4BD', // Primary accent color from design
        tabBarInactiveTintColor: '#666666', // Secondary text color
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 90 : 70,
          ...Platform.select({
            ios: {
              position: 'absolute',
            },
            default: {},
          }),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
      }}>
      
      {/* Config Tab - Products and Company Management */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Configuración',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "settings" : "settings-outline"} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      
      {/* Clients Tab - Client Management */}
      <Tabs.Screen
        name="clientes/index"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome 
              name={focused ? "users" : "users"} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />
      
      {/* History Tab - Transaction History */}
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historial',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "time" : "time-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      
      {/* Hide client detail routes from tabs */}
      <Tabs.Screen
        name="clientes/[id]"
        options={{
          href: null, // This hides it from the tab bar
        }}
      />
      
      <Tabs.Screen
        name="clientes/[id]_new"
        options={{
          href: null, // This hides it from the tab bar
        }}
      />
    </Tabs>
  );
}
