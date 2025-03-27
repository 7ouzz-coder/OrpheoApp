import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { View, Text, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Importaciones de pantallas
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import MainNavigator from './src/navigation/MainNavigator';

// Importar utilidades para verificar la base de datos
import { checkDatabaseStructure } from './src/utils/CheckDatabaseStructure';
import { testSupabaseConnection } from './src/utils/testdatabase';

// Mantener visible la pantalla de splash hasta que se inicialice la app
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [initialRouteName, setInitialRouteName] = useState('Login');
  const [error, setError] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);

  // Inicializar la aplicación
  useEffect(() => {
    async function prepareApp() {
      try {
        // Verificar la conexión a PostgreSQL en lugar de Supabase
        const connectionResult = await testDatabaseConnection();
        setDbStatus({ connection: connectionResult });
    
        if (!connectionResult.success) {
          console.error('Error de conexión a PostgreSQL:', connectionResult.error);
        }
      } catch (error) {
        console.error('Error preparando app:', error);
        setError(error.message);
      } finally {
        setAppIsReady(true);
      }
    }

  // Ocultar la pantalla de splash cuando la app esté lista
  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 16, color: 'red', textAlign: 'center', marginBottom: 20 }}>
          Error al inicializar la app: {error}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator initialRouteName={initialRouteName}>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen} 
            options={{ 
              title: 'Registro',
              headerStyle: {
                backgroundColor: '#f5f5f5',
              },
              headerTintColor: '#007AFF',
            }}
          />
          <Stack.Screen 
            name="Main" 
            component={MainNavigator} 
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}