import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Importamos la nueva pantalla unificada en vez de las pantallas individuales
import MiembrosScreen from '../screens/grados/MiembrosScreen';
import MemberDetailScreen from '../screens/grados/MemberDetailScreen';

const Stack = createNativeStackNavigator();

export default function GradesNavigator() {
  const userGrado = global.userGrado || 'aprendiz';
  const isAdmin = global.userRole === 'admin';
  const isOficialidad = global.userCargo && global.userCargo.trim() !== '';

  const showInfoAlert = () => {
    Alert.alert(
      'Acceso a Información',
      'Los miembros pueden ver información básica de todos los miembros, pero solo información detallada de miembros de su grado o inferior. Administración y Oficialidad pueden ver toda la información.',
      [{ text: 'Entendido' }]
    );
  };

  return (
    <Stack.Navigator
      initialRouteName="Miembros"
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#007AFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerRight: () => (
          <TouchableOpacity 
            style={styles.infoButton}
            onPress={showInfoAlert}
          >
            <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        ),
      })}
    >
      <Stack.Screen 
        name="Miembros" 
        component={MiembrosScreen}
        options={{ title: 'Miembros' }} 
      />

      <Stack.Screen 
        name="MemberDetail" 
        component={MemberDetailScreen}
        options={{ 
          title: 'Detalles del Miembro',
          headerBackTitle: 'Atrás' 
        }} 
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  infoButton: {
    padding: 10,
  },
});