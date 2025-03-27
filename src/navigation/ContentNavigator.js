// src/navigation/ContentNavigator.js
import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';

// Importación de pantallas
import TeachingProgramScreen from '../screens/grados/TeachingProgramScreen';
import DocumentsScreen from '../screens/grados/DocumentsScreen';
import HierarchyScreen from '../screens/grados/HierarchyScreen';

const Tab = createMaterialTopTabNavigator();

export default function ContentNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#fff',
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#666',
        tabBarIndicatorStyle: {
          backgroundColor: '#007AFF',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen 
        name="Programas" 
        component={TeachingProgramScreen} 
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar-outline" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Documentos" 
        component={DocumentsScreen} 
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="document-text-outline" size={20} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Jerarquía" 
        component={HierarchyScreen} 
        options={{
          tabBarIcon: ({ color }) => (
            <Ionicons name="git-network-outline" size={20} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}