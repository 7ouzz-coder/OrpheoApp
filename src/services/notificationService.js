// src/services/notificationService.js
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/database';

// Versión condicional de expo-notifications
let Notifications;
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
  } catch (error) {
    console.log('Notifications module not available');
  }
}

// Datos de notificaciones de ejemplo para modo offline/demo
const DEMO_NOTIFICATIONS = [
  {
    id: 'demo-1',
    notificacion: {
      id: 'demo-1',
      titulo: 'Nuevo programa docente',
      mensaje: 'Se ha publicado un nuevo programa para aprendices',
      tipo: 'programa',
      relacionado_tipo: 'programa_docente',
      relacionado_id: '123',
      created_at: new Date().toISOString()
    }
  },
  {
    id: 'demo-2',
    notificacion: {
      id: 'demo-2',
      titulo: 'Registro de asistencia',
      mensaje: 'Recuerde registrar la asistencia de la reunión de hoy',
      tipo: 'administrativo',
      created_at: new Date(Date.now() - 86400000).toISOString() // Ayer
    }
  },
  {
    id: 'demo-3',
    notificacion: {
      id: 'demo-3',
      titulo: 'Recordatorio',
      mensaje: 'La próxima semana hay una reunión importante',
      tipo: 'mensaje',
      created_at: new Date(Date.now() - 172800000).toISOString() // Hace 2 días
    }
  }
];

// Función para validar si un ID es un UUID válido
const isValidUUID = (id) => {
  if (!id || typeof id !== 'string') return false;
  
  // Formato básico UUID: 8-4-4-4-12 caracteres hexadecimales
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export const notificationService = {
  // Registrar token de dispositivo para un usuario
  async registerForPushNotifications(userId) {
    if (!userId) {
      console.error('Se requiere userId para registrar notificaciones');
      return { success: false, reason: 'missing_userid' };
    }

    // Para IDs de desarrollo o inválidos, simplemente usamos el modo simulado
    if (!isValidUUID(userId) || userId === 'dev-user-id') {
      console.log(`ID no válido para BD (${userId}), usando modo simulado`);
      await AsyncStorage.setItem('demoNotificationsEnabled', 'true');
      await AsyncStorage.setItem('notificationCount', '3');
      return { success: true, demo: true };
    }

    // Si no estamos en modo nativo o no tenemos el módulo, guardamos demo data
    if (Platform.OS === 'web' || !Notifications) {
      await AsyncStorage.setItem('demoNotificationsEnabled', 'true');
      await AsyncStorage.setItem('notificationCount', '3');
      return { success: true, demo: true };
    }

    // Verificar que estamos en un dispositivo físico
    try {
      const { isDevice } = await Notifications.getDeviceRoleAsync();
      if (!isDevice) {
        console.log('Las notificaciones push requieren un dispositivo físico');
        return { success: false, reason: 'not_device' };
      }
    } catch (error) {
      console.log('Error verificando dispositivo:', error);
    }

    try {
      // Solicitar permisos
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Se necesitan permisos para enviar notificaciones');
        return { success: false, reason: 'permission_denied' };
      }

      // Obtener token expo (intentar, pero no fallar si no es posible)
      try {
        const expoPushTokenObj = await Notifications.getExpoPushTokenAsync({
          // projectId se omite para compatibilidad con Expo Go
        });
        
        const token = expoPushTokenObj.data;
        console.log('Token de notificación obtenido:', token);

        // Guardar token en base de datos (si es posible)
        try {
          const { error } = await supabase
            .from('device_tokens')
            .upsert([
              { 
                usuario_id: userId, 
                token: token, 
                platform: Platform.OS 
              }
            ], { onConflict: 'usuario_id, token' });
          
          if (error) throw error;
        } catch (dbError) {
          console.log('Error guardando token en BD:', dbError);
          // No interrumpimos el flujo por error en la BD
        }
      } catch (tokenError) {
        console.log('Error obteniendo token de notificaciones:', tokenError);
        // No es crítico, continuamos
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error en registro de notificaciones:', error);
      return { success: false, error };
    }
  },

  // Programar notificación local (funciona en Expo Go)
  async scheduleLocalNotification(title, body, data = {}) {
    if (Platform.OS === 'web' || !Notifications) {
      console.log('Notificación local simulada:', { title, body, data });
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: { seconds: 2 },
      });
      return true;
    } catch (error) {
      console.error('Error programando notificación local:', error);
      return false;
    }
  },
  
  // Obtener notificaciones no leídas para un usuario
  async obtenerNotificacionesNoLeidas(userId) {
    try {
      // Si no hay userId o es inválido, devolver datos de demo
      if (!userId || !isValidUUID(userId) || userId === 'dev-user-id') {
        console.log(`ID no válido para BD (${userId}), usando notificaciones de demo`);
        return DEMO_NOTIFICATIONS;
      }
      
      // En modo Web o sin módulo de notificaciones, devolvemos datos de demostración
      if (Platform.OS === 'web' || !Notifications) {
        return DEMO_NOTIFICATIONS;
      }
      
      // En modo nativo, intentamos obtener de la BD
      const { data, error } = await supabase
        .from('notificacion_destinatarios')
        .select(`
          id,
          leido,
          notificacion:notificacion_id (
            id, 
            titulo, 
            mensaje, 
            tipo,
            relacionado_id,
            relacionado_tipo,
            created_at
          )
        `)
        .eq('usuario_id', userId)
        .eq('leido', false)
        .order('notificacion(created_at)', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo notificaciones:', error);
      
      // Si falla, devolvemos datos de demostración
      return DEMO_NOTIFICATIONS;
    }
  },
  
  // Marcar notificación como leída
  async marcarComoLeida(notificacionId) {
    try {
      // Para IDs de demo o inválidos, simulamos el proceso
      if (!notificacionId || typeof notificacionId !== 'string' || 
          notificacionId.startsWith('demo-') || !isValidUUID(notificacionId)) {
        
        console.log(`ID no válido para BD (${notificacionId}), simulando marcar como leída`);
        
        // Actualizar contador en AsyncStorage
        const count = await AsyncStorage.getItem('notificationCount');
        if (count) {
          const newCount = Math.max(0, parseInt(count, 10) - 1);
          await AsyncStorage.setItem('notificationCount', newCount.toString());
        }
        
        return { success: true, demo: true };
      }
      
      // En modo Web o sin módulo de notificaciones
      if (Platform.OS === 'web' || !Notifications) {
        // Actualizar contador en AsyncStorage
        const count = await AsyncStorage.getItem('notificationCount');
        if (count) {
          const newCount = Math.max(0, parseInt(count, 10) - 1);
          await AsyncStorage.setItem('notificationCount', newCount.toString());
        }
        return { success: true, demo: true };
      }
      
      // En modo nativo con ID válido
      const { data, error } = await supabase
        .from('notificacion_destinatarios')
        .update({ 
          leido: true,
          leido_at: new Date().toISOString()
        })
        .eq('id', notificacionId)
        .select();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error marcando notificación como leída:', error);
      // Evitamos que el error se propague a la UI
      Alert.alert("Información", "No se pudo actualizar el estado de la notificación");
      return { success: false, error: error.message };
    }
  },
  
  // Enviar notificación a grados específicos (modo simulación)
  async sendNotificationToGrado(titulo, mensaje, grado, data = {}) {
    // En un entorno de producción, esto debería hacerse desde un servidor
    
    // Simulamos el envío notificando solo localmente
    if (Notifications) {
      try {
        await this.scheduleLocalNotification(titulo, mensaje, {
          ...data,
          grado,
          tipo: 'programa'
        });
        
        // También incrementamos el contador de notificaciones para el badge
        const count = await AsyncStorage.getItem('notificationCount') || '0';
        const newCount = parseInt(count, 10) + 1;
        await AsyncStorage.setItem('notificationCount', newCount.toString());
        
        return { success: true, local: true };
      } catch (error) {
        console.error('Error enviando notificación local:', error);
      }
    }
    
    // Si estamos en web o falló el envío local, solo mostramos en consola
    console.log(`Notificación simulada para ${grado}: ${titulo} - ${mensaje}`);
    return { success: true, simulated: true };
  }
};