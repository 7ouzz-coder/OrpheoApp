// src/components/NotificationBadge.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NotificationBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Cargar contador de notificaciones al montar el componente
    loadNotificationCount();
    
    // Configurar intervalo para actualizar el contador cada minuto
    const intervalId = setInterval(loadNotificationCount, 60000);
    
    // Limpiar intervalo al desmontar
    return () => clearInterval(intervalId);
  }, []);

  const loadNotificationCount = async () => {
    try {
      // En la versión compatible con Expo Go, usamos AsyncStorage en lugar de llamadas a la API
      const storedCount = await AsyncStorage.getItem('notificationCount');
      if (storedCount) {
        setCount(parseInt(storedCount, 10));
      } else {
        // Si es la primera vez, usamos un valor aleatorio entre 0 y 5 como ejemplo
        // En una implementación real, esto vendría del backend
        const randomCount = Math.floor(Math.random() * 5);
        await AsyncStorage.setItem('notificationCount', randomCount.toString());
        setCount(randomCount);
      }
    } catch (error) {
      console.error('Error cargando contador de notificaciones:', error);
    }
  };

  // No mostrar nada si no hay notificaciones
  if (count === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff4d4f',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  text: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  }
});