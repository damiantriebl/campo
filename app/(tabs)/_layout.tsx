import { Tabs, usePathname } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { FontAwesome } from '@expo/vector-icons';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const isClientDetail = pathname.startsWith('/clientes/');
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'configuracion',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />     
      <Tabs.Screen
        name="clientes/index"
        options={{
          tabBarIcon: ({ color }) => (
            <FontAwesome name="users" size={24} color={color} />
          ),
          tabBarLabel: 'Clientes',
          headerTitle: 'Clientes',
          headerShown: true, // Oculta el header para clientes
        }}
      />
      {/* Ruta dinámica para Detalles de Cliente */}
      <Tabs.Screen
        name="clientes/[id]"
        options={({ route }) => {
          const isDisabled = !route.params?.nombre || route.params?.nombre === 'Ninguno cargado';

          return {
            title: route.params?.nombre || 'Ninguno cargado',
            headerTitle: route.params?.nombre || 'Sin nombre',
            headerShown: true,
            tabBarButton: (props) => (
              <View
                style={{
                  flex: 1,
                  opacity: isDisabled ? 0.5 : 1, // Cambia la opacidad si está deshabilitado
                  pointerEvents: isDisabled ? 'none' : 'auto', // Desactiva los clics si está deshabilitado
                }}
              >
                <HapticTab {...props} />
              </View>
            ),
            tabBarIcon: ({ color }) => (
              <FontAwesome
                name="user"
                size={24}
                color={isDisabled ? 'gray' : color} // Icono en gris si está deshabilitado
              />
            ),
          };
        }}
      />
    </Tabs>
  );
}
