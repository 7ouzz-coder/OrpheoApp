// src/screens/NotificationsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '../services/notificationService';

export default function NotificationsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationService.obtenerNotificacionesNoLeidas(global.userId);
      setNotifications(data);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
      setError('No se pudieron cargar las notificaciones. Intente nuevamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (notification) => {
    try {
      // Marcar notificación como leída
      await notificationService.marcarComoLeida(notification.id);
      
      // Eliminar de la lista
      setNotifications(prevNotifications => 
        prevNotifications.filter(n => n.id !== notification.id)
      );
      
      // Navegar a la pantalla apropiada según el tipo de notificación
      if (notification.notificacion.relacionado_tipo === 'programa_docente' && notification.notificacion.relacionado_id) {
        // Navegar a detalle de programa
        navigation.navigate('ProgramDetail', { programId: notification.notificacion.relacionado_id });
      } else if (notification.notificacion.tipo === 'administrativo') {
        // Navegar a pantalla administrativa
        navigation.navigate('Admin');
      } else {
        // Por defecto, solo mostrar el mensaje
        Alert.alert('Notificación', notification.notificacion.mensaje);
      }
    } catch (error) {
      console.error('Error procesando notificación:', error);
      Alert.alert('Error', 'No se pudo procesar la notificación.');
    }
  };

  const getNotificationIcon = (tipo) => {
    switch (tipo) {
      case 'programa':
        return 'calendar';
      case 'administrativo':
        return 'briefcase';
      case 'mensaje':
        return 'mail';
      case 'alerta':
        return 'warning';
      default:
        return 'notifications';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Si es hoy, mostrar "Hoy, HH:MM"
    if (date.toDateString() === today.toDateString()) {
      return `Hoy, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // Si es ayer, mostrar "Ayer, HH:MM"
    if (date.toDateString() === yesterday.toDateString()) {
      return `Ayer, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // En otro caso, mostrar la fecha completa
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.notificationItem}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={[
        styles.notificationIcon, 
        { backgroundColor: getNotificationColor(item.notificacion.tipo) }
      ]}>
        <Ionicons 
          name={getNotificationIcon(item.notificacion.tipo)} 
          size={20} 
          color="#fff" 
        />
      </View>
      
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>
          {item.notificacion.titulo}
        </Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.notificacion.mensaje}
        </Text>
        <Text style={styles.notificationTime}>
          {formatDate(item.notificacion.created_at)}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.readButton}
        onPress={() => handleNotificationPress(item)}
      >
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const getNotificationColor = (tipo) => {
    switch (tipo) {
      case 'programa':
        return '#4CAF50';
      case 'administrativo':
        return '#2196F3';
      case 'mensaje':
        return '#9C27B0';
      case 'alerta':
        return '#FF9800';
      default:
        return '#607D8B';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notificaciones</Text>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadNotifications}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No tiene notificaciones pendientes</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007AFF']}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff4d4f',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  listContainer: {
    padding: 15,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  readButton: {
    marginLeft: 10,
    padding: 5,
  }
});