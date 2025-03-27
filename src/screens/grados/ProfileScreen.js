// src/screens/grados/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../config/database';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar datos del usuario
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Intentar obtener datos del usuario actual
      if (global.userId) {
        const { data, error } = await supabase
          .from('usuarios')
          .select(`
            id,
            username,
            email,
            rol,
            grado,
            miembro:miembro_id (
              id,
              nombres,
              apellidos,
              rut,
              fecha_nacimiento,
              profesion,
              email,
              telefono,
              direccion,
              cargo,
              fecha_iniciacion,
              fecha_aumento_salario,
              fecha_exaltacion,
              contacto_emergencia_nombre,
              contacto_emergencia_telefono,
              trabajo_nombre,
              trabajo_cargo
            )
          `)
          .eq('id', global.userId)
          .single();

        if (error) throw error;
        setUserData(data);
      } else {
        // Si no hay userId, intentar obtener datos de AsyncStorage
        const storedData = await AsyncStorage.getItem('userData');
        if (storedData) {
          setUserData(JSON.parse(storedData));
        } else {
          throw new Error('No se encontraron datos de usuario');
        }
      }
    } catch (error) {
      console.error('Error cargando datos de usuario:', error);
      setError('No se pudieron cargar los datos del perfil');
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Devolver el string original si no es una fecha válida
      }
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Función para cerrar sesión
  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Sí, salir',
          style: 'destructive',
          onPress: async () => {
            try {
              // Eliminar datos de sesión de AsyncStorage
              await AsyncStorage.removeItem('userData');
              
              // Limpiar variables globales
              global.userRole = null;
              global.userGrado = null;
              global.userName = null;
              global.userCargo = null;
              global.userFullName = null;
              global.userId = null;
              
              // Navegar a la pantalla de login con reset para evitar volver atrás
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
              Alert.alert('Error', 'No se pudo cerrar la sesión. Intente nuevamente.');
            }
          }
        }
      ]
    );
  };

  // Determinar la imagen de perfil según el grado
  const getProfileImage = () => {
    const grado = userData?.grado || global.userGrado;
    
    switch(grado) {
      case 'maestro':
        return require('../../../assets/Orpheo1.png');
      case 'companero':
        return require('../../../assets/Orpheo1.png');
      case 'aprendiz':
      default:
        return require('../../../assets/Orpheo1.png');
    }
  };

  // Traducir el rol para mostrar
  const getRolDisplay = (rol) => {
    switch(rol) {
      case 'admin':
        return 'Administrador';
      case 'superadmin':
        return 'Super Administrador';
      case 'general':
      default:
        return 'Miembro';
    }
  };

  // Traducir el grado para mostrar
  const getGradoDisplay = (grado) => {
    switch(grado) {
      case 'maestro':
        return 'Maestro';
      case 'companero':
        return 'Compañero';
      case 'aprendiz':
      default:
        return 'Aprendiz';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={50} color="#ff4d4f" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadUserData}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        {/* Encabezado del perfil */}
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <Image
              source={getProfileImage()}
              style={styles.profileImage}
              resizeMode="cover"
            />
            <View style={styles.badgeContainer}>
              {userData?.rol === 'admin' || userData?.rol === 'superadmin' ? (
                <View style={styles.adminBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#fff" />
                  <Text style={styles.adminBadgeText}>
                    {userData?.rol === 'superadmin' ? 'Súper Admin' : 'Admin'}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          
          <Text style={styles.userName}>
            {userData?.miembro 
              ? `${userData.miembro.nombres} ${userData.miembro.apellidos}` 
              : userData?.username || global.userFullName || 'Usuario'}
          </Text>
          
          <Text style={styles.userGrado}>
            {getGradoDisplay(userData?.grado || global.userGrado)}
          </Text>
          
          {(userData?.miembro?.cargo || global.userCargo) && (
            <Text style={styles.userCargo}>
              {userData?.miembro?.cargo || global.userCargo}
            </Text>
          )}
        </View>

        {/* Información de cuenta */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Información de Cuenta</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Usuario:</Text>
            <Text style={styles.infoValue}>{userData?.username || global.userName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rol:</Text>
            <Text style={styles.infoValue}>{getRolDisplay(userData?.rol || global.userRole)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{userData?.email || userData?.miembro?.email || 'No especificado'}</Text>
          </View>
        </View>

        {/* Información personal */}
        {userData?.miembro && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Información Personal</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>RUT:</Text>
              <Text style={styles.infoValue}>{userData.miembro.rut || 'No especificado'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha de Nac.:</Text>
              <Text style={styles.infoValue}>{formatDate(userData.miembro.fecha_nacimiento)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Profesión:</Text>
              <Text style={styles.infoValue}>{userData.miembro.profesion || 'No especificada'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Teléfono:</Text>
              <Text style={styles.infoValue}>{userData.miembro.telefono || 'No especificado'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Dirección:</Text>
              <Text style={styles.infoValue}>{userData.miembro.direccion || 'No especificada'}</Text>
            </View>
          </View>
        )}

        {/* Información del taller */}
        {userData?.miembro && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Información del Taller</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Iniciación:</Text>
              <Text style={styles.infoValue}>{formatDate(userData.miembro.fecha_iniciacion)}</Text>
            </View>
            {userData.miembro.fecha_aumento_salario && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Aumento de Salario:</Text>
                <Text style={styles.infoValue}>{formatDate(userData.miembro.fecha_aumento_salario)}</Text>
              </View>
            )}
            {userData.miembro.fecha_exaltacion && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Exaltación:</Text>
                <Text style={styles.infoValue}>{formatDate(userData.miembro.fecha_exaltacion)}</Text>
              </View>
            )}
            {userData.miembro.trabajo_nombre && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Trabajo:</Text>
                <Text style={styles.infoValue}>{userData.miembro.trabajo_nombre}</Text>
              </View>
            )}
            {userData.miembro.trabajo_cargo && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cargo Laboral:</Text>
                <Text style={styles.infoValue}>{userData.miembro.trabajo_cargo}</Text>
              </View>
            )}
          </View>
        )}

        {/* Contacto de emergencia */}
        {userData?.miembro?.contacto_emergencia_nombre && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Contacto de Emergencia</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nombre:</Text>
              <Text style={styles.infoValue}>{userData.miembro.contacto_emergencia_nombre}</Text>
            </View>
            {userData.miembro.contacto_emergencia_telefono && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Teléfono:</Text>
                <Text style={styles.infoValue}>{userData.miembro.contacto_emergencia_telefono}</Text>
              </View>
            )}
          </View>
        )}

        {/* Botones de acción */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => Alert.alert('Información', 'Función de editar perfil en desarrollo')}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Editar Perfil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.buttonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>

        {/* Versión de la app */}
        <Text style={styles.versionText}>OrpheoApp v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
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
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 30,
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  userGrado: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
    marginTop: 5,
  },
  userCargo: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
    marginTop: 5,
    fontStyle: 'italic',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 15,
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoLabel: {
    width: 140,
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  actionContainer: {
    padding: 15,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff4d4f',
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginVertical: 20,
  }
});