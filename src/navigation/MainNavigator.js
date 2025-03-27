import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Pantallas
import HomeScreen from '../screens/grados/HomeScreen';
import ProfileScreen from '../screens/grados/ProfileScreen';
import MemberDetailScreen from '../screens/grados/MemberDetailScreen';
import DocumentsScreen from '../screens/grados/DocumentsScreen';
import TeachingProgramScreen from '../screens/grados/TeachingProgramScreen';
import HierarchyScreen from '../screens/grados/HierarchyScreen';
import AdminScreen from '../screens/admin/AdminScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import NotificationsScreen from '../screens/NotificationScreen';
import ProgramDetailScreen from '../screens/grados/ProgramDetailScreen';

// Pantallas de asistencia
import RegistroAsistenciaScreen from '../screens/asistencia/RegistroAsistenciaScreen';
import ReporteAsistenciaScreen from '../screens/asistencia/ReporteAsistenciaScreen';

// Navegadores
import GradesNavigator from './GradesNavigator';
import ContentNavigator from './ContentNavigator';

// Componentes
import NotificationBadge from '../components/NotificationBadge';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Navegador para la sección de Inicio
const HomeStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="HomeTab" component={HomeScreen} />
    <Stack.Screen name="MemberDetail" component={MemberDetailScreen} />
    <Stack.Screen name="Documents" component={DocumentsScreen} />
    <Stack.Screen name="TeachingProgram" component={TeachingProgramScreen} />
    <Stack.Screen name="Hierarchy" component={HierarchyScreen} />
    <Stack.Screen name="ProgramDetail" component={ProgramDetailScreen} />
  </Stack.Navigator>
);

// Navegador para la sección de Asistencia
const AsistenciaStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="RegistroAsistencia" component={RegistroAsistenciaScreen} />
    <Stack.Screen name="ReporteAsistencia" component={ReporteAsistenciaScreen} />
  </Stack.Navigator>
);

// Navegador para la sección de Admin
const AdminStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="AdminHome" component={AdminScreen} />
    <Stack.Screen name="UserManagement" component={UserManagementScreen} />
  </Stack.Navigator>
);

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Grades') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Content') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Admin') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else if (route.name === 'Notificaciones') {
            iconName = focused ? 'notifications' : 'notifications-outline';
            return (
              <View>
                <Ionicons name={iconName} size={size} color={color} />
                <NotificationBadge />
              </View>
            );
          } else if (route.name === 'Asistencia') {
            iconName = focused ? 'calendar-number' : 'calendar-number-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ title: 'Inicio' }} />
      <Tab.Screen name="Grades" component={GradesNavigator} options={{ title: 'Miembros' }} />
      <Tab.Screen name="Content" component={ContentNavigator} options={{ title: 'Contenido' }} />
      
      {/* Tab de Asistencia solo para maestros */}
      {global.userGrado === 'maestro' && (
        <Tab.Screen name="Asistencia" component={AsistenciaStack} />
      )}
      
      <Tab.Screen name="Notificaciones" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
      
      {/* Tab de Admin solo para administradores */}
      {(global.userRole === 'admin' || global.userRole === 'superadmin') && (
        <Tab.Screen name="Admin" component={AdminStack} options={{ title: 'Admin' }} />
      )}
    </Tab.Navigator>
  );
}