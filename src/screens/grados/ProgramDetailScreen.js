// src/screens/grados/ProgramDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { programaService } from '../../services/programaService';

export default function ProgramDetailScreen({ route, navigation }) {
  const { programId } = route.params || {};
  const [programa, setPrograma] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPrograma();
  }, [programId]);

  const loadPrograma = async () => {
    if (!programId) {
      setError('No se proporcionó un ID de programa');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Si estamos en modo demo o programId es inválido, usamos datos de muestra
      if (programId === '123' || !programId.includes('-')) {
        // Datos de demo
        setPrograma({
          id: programId,
          fecha: '2025-03-15',
          tema: 'Introducción a la simbología',
          encargado: 'Juan Pérez',
          quien_imparte: 'Carlos González',
          resumen: 'Estudio de los símbolos fundamentales y su interpretación histórica.',
          estado: 'Programado',
          grado: 'aprendiz',
          tipo: 'camara'
        });
      } else {
        // Si tenemos un ID válido, intentamos cargar de la base de datos
        const data = await programaService.obtenerPorId(programId);
        setPrograma(data);
      }
    } catch (error) {
      console.error('Error cargando programa:', error);
      setError('No se pudo cargar el programa');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando programa...</Text>
      </View>
    );
  }

  if (error || !programa) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'No se encontró el programa'}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle del Programa</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.programHeader}>
          <Text style={styles.programDate}>{programa.fecha}</Text>
          <Text style={styles.programTitle}>{programa.tema}</Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Encargado:</Text>
            <Text style={styles.infoValue}>{programa.encargado}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Impartido por:</Text>
            <Text style={styles.infoValue}>{programa.quien_imparte}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estado:</Text>
            <Text style={[
              styles.statusValue,
              programa.estado === 'Programado' ? styles.statusProgramado :
              programa.estado === 'Completado' ? styles.statusCompletado :
              programa.estado === 'Cancelado' ? styles.statusCancelado :
              styles.statusPendiente
            ]}>
              {programa.estado}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tipo:</Text>
            <Text style={styles.infoValue}>{programa.tipo}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Grado:</Text>
            <Text style={styles.infoValue}>{programa.grado}</Text>
          </View>
        </View>

        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionTitle}>Resumen</Text>
          <Text style={styles.descriptionText}>
            {programa.resumen || 'No hay resumen disponible para este programa.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  programHeader: {
    marginBottom: 20,
  },
  programDate: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 5,
  },
  programTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoLabel: {
    width: 120,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusPendiente: {
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  statusProgramado: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
  },
  statusCompletado: {
    backgroundColor: '#e8f5e9',
    color: '#388e3c',
  },
  statusCancelado: {
    backgroundColor: '#ffebee',
    color: '#d32f2f',
  },
  descriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    fontSize: 16,
    fontWeight: '600',
  }
});