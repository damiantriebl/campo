import { Stack } from 'expo-router';
import React from 'react';

export default function CompanyLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Empresas' }} />
    </Stack>
  );
}


