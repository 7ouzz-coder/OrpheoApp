import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { programaService } from '../../services/programaService';
import { notificationService } from '../../services/notificationService';

export default function TeachingProgramScreen({ navigation }) {
  const [selectedGrade, setSelectedGrade] = useState('aprendiz');
  const [selectedType, setSelectedType] = useState('camara');
  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [documentos, setDocumentos] = useState([]);

  // Estados para el formulario
  const [fecha, setFecha] = useState('');
  const [tema, setTema] = useState('');
  const [encargado, setEncargado] = useState('');
  const [quienImparte, setQuienImparte] = useState('');
  const [resumen, setResumen] = useState('');
  const [estado, setEstado] = useState('Pendiente');

  // Obtener el grado y rol del usuario
  const userGrado = global.userGrado || 'aprendiz';
  const isAdmin = global.userRole === 'admin';
  const isOficialidad = global.userCargo && global.userCargo.trim() !== '';

  // Datos para los selectores de grado y tipo
  const availableGrades = [
    { id: 'aprendiz', title: 'Aprendiz' },
    { id: 'companero', title: 'Compañero' },
    { id: 'maestro', title: 'Maestro' }
  ];

  const programTypes = [
    { id: 'camara', title: 'Cámara' },
    { id: 'trabajo', title: 'Trabajo' }
  ];

  // Determinar qué grados pueden verse según el nivel del usuario
  const visibleGrades = availableGrades.filter(grade => {
    if (isAdmin || isOficialidad) return true;
    
    const gradeValues = {
      'aprendiz': 1,
      'companero': 2,
      'maestro': 3
    };
    
    const userGradeValue = gradeValues[userGrado] || 1;
    const gradeValue = gradeValues[grade.id] || 3;
    
    return userGradeValue >= gradeValue;
  });

  // Cargar programas al iniciar o cambiar selección
  useEffect(() => {
    loadPrograms();
  }, [selectedGrade, selectedType]);

  const loadPrograms = async () => {
    setLoading(true);
    try {
      const data = await programaService.obtenerPorGradoYTipo(selectedGrade, selectedType);
      setPrograms(data);
    } catch (error) {
      console.error('Error cargando programas:', error);
      setError('No se pudieron cargar los programas. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Verificar permisos para editar
  const canEditProgram = () => {
    return isAdmin || isOficialidad; // Solo los admin o miembros de oficialidad pueden editar
  };

  const clearForm = () => {
    setFecha('');
    setTema('');
    setEncargado('');
    setQuienImparte('');
    setResumen('');
    setEstado('Pendiente');
    setDocumentos([]);
    setEditingProgram(null);
  };

  const handleSave = async () => {
    if (!fecha || !tema || !encargado || !quienImparte) {
      Alert.alert('Error', 'Todos los campos marcados con * son obligatorios');
      return;
    }

    const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    if (!dateRegex.test(fecha)) {
      Alert.alert('Error', 'Formato de fecha incorrecto (DD/MM/YYYY)');
      return;
    }

    try {
      const newProgram = {
        id: editingProgram ? editingProgram.id : undefined,
        fecha,
        tema,
        encargado,
        quien_imparte: quienImparte,
        resumen,
        estado,
        grado: selectedGrade,
        tipo: selectedType,
        documentos: documentos.length > 0 ? JSON.stringify(documentos) : null
      };

      if (editingProgram) {
        await programaService.actualizar(editingProgram.id, newProgram);
        Alert.alert('Éxito', 'Programa actualizado correctamente');
      } else {
        const result = await programaService.crear(newProgram);
        
        // Enviar notificación a los usuarios con el grado apropiado
        try {
          await notificationService.sendNotificationToGrado(
            'Nuevo Programa',
            `Se ha publicado un nuevo programa: ${tema}`,
            selectedGrade,
            { programaId: result.id }
          );
        } catch (notifError) {
          console.error('Error al enviar notificación:', notifError);
          // No bloqueamos el flujo principal por un error en notificaciones
        }
        
        Alert.alert('Éxito', 'Programa creado correctamente');
      }
  
      // Recargar programas
      await loadPrograms();
      
      setShowModal(false);
      clearForm();
    } catch (error) {
      console.error('Error guardando programa:', error);
      Alert.alert('Error', 'No se pudo guardar el programa');
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de eliminar este programa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await programaService.eliminar(id);
              Alert.alert('Éxito', 'Programa eliminado correctamente');
              await loadPrograms();
            } catch (error) {
              console.error('Error eliminando programa:', error);
              Alert.alert('Error', 'No se pudo eliminar el programa');
            }
          }
        }
      ]
    );
  };

  const handleAddDocument = () => {
    Alert.prompt(
      'Agregar Documento',
      'Ingresa el nombre del documento',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Agregar',
          onPress: (nombre) => {
            if (nombre && nombre.trim()) {
              const newDoc = {
                id: Date.now().toString(),
                nombre: nombre.trim()
              };
              setDocumentos([...documentos, newDoc]);
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const handleRemoveDocument = (docId) => {
    setDocumentos(documentos.filter(doc => doc.id !== docId));
  };

  const renderProgramHeader = () => (
    <View style={styles.programHeader}>
      <Text style={styles.headerTitle}>
        Programas de {selectedType === 'camara' ? 'Cámara' : 'Trabajo'} - {availableGrades.find(g => g.id === selectedGrade)?.title || selectedGrade}
      </Text>
      <Text style={styles.headerDescription}>
        {selectedType === 'camara' 
          ? (selectedGrade === 'maestro' 
             ? 'Reuniones mensuales para maestros' 
             : 'Sesiones semanales de cámara')
          : 'Sesiones de trabajo los martes de cada mes'}
      </Text>
    </View>
  );

  const renderProgram = ({ item }) => {
    // Convertir documentos de string a objeto si es necesario
    const programDocs = item.documentos 
      ? (typeof item.documentos === 'string' ? JSON.parse(item.documentos) : item.documentos) 
      : [];
    
    return (
      <View style={styles.programCard}>
        <View style={styles.dateContainer}>
          <Text style={styles.date}>{item.fecha}</Text>
          <Text style={[
            styles.status,
            item.estado === 'Pendiente' ? styles.statusPending : styles.statusScheduled
          ]}>
            {item.estado}
          </Text>
        </View>

        <Text style={styles.theme}>{item.tema}</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Encargado:</Text>
          <Text style={styles.infoValue}>{item.encargado}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Imparte:</Text>
          <Text style={styles.infoValue}>{item.quien_imparte || 'No especificado'}</Text>
        </View>
        
        {item.resumen && (
          <View style={styles.resumenContainer}>
            <Text style={styles.resumenTitle}>Resumen:</Text>
            <Text style={styles.resumenText}>{item.resumen}</Text>
          </View>
        )}
        
        {programDocs && programDocs.length > 0 && (
          <View style={styles.documentsContainer}>
            <Text style={styles.documentsTitle}>Documentos:</Text>
            {programDocs.map(doc => (
              <View key={doc.id} style={styles.documentItem}>
                <Ionicons name="document-text-outline" size={16} color="#007AFF" />
                <Text style={styles.documentName}>{doc.nombre}</Text>
              </View>
            ))}
          </View>
        )}

        {canEditProgram() && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => {
                setEditingProgram(item);
                setFecha(item.fecha);
                setTema(item.tema);
                setEncargado(item.encargado);
                setQuienImparte(item.quien_imparte || '');
                setResumen(item.resumen || '');
                setEstado(item.estado);
                setDocumentos(programDocs || []);
                setShowModal(true);
              }}
            >
              <Ionicons name="pencil" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Selectores de Grado y Tipo */}
      <View style={styles.selectors}>
        <View style={styles.selector}>
          <Text style={styles.selectorLabel}>Grado:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.buttonGroup}>
              {visibleGrades.map((grade) => (
                <TouchableOpacity
                  key={grade.id}
                  style={[
                    styles.selectorButton,
                    selectedGrade === grade.id && styles.selectedButton
                  ]}
                  onPress={() => setSelectedGrade(grade.id)}
                >
                  <Text style={[
                    styles.selectorButtonText,
                    selectedGrade === grade.id && styles.selectedButtonText
                  ]}>
                    {grade.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
        
        <View style={styles.selector}>
          <Text style={styles.selectorLabel}>Tipo:</Text>
          <View style={styles.buttonGroup}>
            {programTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.selectorButton,
                  selectedType === type.id && styles.selectedButton
                ]}
                onPress={() => setSelectedType(type.id)}
              >
                <Text style={[
                  styles.selectorButtonText,
                  selectedType === type.id && styles.selectedButtonText
                ]}>
                  {type.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Botón de agregar */}
      {canEditProgram() && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            clearForm();
            setShowModal(true);
          }}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Agregar Programa</Text>
        </TouchableOpacity>
      )}

      {/* Lista de programas */}
      {loading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Cargando programas...</Text>
        </View>
      ) : error ? (
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadPrograms}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={programs}
          renderItem={renderProgram}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderProgramHeader}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No hay programas registrados para este grado y tipo
              </Text>
            </View>
          }
          refreshing={loading}
          onRefresh={loadPrograms}
        />
      )}

      {/* Modal para agregar/editar programa */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowModal(false);
          clearForm();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingProgram ? 'Editar Programa' : 'Nuevo Programa'}
            </Text>

            <ScrollView>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Fecha (DD/MM/YYYY) *</Text>
                <TextInput
                  style={styles.input}
                  value={fecha}
                  onChangeText={setFecha}
                  placeholder="Ejemplo: 25/03/2025"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Tema *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={tema}
                  onChangeText={setTema}
                  multiline
                  numberOfLines={3}
                  placeholder="Título o tema del programa..."
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Encargado *</Text>
                <TextInput
                  style={styles.input}
                  value={encargado}
                  onChangeText={setEncargado}
                  placeholder="Nombre del encargado"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Quien Imparte *</Text>
                <TextInput
                  style={styles.input}
                  value={quienImparte}
                  onChangeText={setQuienImparte}
                  placeholder="Nombre de quien imparte"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Resumen</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={resumen}
                  onChangeText={setResumen}
                  multiline
                  numberOfLines={5}
                  placeholder="Breve resumen del programa..."
                />
              </View>

              <View style={styles.statusContainer}>
                <Text style={styles.inputLabel}>Estado</Text>
                <View style={styles.statusButtons}>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      estado === 'Pendiente' && styles.statusButtonActive
                    ]}
                    onPress={() => setEstado('Pendiente')}
                  >
                    <Text style={styles.statusButtonText}>Pendiente</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      estado === 'Programado' && styles.statusButtonActive
                    ]}
                    onPress={() => setEstado('Programado')}
                  >
                    <Text style={styles.statusButtonText}>Programado</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.documentsSection}>
                <View style={styles.documentsSectionHeader}>
                  <Text style={styles.inputLabel}>Documentos</Text>
                  <TouchableOpacity 
                    style={styles.addDocumentButton}
                    onPress={handleAddDocument}
                  >
                    <Ionicons name="add-circle" size={24} color="#007AFF" />
                  </TouchableOpacity>
                </View>
                
                {documentos.length > 0 ? (
                  <View style={styles.documentsList}>
                    {documentos.map(doc => (
                      <View key={doc.id} style={styles.documentListItem}>
                        <Ionicons name="document-text-outline" size={20} color="#007AFF" />
                        <Text style={styles.documentListItemText}>{doc.nombre}</Text>
                        <TouchableOpacity 
                          style={styles.removeDocumentButton}
                          onPress={() => handleRemoveDocument(doc.id)}
                        >
                          <Ionicons name="close-circle" size={20} color="#ff4d4f" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noDocumentsText}>No hay documentos asociados</Text>
                )}
              </View>

              <Text style={styles.requiredFieldsNote}>* Campos obligatorios</Text>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowModal(false);
                  clearForm();
                }}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.modalButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  selectors: {
    backgroundColor: '#fff',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selector: {
    marginBottom: 10,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  buttonGroup: {
    flexDirection: 'row',
  },
  selectorButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 8,
  },
  selectedButton: {
    backgroundColor: '#007AFF',
  },
  selectorButtonText: {
    fontSize: 14,
    color: '#666',
  },
  selectedButtonText: {
    color: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    margin: 10,
  },
  addButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 16,
    fontWeight: '600',
  },
  centeredContainer: {
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
    padding: 10,
    paddingBottom: 20,
  },
  programHeader: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  headerDescription: {
    fontSize: 14,
    color: '#666',
  },
  programCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  statusPending: {
    backgroundColor: '#FFE58F',
    color: '#D4B106',
  },
  statusScheduled: {
    backgroundColor: '#B7EB8F',
    color: '#52C41A',
  },
  theme: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 80,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  resumenContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    marginBottom: 10,
  },
  resumenTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  resumenText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  documentsContainer: {
    marginTop: 10,
  },
  documentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  documentName: {
    marginLeft: 5,
    fontSize: 14,
    color: '#007AFF',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 10,
  },
  editButton: {
    backgroundColor: '#1890FF',
  },
  deleteButton: {
    backgroundColor: '#ff4d4f',
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 14,
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 25,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  statusContainer: {
    marginBottom: 20,
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  statusButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  statusButtonText: {
    color: '#666',
  },
  documentsSection: {
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  documentsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addDocumentButton: {
    padding: 5,
  },
  documentsList: {
    marginTop: 10,
  },
  documentListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  documentListItemText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  removeDocumentButton: {
    padding: 5,
  },
  noDocumentsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
  },
  requiredFieldsNote: {
    fontSize: 12,
    color: '#ff4d4f',
    marginBottom: 20,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#ff4d4f',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});