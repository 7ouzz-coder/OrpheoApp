// src/screens/HierarchyScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { programaService } from '../../services/programaService';

export default function HierarchyScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hierarchyData, setHierarchyData] = useState([]);
  const [selectedType, setSelectedType] = useState('oficialidad');

  const hierarchyTypes = [
    { id: 'oficialidad', title: 'Oficialidad', icon: 'ribbon-outline' },
    { id: 'camara', title: 'Cámaras', icon: 'grid-outline' },
    { id: 'comision_docencia', title: 'Comisión Docencia', icon: 'school-outline' },
    { id: 'comision_especial', title: 'Comisiones Especiales', icon: 'people-outline' },
  ];

  useEffect(() => {
    loadHierarchy();
  }, [selectedType]);

  const loadHierarchy = async () => {
    setLoading(true);
    try {
      const data = await programaService.obtenerJerarquia(selectedType);
      setHierarchyData(data);
    } catch (error) {
      console.error('Error cargando jerarquía:', error);
      setError('No se pudo cargar la información de jerarquía');
    } finally {
      setLoading(false);
    }
  };

  const renderTypeSelector = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.typeSelectorContainer}
    >
      {hierarchyTypes.map(type => (
        <TouchableOpacity
          key={type.id}
          style={[
            styles.typeButton,
            selectedType === type.id && styles.selectedTypeButton
          ]}
          onPress={() => setSelectedType(type.id)}
        >
          <Ionicons 
            name={type.icon} 
            size={20} 
            color={selectedType === type.id ? '#fff' : '#666'} 
          />
          <Text style={[
            styles.typeButtonText,
            selectedType === type.id && styles.selectedTypeButtonText
          ]}>
            {type.title}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderHierarchyItem = ({ item }) => {
    // Convertir miembros de string a objeto si es necesario
    const miembros = item.miembros 
      ? (typeof item.miembros === 'string' ? JSON.parse(item.miembros) : item.miembros) 
      : [];
    
    return (
      <View style={styles.hierarchyCard}>
        <Text style={styles.hierarchyTitle}>{item.nombre}</Text>
        
        {item.descripcion && (
          <Text style={styles.hierarchyDescription}>{item.descripcion}</Text>
        )}
        
        <View style={styles.membersContainer}>
          <Text style={styles.membersTitle}>Miembros:</Text>
          {miembros.length > 0 ? (
            miembros.map((miembro, index) => (
              <View key={index} style={styles.memberItem}>
                <Text style={styles.memberCargo}>{miembro.cargo}:</Text>
                <Text style={styles.memberName}>
                  {miembro.nombre || 'Pendiente de asignación'}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noMembersText}>No hay miembros asignados</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Jerarquía Organizacional</Text>
      </View>
      
      {renderTypeSelector()}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Cargando información...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadHierarchy}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={hierarchyData}
          renderItem={renderHierarchyItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No hay información disponible para esta categoría
              </Text>
            </View>
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
  typeSelectorContainer: {
    backgroundColor: '#fff',
    padding: 12,
    paddingBottom: 15,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
  },
  selectedTypeButton: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  selectedTypeButtonText: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  listContainer: {
    padding: 15,
  },
  hierarchyCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  hierarchyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  hierarchyDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  membersContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 6,
  },
  membersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  memberItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  memberCargo: {
    width: 120,
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  memberName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  noMembersText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#888',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});