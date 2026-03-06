import { View, Text } from 'react-native'
import React, { useEffect } from 'react'
import { Slot, useSegments, router, useRouter } from "expo-router";
import "../global.css";
import { AuthProvider, useAuth } from '../context/authcontext';
import { useRoute } from '@react-navigation/native';

const MainLayout = () => {
  const { isAuthenticated } = useAuth();
  const segment = useSegments();
  const router=useRouter();


  useEffect(() => {
    // check if the user is authenticated or not
    if (typeof isAuthenticated === 'undefined') return;

    const inApp = segment[0] === '(app)';

    if (isAuthenticated && !inApp) {
     
      router.replace('/home');
    } else if (isAuthenticated === false) {
    
      router.replace('/signIn');
    }
  }, [isAuthenticated]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  )
}