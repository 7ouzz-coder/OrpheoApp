// src/screens/admin/DatabaseTestScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { testDatabaseConnection } from '../../utils/testdatabase';

export default function DatabaseTestScreen({ navigation }) {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Probar la conexión a la base de datos
      const result = await testDatabaseConnection();
      setConnectionStatus(result);
    } catch (err) {
      console.error('Error probando conexión:', err);
      setError(err.message || 'Error desconocido al probar la conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Prueba de Conexión a PostgreSQL</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Probando conexión a PostgreSQL...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={50} color="#ff4d4f" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={testConnection}
            >
              <Text style={styles.retryButtonText}>Intentar nuevamente</Text>
            </TouchableOpacity>
          </View>
        ) : connectionStatus?.success ? (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={50} color="#52c41a" />
            <Text style={styles.successTitle}>Conexión exitosa</Text>
            <Text style={styles.successMessage}>{connectionStatus.message}</Text>
            {connectionStatus.timestamp && (
              <Text style={styles.timestamp}>
                Timestamp: {new Date(connectionStatus.timestamp).toLocaleString()}
              </Text>
            )}
            
            <TouchableOpacity
              style={styles.retryButton}
              onPress={testConnection}
            >
              <Text style={styles.retryButtonText}>Probar nuevamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.failureContainer}>
            <Ionicons name="close-circle" size={50} color="#ff4d4f" />
            <Text style={styles.failureTitle}>Error de conexión</Text>
            <Text style={styles.failureMessage}>
              {connectionStatus?.error || 'Error desconocido al conectar con PostgreSQL'}
            </Text>
            {connectionStatus?.code && (
              <Text style={styles.errorCode}>Código de error: {connectionStatus.code}</Text>
            )}
            
            <TouchableOpacity
              style={styles.retryButton}
              onPress={testConnection}
            >
              <Text style={styles.retryButtonText}>Intentar nuevamente</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.configInfoCard}>
          <Text style={styles.configTitle}>Información de configuración:</Text>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Host:</Text>
            <Text style={styles.configValue}>{process.env.PGHOST || 'localhost'}</Text>
          </View>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Puerto:</Text>
            <Text style={styles.configValue}>{process.env.PGPORT || '5432'}</Text>
          </View>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Base de datos:</Text>
            <Text style={styles.configValue}>{process.env.PGDATABASE || 'OrpheoApp'}</Text>
          </View>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Usuario:</Text>
            <Text style={styles.configValue}>{process.env.PGUSER || 'postgres'}</Text>
          </View>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>SSL:</Text>
            <Text style={styles.configValue}>{process.env.PGSSL === 'true' ? 'Habilitado' : 'Deshabilitado'}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  content: {
    padding: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  errorText: {
    marginTop: 10,
    marginBottom: 20,
    fontSize: 16,
    color: '#ff4d4f',
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  successTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#52c41a',
  },
  successMessage: {
    marginTop: 5,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  timestamp: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  failureContainer: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  failureTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff4d4f',
  },
  failureMessage: {
    marginTop: 5,
    marginBottom: 10,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  errorCode: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  configInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  configItem: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  configLabel: {
    width: 100,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  configValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  }
});