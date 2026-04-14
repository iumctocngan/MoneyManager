import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useStore } from '@/store/app-store';

export default function AuthLayout() {
  const authToken = useStore((state) => state.authToken);

  if (authToken) {
    return <Redirect href="/tabs" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
