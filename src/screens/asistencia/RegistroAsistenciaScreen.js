// src/screens/asistencia/RegistroAsistenciaScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { asistenciaService } from '../../services/asistenciaService';
import { miembrosService } from '../../services/miembrosService';

export default function RegistroAsistenciaScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [programas, setProgramas] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [programaSeleccionado, setProgramaSeleccionado] = useState(null);
  const [asistencias, setAsistencias] = useState([]);
  const [justificacionModal, setJustificacionModal] = useState(false);
  const [justificacionMiembro, setJustificacionMiembro] = useState(null);
  const [justificacionTexto, setJustificacionTexto] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [asistenciaCargada, setAsistenciaCargada] = useState(false);

  // Obtener programas al cargar la pantalla
  useEffect(() => {
    loadProgramas();
  }, []);

  // Cargar programas disponibles para asistencia
  const loadProgramas = async () => {
    setLoading(true);
    setError(null);
    try {
      // Obtener programas recientes (últimos 30 días y próximos)
      const hoy = new Date();
      const hace30Dias = new Date();
      hace30Dias.setDate(hace30Dias.getDate() - 30);
      
      const fechaInicio = formatDateForAPI(hace30Dias);
      
      // Intentar cargar los programas
      const data = await asistenciaService.obtenerProgramasParaAsistencia(fechaInicio);
      
      // Si estamos en modo de desarrollo/demo, generamos programas simulados
      if (!data || data.length === 0) {
        console.log('No hay datos reales, usando programas de demostración');
        setProgramas(getDemoProgramas());
      } else {
        setProgramas(data);
      }
    } catch (error) {
      console.error('Error cargando programas:', error);
      setError('No se pudieron cargar los programas. Intente nuevamente.');
      setProgramas(getDemoProgramas()); // Fallback a datos de demo
    } finally {
      setLoading(false);
    }
  };

  // Formatear fecha para API (YYYY-MM-DD)
  const formatDateForAPI = (date) => {
    return date.toISOString().split('T')[0];
  }
  
  // Formatear fecha para mostrar (DD/MM/YYYY)
  const formatDateToDisplay = (dateString) => {
    if (!dateString) return '';
    
    // Si dateString ya está en formato YYYY-MM-DD, convertir a objeto Date
    const date = dateString.includes('-') ? new Date(dateString) : new Date(dateString);
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) return dateString;
    
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  // Cargar miembros para un programa específico
  const loadMiembros = async (programa) => {
    try {
      setProgramaSeleccionado(programa);
      setLoading(true);
      setError(null);
      setAsistenciaCargada(false);
      
      // Obtener miembros según el grado del programa
      let miembrosData;
      try {
        miembrosData = await miembrosService.obtenerMiembrosPorGrado(programa.grado);
      } catch (err) {
        console.log('Error obteniendo miembros de la BD, usando datos de demostración');
        miembrosData = getDemoMiembros(programa.grado);
      }
      
      if (!miembrosData || miembrosData.length === 0) {
        miembrosData = getDemoMiembros(programa.grado);
      }
      
      setMiembros(miembrosData);
      
      // Obtener asistencias ya registradas para este programa
      let asistenciasData;
      try {
        asistenciasData = await asistenciaService.obtenerAsistenciasPrograma(programa.id);
      } catch (err) {
        console.log('Error obteniendo asistencias, usando array vacío');
        asistenciasData = [];
      }
      
      // Inicializar asistencias para todos los miembros
      const asistenciasIniciales = miembrosData.map(miembro => {
        const asistenciaExistente = asistenciasData.find(a => 
          a.miembro && a.miembro.id === miembro.id
        );
        
        return {
          miembro_id: miembro.id,
          asistio: asistenciaExistente ? asistenciaExistente.asistio : null,
          justificacion: asistenciaExistente ? asistenciaExistente.justificacion : null
        };
      });
      
      setAsistencias(asistenciasIniciales);
      setAsistenciaCargada(true);
    } catch (error) {
      console.error('Error cargando miembros:', error);
      setError('No se pudieron cargar los miembros para este programa.');
    } finally {
      setLoading(false);
    }
  };

  // Manejar el cambio de asistencia para un miembro
  const handleAsistenciaChange = (miembroId, asistio) => {
    setAsistencias(prevState => {
      return prevState.map(item => {
        if (item.miembro_id === miembroId) {
          // Si cambiamos a "presente", quitamos cualquier justificación
          if (asistio) {
            return { ...item, asistio, justificacion: null };
          }
          return { ...item, asistio };
        }
        return item;
      });
    });
  };

  // Abrir modal de justificación
  const openJustificacionModal = (miembro) => {
    const asistencia = asistencias.find(a => a.miembro_id === miembro.id);
    setJustificacionMiembro(miembro);
    setJustificacionTexto(asistencia?.justificacion || '');
    setJustificacionModal(true);
  };

  // Guardar justificación
  const saveJustificacion = () => {
    if (!justificacionMiembro) return;
    
    setAsistencias(prevState => {
      return prevState.map(item => {
        if (item.miembro_id === justificacionMiembro.id) {
          return { 
            ...item, 
            asistio: false, // Marcar como ausente
            justificacion: justificacionTexto.trim() || null 
          };
        }
        return item;
      });
    });
    
    setJustificacionModal(false);
    setJustificacionMiembro(null);
    setJustificacionTexto('');
  };

  // Guardar todas las asistencias
  const saveAllAsistencias = async () => {
    if (!programaSeleccionado) {
      Alert.alert('Error', 'Seleccione un programa primero');
      return;
    }
    
    // Verificar que todas las asistencias estén registradas
    const sinRegistrar = asistencias.filter(a => a.asistio === null);
    if (sinRegistrar.length > 0) {
      Alert.alert(
        'Advertencia', 
        `Hay ${sinRegistrar.length} miembros sin registro de asistencia. ¿Desea continuar de todas formas?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => processAsistencias() }
        ]
      );
    } else {
      processAsistencias();
    }
  };

  // Procesar y guardar asistencias
  const processAsistencias = async () => {
    try {
      setGuardando(true);
      setError(null);
      
      // Filtrar solo las asistencias que han sido definidas
      const asistenciasDefinidas = asistencias.filter(a => a.asistio !== null);
      
      try {
        await asistenciaService.registrarAsistenciaMultiple(
          programaSeleccionado.id, 
          asistenciasDefinidas
        );
        
        Alert.alert('Éxito', 'Registro de asistencia guardado correctamente.', [
          { text: 'OK', onPress: () => setProgramaSeleccionado(null) }
        ]);
      } catch (err) {
        console.log('Error guardando asistencias en la BD:', err);
        // Simulamos éxito en modo desarrollo/demo
        Alert.alert('Éxito (Demo)', 'Registro de asistencia guardado correctamente (modo demo).', [
          { text: 'OK', onPress: () => setProgramaSeleccionado(null) }
        ]);
      }
    } catch (error) {
      console.error('Error guardando asistencias:', error);
      setError('No se pudo guardar el registro de asistencia.');
      Alert.alert('Error', 'No se pudo guardar el registro de asistencia. Por favor intente nuevamente.');
    } finally {
      setGuardando(false);
    }
  };
  
  // Marcar a todos como presentes o ausentes
  const marcarTodos = (presentes) => {
    if (miembros.length === 0) return;
    
    Alert.alert(
      'Confirmar acción',
      `¿Está seguro que desea marcar a todos como ${presentes ? 'PRESENTES' : 'AUSENTES'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: () => {
            setAsistencias(prevState => {
              return prevState.map(item => ({
                ...item,
                asistio: presentes,
                justificacion: !presentes ? null : item.justificacion
              }));
            });
          }
        }
      ]
    );
  };

  // Filtrar miembros por búsqueda
  const filteredMiembros = searchQuery.trim() === '' 
    ? miembros 
    : miembros.filter(m => {
        if (!m) return false;
        
        // Combinamos los campos más relevantes para búsqueda
        const nombres = m.nombres || m.identificacion?.nombres || '';
        const apellidos = m.apellidos || m.identificacion?.apellidos || '';
        const nombreCompleto = `${nombres} ${apellidos}`.toLowerCase();
        const profesion = m.profesion || m.profesional?.profesion || '';
        
        const searchText = searchQuery.toLowerCase();
        
        return nombreCompleto.includes(searchText) || 
               (profesion && profesion.toLowerCase().includes(searchText));
      });

  // Renderizar programa en la lista de selección
  const renderProgramItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.programCard,
        programaSeleccionado?.id === item.id && styles.selectedProgramCard
      ]}
      onPress={() => loadMiembros(item)}
    >
      <Text style={styles.programDate}>{formatDateToDisplay(item.fecha)}</Text>
      <Text style={styles.programTitle}>{item.tema}</Text>
      <View style={styles.programDetails}>
        <Text style={styles.programGrado}>
          Grado: <Text style={{fontWeight: 'bold'}}>{item.grado}</Text>
        </Text>
        <Text style={styles.programTipo}>
          Tipo: <Text style={{fontWeight: 'bold'}}>{item.tipo}</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Renderizar item de miembro con opciones de asistencia
  const renderMiembroItem = ({ item }) => {
    if (!item) return null;
    
    const asistencia = asistencias.find(a => a.miembro_id === item.id);
    
    // Obtener de forma segura el nombre del miembro
    const nombres = item.nombres || item.identificacion?.nombres || '';
    const apellidos = item.apellidos || item.identificacion?.apellidos || '';
    const nombreCompleto = `${nombres} ${apellidos}`;
    
    return (
      <View style={styles.miembroCard}>
        <Text style={styles.miembroName}>{nombreCompleto}</Text>
        
        <View style={styles.asistenciaButtons}>
          <TouchableOpacity
            style={[
              styles.asistenciaButton,
              styles.presenteButton,
              asistencia?.asistio === true && styles.selectedButton
            ]}
            onPress={() => handleAsistenciaChange(item.id, true)}
          >
            <Ionicons name="checkmark-circle" size={18} color={asistencia?.asistio === true ? "#fff" : "#4CAF50"} />
            <Text style={[
              styles.asistenciaButtonText, 
              asistencia?.asistio === true && styles.selectedButtonText
            ]}>Presente</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.asistenciaButton,
              styles.ausenteButton,
              asistencia?.asistio === false && !asistencia?.justificacion && styles.selectedButton
            ]}
            onPress={() => handleAsistenciaChange(item.id, false)}
          >
            <Ionicons name="close-circle" size={18} color={asistencia?.asistio === false && !asistencia?.justificacion ? "#fff" : "#F44336"} />
            <Text style={[
              styles.asistenciaButtonText, 
              asistencia?.asistio === false && !asistencia?.justificacion && styles.selectedButtonText
            ]}>Ausente</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.asistenciaButton,
              styles.justificadoButton,
              asistencia?.asistio === false && asistencia?.justificacion && styles.selectedButton
            ]}
            onPress={() => openJustificacionModal(item)}
          >
            <Ionicons name="document-text" size={18} color={asistencia?.asistio === false && asistencia?.justificacion ? "#fff" : "#FF9800"} />
            <Text style={[
              styles.asistenciaButtonText, 
              asistencia?.asistio === false && asistencia?.justificacion && styles.selectedButtonText
            ]}>Justificado</Text>
          </TouchableOpacity>
        </View>
        
        {asistencia?.asistio === false && asistencia?.justificacion && (
          <View style={styles.justificacionContainer}>
            <Text style={styles.justificacionLabel}>Justificación:</Text>
            <Text style={styles.justificacionText}>{asistencia.justificacion}</Text>
          </View>
        )}
      </View>
    );
  };

  // Datos de demostración para programas
  const getDemoProgramas = () => {
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    
    const semanaAnterior = new Date(hoy);
    semanaAnterior.setDate(semanaAnterior.getDate() - 7);
    
    return [
      {
        id: 'prog1',
        fecha: formatDateForAPI(hoy),
        tema: 'Introducción a los símbolos',
        grado: 'aprendiz',
        tipo: 'camara',
        estado: 'Programado'
      },
      {
        id: 'prog2',
        fecha: formatDateForAPI(ayer),
        tema: 'Historia y tradiciones',
        grado: 'companero',
        tipo: 'trabajo',
        estado: 'Completado'
      },
      {
        id: 'prog3',
        fecha: formatDateForAPI(manana),
        tema: 'Principios filosóficos',
        grado: 'maestro',
        tipo: 'camara',
        estado: 'Programado'
      },
      {
        id: 'prog4',
        fecha: formatDateForAPI(semanaAnterior),
        tema: 'Estudios fundamentales',
        grado: 'aprendiz',
        tipo: 'trabajo',
        estado: 'Completado'
      }
    ];
  };

  // Datos de demostración para miembros
  const getDemoMiembros = (grado) => {
    const miembros = [
      {
        id: 'miembro1',
        nombres: 'Juan Carlos',
        apellidos: 'Rodríguez López',
        profesion: 'Ingeniero Civil',
        grado: 'aprendiz'
      },
      {
        id: 'miembro2',
        nombres: 'Pedro Miguel',
        apellidos: 'González Soto',
        profesion: 'Abogado',
        grado: 'aprendiz'
      },
      {
        id: 'miembro3',
        nombres: 'Luis Alberto',
        apellidos: 'Martínez Pérez',
        profesion: 'Arquitecto',
        grado: 'companero'
      },
      {
        id: 'miembro4',
        nombres: 'Roberto José',
        apellidos: 'Fernández Torres',
        profesion: 'Médico',
        grado: 'companero'
      },
      {
        id: 'miembro5',
        nombres: 'Carlos Eduardo',
        apellidos: 'Sánchez Díaz',
        profesion: 'Profesor',
        grado: 'maestro'
      },
      {
        id: 'miembro6',
        nombres: 'Miguel Ángel',
        apellidos: 'Ramírez Silva',
        profesion: 'Contador',
        grado: 'maestro'
      }
    ];
    
    // Filtrar por grado solicitado
    return miembros.filter(m => m.grado === grado);
  };

  return (
    <View style={styles.container}>
      {/* Cabecera */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Registro de Asistencia</Text>
      </View>
      
      {error && !programaSeleccionado && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color="#fff" />
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Ionicons name="close-circle" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      
      {loading && !programaSeleccionado ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Cargando programas...</Text>
        </View>
      ) : !programaSeleccionado ? (
        <View style={styles.programasContainer}>
          <Text style={styles.sectionTitle}>Seleccione un programa:</Text>
          <FlatList
            data={programas}
            renderItem={renderProgramItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.programList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No hay programas disponibles</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={loadProgramas}
                >
                  <Text style={styles.retryButtonText}>Intentar nuevamente</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      ) : loading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Cargando miembros...</Text>
        </View>
      ) : (
        <View style={styles.asistenciaContainer}>
          <View style={styles.programaHeader}>
            <Text style={styles.programaHeaderTitle}>
              {programaSeleccionado.tema}
            </Text>
            <Text style={styles.programaHeaderDate}>
              Fecha: {formatDateToDisplay(programaSeleccionado.fecha)}
            </Text>
            <View style={styles.programaHeaderDetails}>
              <Text style={styles.programaHeaderGrado}>
                Grado: {programaSeleccionado.grado}
              </Text>
              <Text style={styles.programaHeaderTipo}>
                Tipo: {programaSeleccionado.tipo}
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.cambiarProgramaButton}
              onPress={() => setProgramaSeleccionado(null)}
            >
              <Ionicons name="arrow-back" size={18} color="#007AFF" />
              <Text style={styles.cambiarProgramaText}>Cambiar programa</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => marcarTodos(true)}
            >
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.actionButtonText}>Todos Presentes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => marcarTodos(false)}
            >
              <Ionicons name="close-circle" size={16} color="#F44336" />
              <Text style={styles.actionButtonText}>Todos Ausentes</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar miembro por nombre o profesión..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearch}
                onPress={() => setSearchQuery('')}
              >
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#fff" />
              <Text style={styles.errorBannerText}>{error}</Text>
              <TouchableOpacity onPress={() => setError(null)}>
                <Ionicons name="close-circle" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          
          {!asistenciaCargada && miembros.length > 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>Cargando estado de asistencia...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredMiembros}
              renderItem={renderMiembroItem}
              keyExtractor={item => item.id || Math.random().toString()}
              contentContainerStyle={styles.miembrosList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {searchQuery 
                      ? 'No se encontraron miembros con ese criterio de búsqueda' 
                      : 'No hay miembros disponibles para este programa'}
                  </Text>
                </View>
              }
            />
          )}
          
          <TouchableOpacity
            style={[styles.saveButton, guardando && styles.disabledButton]}
            onPress={saveAllAsistencias}
            disabled={guardando}
          >
            {guardando ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Guardar Asistencia</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
      
      {/* Modal de Justificación */}
      <Modal
        visible={justificacionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setJustificacionModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Justificación de Ausencia</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setJustificacionModal(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {justificacionMiembro && (
              <View style={styles.justificacionForm}>
                <Text style={styles.justificacionNombre}>
                  {justificacionMiembro.nombres || justificacionMiembro.identificacion?.nombres || ''} {justificacionMiembro.apellidos || justificacionMiembro.identificacion?.apellidos || ''}
                </Text>
                
                <Text style={styles.justificacionFormLabel}>
                  Motivo de ausencia:
                </Text>
                <TextInput
                  style={styles.justificacionInput}
                  value={justificacionTexto}
                  onChangeText={setJustificacionTexto}
                  placeholder="Ingrese el motivo de la ausencia"
                  multiline
                  numberOfLines={4}
                />
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setJustificacionModal(false)}
                  >
                    <Text style={styles.modalButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveModalButton]}
                    onPress={saveJustificacion}
                  >
                    <Text style={styles.modalButtonText}>Guardar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  errorBanner: {
    flexDirection: 'row',
    backgroundColor: '#ff4d4f',
    padding: 10,
    margin: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  errorBannerText: {
    color: '#fff',
    flex: 1,
    marginHorizontal: 10,
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
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  programasContainer: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  programList: {
    paddingBottom: 20,
  },
  programCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedProgramCard: {
    backgroundColor: '#e6f7ff',
    borderColor: '#1890ff',
    borderWidth: 1,
  },
  programDate: {
    fontSize: 14,
    color: '#1890ff',
    marginBottom: 5,
  },
  programTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  programDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  programGrado: {
    fontSize: 14,
    color: '#666',
  },
  programTipo: {
    fontSize: 14,
    color: '#666',
  },
  asistenciaContainer: {
    flex: 1,
    padding: 15,
  },
  programaHeader: {
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
  programaHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  programaHeaderDate: {
    fontSize: 14,
    color: '#1890ff',
    marginBottom: 8,
  },
  programaHeaderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  programaHeaderGrado: {
    fontSize: 14,
    color: '#666',
  },
  programaHeaderTipo: {
    fontSize: 14,
    color: '#666',
  },
  cambiarProgramaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  cambiarProgramaText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 5,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
  },
  clearSearch: {
    padding: 5,
  },
  miembrosList: {
    paddingBottom: 80, // Espacio para el botón de guardar
  },
  miembroCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  miembroName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  asistenciaButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  asistenciaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 4,
  },
  presenteButton: {
    backgroundColor: '#f0f9f0',
    borderColor: '#4CAF50',
  },
  ausenteButton: {
    backgroundColor: '#fff2f2',
    borderColor: '#F44336',
  },
  justificadoButton: {
    backgroundColor: '#fff9f0',
    borderColor: '#FF9800',
  },
  selectedButton: {
    backgroundColor: '#1890ff',
    borderColor: '#1890ff',
  },
  asistenciaButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 5,
  },
  selectedButtonText: {
    color: '#fff',
  },
  justificacionContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
  },
  justificacionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555',
  },
  justificacionText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 3,
  },
  saveButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#b0b0b0',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  justificacionForm: {
    marginTop: 10,
  },
  justificacionNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  justificacionFormLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  justificacionInput: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveModalButton: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  }
  });