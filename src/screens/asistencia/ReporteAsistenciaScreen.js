// src/screens/asistencia/ReporteAsistenciaScreen.js
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
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { asistenciaService } from '../../services/asistenciaService';
import { miembrosService } from '../../services/miembrosService';

export default function ReporteAsistenciaScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [miembros, setMiembros] = useState([]);
  const [reporte, setReporte] = useState(null);
  const [miembroSeleccionado, setMiembroSeleccionado] = useState(null);
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)));
  const [fechaFin, setFechaFin] = useState(new Date());
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [currentDateField, setCurrentDateField] = useState(null); // 'inicio' o 'fin'
  const [filtroGrado, setFiltroGrado] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMiembroDetails, setShowMiembroDetails] = useState(false);
  const [miembroDetalles, setMiembroDetalles] = useState(null);

  // Cargar miembros al iniciar
  useEffect(() => {
    loadMiembros();
  }, []);

  // Cargar miembros según el filtro de grado
  const loadMiembros = async () => {
    setLoading(true);
    try {
      let data;
      if (filtroGrado === 'todos') {
        data = await miembrosService.obtenerTodosMiembros();
      } else {
        data = await miembrosService.obtenerMiembrosPorGrado(filtroGrado);
      }
      
      // Si no hay datos o hay un error, usar datos de demo
      if (!data || data.length === 0) {
        data = getDemoMiembros(filtroGrado);
      }
      
      setMiembros(data);
    } catch (error) {
      console.error('Error cargando miembros:', error);
      Alert.alert('Error', 'No se pudieron cargar los miembros');
      
      // Usar datos de demo en caso de error
      const demoMiembros = getDemoMiembros(filtroGrado);
      setMiembros(demoMiembros);
    } finally {
      setLoading(false);
    }
  };

  // Generar reporte de asistencia
  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
      const fechaFinStr = fechaFin.toISOString().split('T')[0];
      
      // Si hay un miembro seleccionado, obtener su historial específico
      if (miembroSeleccionado) {
        try {
          const historial = await asistenciaService.obtenerHistorialMiembro(miembroSeleccionado.id);
          
          // Filtrar por el rango de fechas
          const historialFiltrado = historial.filter(item => {
            const fecha = new Date(item.evento.fecha);
            return fecha >= fechaInicio && fecha <= fechaFin;
          });
          
          setReporte({
            tipo: 'individual',
            miembro: miembroSeleccionado,
            periodo: { fechaInicio: fechaInicioStr, fechaFin: fechaFinStr },
            asistencias: historialFiltrado
          });
        } catch (error) {
          console.error('Error obteniendo historial:', error);
          
          // Usar datos de demo para el historial
          const demoHistorial = getDemoHistorialMiembro(miembroSeleccionado.id);
          const historialFiltrado = demoHistorial.filter(item => {
            const fecha = new Date(item.evento.fecha);
            return fecha >= fechaInicio && fecha <= fechaFin;
          });
          
          setReporte({
            tipo: 'individual',
            miembro: miembroSeleccionado,
            periodo: { fechaInicio: fechaInicioStr, fechaFin: fechaFinStr },
            asistencias: historialFiltrado
          });
        }
      } else {
        // Generar reporte general según filtro de grado
        const gradoFiltro = filtroGrado === 'todos' ? null : filtroGrado;
        try {
          const reporteGeneral = await asistenciaService.generarReporteAsistencia(
            fechaInicioStr,
            fechaFinStr,
            gradoFiltro
          );
          
          setReporte({
            tipo: 'general',
            ...reporteGeneral
          });
        } catch (error) {
          console.error('Error generando reporte general:', error);
          
          // Usar datos de demo para el reporte general
          const demoReporte = getDemoReporteGeneral(fechaInicioStr, fechaFinStr, gradoFiltro);
          setReporte({
            tipo: 'general',
            ...demoReporte
          });
        }
      }
    } catch (error) {
      console.error('Error generando reporte:', error);
      Alert.alert('Error', 'No se pudo generar el reporte de asistencia');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Ver detalles de asistencia de un miembro
  const verDetallesMiembro = (miembro) => {
    if (!reporte || reporte.tipo !== 'general') return;
    
    const datosMiembro = reporte.reporte.find(item => item.miembro.id === miembro.id);
    if (datosMiembro) {
      setMiembroDetalles(datosMiembro);
      setShowMiembroDetails(true);
    }
  };

  // Mostrar el selector de fecha personalizado
  const showDatePicker = (field) => {
    setCurrentDateField(field);
    setShowDatePickerModal(true);
  };

  // Seleccionar fecha desde el selector personalizado
  const handleDateSelect = (year, month, day) => {
    const selectedDate = new Date(year, month, day);
    
    if (currentDateField === 'inicio') {
      setFechaInicio(selectedDate);
    } else if (currentDateField === 'fin') {
      setFechaFin(selectedDate);
    }
    
    setShowDatePickerModal(false);
  };

  // Filtrar miembros por búsqueda
  const filteredMiembros = searchQuery
    ? miembros.filter(m => 
        `${m.nombres || ''} ${m.apellidos || ''}`.toLowerCase().includes(searchQuery.toLowerCase()))
    : miembros;

  // Formatear fecha para mostrar
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  // Renderizar item de miembro para selección
  const renderMiembroItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.miembroCard,
        miembroSeleccionado?.id === item.id && styles.selectedMiembroCard
      ]}
      onPress={() => setMiembroSeleccionado(item === miembroSeleccionado ? null : item)}
    >
      <Text style={styles.miembroName}>{item.nombres} {item.apellidos}</Text>
      <Text style={styles.miembroGrado}>Grado: {item.grado}</Text>
    </TouchableOpacity>
  );

  // Renderizar resumen de asistencia de un miembro en el reporte general
  const renderResumenMiembro = ({ item }) => {
    const porcentaje = item.estadisticas.porcentajeAsistencia.toFixed(1);
    let statusColor;
    
    if (porcentaje >= 80) statusColor = '#4CAF50';
    else if (porcentaje >= 60) statusColor = '#FF9800';
    else statusColor = '#F44336';
    
    return (
      <TouchableOpacity
        style={styles.resumenCard}
        onPress={() => verDetallesMiembro(item.miembro)}
      >
        <View style={styles.resumenHeader}>
          <Text style={styles.resumenName}>{item.miembro.nombres} {item.miembro.apellidos}</Text>
          <View style={[styles.porcentajeIndicator, { backgroundColor: statusColor }]}>
            <Text style={styles.porcentajeText}>{porcentaje}%</Text>
          </View>
        </View>
        
        <View style={styles.asistenciaStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total:</Text>
            <Text style={styles.statValue}>{item.estadisticas.total}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Asistencias:</Text>
            <Text style={styles.statValue}>{item.estadisticas.asistidas}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Justificadas:</Text>
            <Text style={styles.statValue}>{item.estadisticas.justificadas}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Sin justificar:</Text>
            <Text style={styles.statValue}>{item.estadisticas.faltasInjustificadas}</Text>
          </View>
        </View>
        
        <Text style={styles.verDetalles}>
          <Ionicons name="chevron-forward" size={14} /> Ver detalles
        </Text>
      </TouchableOpacity>
    );
  };

  // Renderizar asistencia individual en el reporte individual
  const renderAsistenciaItem = ({ item }) => (
    <View style={styles.asistenciaCard}>
      <View style={styles.asistenciaHeader}>
        <Text style={styles.asistenciaFecha}>{formatDate(item.evento.fecha)}</Text>
        <View style={[
          styles.asistenciaStatus,
          item.asistio ? styles.asistenciaPresente : 
            (item.justificacion ? styles.asistenciaJustificada : styles.asistenciaAusente)
        ]}>
          <Text style={styles.asistenciaStatusText}>
            {item.asistio ? 'Presente' : (item.justificacion ? 'Justificado' : 'Ausente')}
          </Text>
        </View>
      </View>
      
      <Text style={styles.eventoTema}>{item.evento.tema}</Text>
      <Text style={styles.eventoInfo}>
        <Text style={styles.boldText}>Grado:</Text> {item.evento.grado} | 
        <Text style={styles.boldText}> Tipo:</Text> {item.evento.tipo}
      </Text>
      
      {item.justificacion && (
        <View style={styles.justificacionContainer}>
          <Text style={styles.justificacionLabel}>Justificación:</Text>
          <Text style={styles.justificacionText}>{item.justificacion}</Text>
        </View>
      )}
    </View>
  );
  
  // Componente de selector de fecha personalizado compatible con Expo Go
  const SimpleDatePicker = ({ visible, onClose, onSelect, initialDate }) => {
    const [year, setYear] = useState(initialDate.getFullYear());
    const [month, setMonth] = useState(initialDate.getMonth());
    const [day, setDay] = useState(initialDate.getDate());
    
    const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const days = Array.from(
      { length: new Date(year, month + 1, 0).getDate() }, 
      (_, i) => i + 1
    );
    
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.datePickerModalContainer}>
          <View style={styles.datePickerContent}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Seleccionar Fecha</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.datePickerSelectors}>
              <View style={styles.datePickerSelector}>
                <Text style={styles.datePickerLabel}>Año</Text>
                <FlatList
                  style={styles.datePickerScrollView}
                  data={years}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.datePickerOption,
                        item === year && styles.datePickerOptionSelected
                      ]}
                      onPress={() => setYear(item)}
                    >
                      <Text 
                        style={[
                          styles.datePickerOptionText,
                          item === year && styles.datePickerOptionTextSelected
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={item => item.toString()}
                />
              </View>
              
              <View style={styles.datePickerSelector}>
                <Text style={styles.datePickerLabel}>Mes</Text>
                <FlatList
                  style={styles.datePickerScrollView}
                  data={months.map((name, index) => ({ name, index }))}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.datePickerOption,
                        item.index === month && styles.datePickerOptionSelected
                      ]}
                      onPress={() => {
                        setMonth(item.index);
                        // Ajustar el día si excede el máximo del nuevo mes
                        const maxDays = new Date(year, item.index + 1, 0).getDate();
                        if (day > maxDays) setDay(maxDays);
                      }}
                    >
                      <Text 
                        style={[
                          styles.datePickerOptionText,
                          item.index === month && styles.datePickerOptionTextSelected
                        ]}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={item => item.name}
                />
              </View>
              
              <View style={styles.datePickerSelector}>
                <Text style={styles.datePickerLabel}>Día</Text>
                <FlatList
                  style={styles.datePickerScrollView}
                  data={days}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.datePickerOption,
                        item === day && styles.datePickerOptionSelected
                      ]}
                      onPress={() => setDay(item)}
                    >
                      <Text 
                        style={[
                          styles.datePickerOptionText,
                          item === day && styles.datePickerOptionTextSelected
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={item => item.toString()}
                />
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.datePickerConfirmButton}
              onPress={() => onSelect(year, month, day)}
            >
              <Text style={styles.datePickerConfirmButtonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Cabecera */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reportes de Asistencia</Text>
      </View>
      
      {/* Filtros y controles */}
      <FlatList
        ListHeaderComponent={
          <>
            <View style={styles.dateRangeContainer}>
              <Text style={styles.sectionTitle}>Rango de fechas:</Text>
              
              <View style={styles.datePickerRow}>
                <Text style={styles.dateLabel}>Desde:</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => showDatePicker('inicio')}
                >
                  <Text style={styles.dateButtonText}>{formatDate(fechaInicio.toISOString())}</Text>
                  <Ionicons name="calendar" size={18} color="#007AFF" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.datePickerRow}>
                <Text style={styles.dateLabel}>Hasta:</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => showDatePicker('fin')}
                >
                  <Text style={styles.dateButtonText}>{formatDate(fechaFin.toISOString())}</Text>
                  <Ionicons name="calendar" size={18} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.gradoFilterContainer}>
              <Text style={styles.sectionTitle}>Filtrar por grado:</Text>
              <View style={styles.gradoButtons}>
                <TouchableOpacity 
                  style={[styles.gradoButton, filtroGrado === 'todos' && styles.gradoButtonSelected]}
                  onPress={() => setFiltroGrado('todos')}
                >
                  <Text style={[styles.gradoButtonText, filtroGrado === 'todos' && styles.gradoButtonTextSelected]}>
                    Todos
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.gradoButton, filtroGrado === 'aprendiz' && styles.gradoButtonSelected]}
                  onPress={() => setFiltroGrado('aprendiz')}
                >
                  <Text style={[styles.gradoButtonText, filtroGrado === 'aprendiz' && styles.gradoButtonTextSelected]}>
                    Aprendices
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.gradoButton, filtroGrado === 'companero' && styles.gradoButtonSelected]}
                  onPress={() => setFiltroGrado('companero')}
                >
                  <Text style={[styles.gradoButtonText, filtroGrado === 'companero' && styles.gradoButtonTextSelected]}>
                    Compañeros
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.gradoButton, filtroGrado === 'maestro' && styles.gradoButtonSelected]}
                  onPress={() => setFiltroGrado('maestro')}
                >
                  <Text style={[styles.gradoButtonText, filtroGrado === 'maestro' && styles.gradoButtonTextSelected]}>
                    Maestros
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.miembroFilterContainer}>
              <View style={styles.miembroFilterHeader}>
                <Text style={styles.sectionTitle}>Miembro específico (opcional):</Text>
                {miembroSeleccionado && (
                  <TouchableOpacity 
                    style={styles.clearSelectionButton}
                    onPress={() => setMiembroSeleccionado(null)}
                  >
                    <Text style={styles.clearSelectionText}>Limpiar selección</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar miembro..."
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
              
              {loading ? (
                <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
              ) : (
                <FlatList
                  data={filteredMiembros}
                  renderItem={renderMiembroItem}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.miembrosList}
                  horizontal={false}
                  numColumns={2}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>No se encontraron miembros</Text>
                  }
                />
              )}
            </View>
            
            <TouchableOpacity
              style={[styles.generateButton, generatingReport && styles.disabledButton]}
              onPress={generateReport}
              disabled={generatingReport}
            >
              {generatingReport ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="stats-chart" size={20} color="#fff" />
                  <Text style={styles.generateButtonText}>Generar Reporte</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        }
        ListFooterComponent={
          reporte && (
            <View style={styles.reporteContainer}>
              <View style={styles.reporteHeader}>
                <Text style={styles.reporteTitle}>
                  {reporte.tipo === 'individual' 
                    ? `Reporte de ${reporte.miembro.nombres} ${reporte.miembro.apellidos}` 
                    : 'Reporte General de Asistencia'}
                </Text>
                <Text style={styles.reportePeriodo}>
                  Período: {formatDate(reporte.periodo.fechaInicio)} - {formatDate(reporte.periodo.fechaFin)}
                </Text>
              </View>
              
              {reporte.tipo === 'individual' ? (
                <>
                  <View style={styles.resumenContainer}>
                    <Text style={styles.resumenTitle}>Resumen de Asistencia:</Text>
                    <View style={styles.asistenciaStats}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Total eventos:</Text>
                        <Text style={styles.statValue}>{reporte.asistencias.length}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Asistencias:</Text>
                        <Text style={styles.statValue}>
                          {reporte.asistencias.filter(a => a.asistio).length}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Justificadas:</Text>
                        <Text style={styles.statValue}>
                          {reporte.asistencias.filter(a => !a.asistio && a.justificacion).length}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Sin justificar:</Text>
                        <Text style={styles.statValue}>
                          {reporte.asistencias.filter(a => !a.asistio && !a.justificacion).length}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <FlatList
                    data={reporte.asistencias}
                    renderItem={renderAsistenciaItem}
                    keyExtractor={item => `${item.evento.id}-${reporte.miembro.id}`}
                    contentContainerStyle={styles.asistenciasList}
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>No hay registros de asistencia en este período</Text>
                    }
                  />
                </>
              ) : (
                <>
                  <View style={styles.resumenGeneralContainer}>
                    <Text style={styles.resumenTitle}>Resumen General:</Text>
                    <View style={styles.statsGeneralContainer}>
                      <View style={styles.statGeneralItem}>
                        <Text style={styles.statGeneralLabel}>Total miembros:</Text>
                        <Text style={styles.statGeneralValue}>{reporte.reporte.length}</Text>
                      </View>
                      <View style={styles.statGeneralItem}>
                        <Text style={styles.statGeneralLabel}>Total eventos:</Text>
                        <Text style={styles.statGeneralValue}>{reporte.eventos.length}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <FlatList
                    data={reporte.reporte}
                    renderItem={renderResumenMiembro}
                    keyExtractor={item => item.miembro.id}
                    contentContainerStyle={styles.resumenList}
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>No hay datos de asistencia para mostrar</Text>
                    }
                  />
                </>
              )}
            </View>
          )
        }
        style={styles.filtersContainer}
        contentContainerStyle={{ 
          paddingBottom: 20,
          flexGrow: reporte ? 0 : 1
        }}
      />
      
      {/* Modal de detalles de miembro */}
      <Modal
        visible={showMiembroDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMiembroDetails(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle de Asistencia</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowMiembroDetails(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {miembroDetalles && (
              <FlatList
                style={styles.modalBody}
                ListHeaderComponent={
                  <>
                    <Text style={styles.modalMiembroName}>
                      {miembroDetalles.miembro.nombres} {miembroDetalles.miembro.apellidos}
                    </Text>
                    
                    <View style={styles.resumenAsistenciaModal}>
                      <Text style={styles.resumenModalTitle}>Resumen de Asistencia:</Text>
                      <View style={styles.asistenciaStats}>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Total eventos:</Text>
                          <Text style={styles.statValue}>{miembroDetalles.estadisticas.total}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Asistencias:</Text>
                          <Text style={styles.statValue}>{miembroDetalles.estadisticas.asistidas}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Justificadas:</Text>
                          <Text style={styles.statValue}>{miembroDetalles.estadisticas.justificadas}</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Sin justificar:</Text>
                          <Text style={styles.statValue}>
                            {miembroDetalles.estadisticas.faltasInjustificadas}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.porcentajeContainer}>
                        <Text style={styles.porcentajeLabel}>Porcentaje de asistencia:</Text>
                        <Text style={styles.porcentajeValue}>
                          {miembroDetalles.estadisticas.porcentajeAsistencia.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={styles.detalleEventosTitle}>Detalle por Evento:</Text>
                  </>
                }
                data={miembroDetalles.asistencias}
                renderItem={({ item, index }) => (
                  <View style={styles.detalleEventoItem}>
                    <View style={styles.detalleEventoHeader}>
                      <Text style={styles.detalleEventoFecha}>
                        {formatDate(item.fecha)}
                      </Text>
                      <View style={[
                        styles.detalleEventoStatus,
                        item.asistio ? styles.statusPresente : 
                          (item.justificado ? styles.statusJustificado : styles.statusAusente)
                      ]}>
                        <Text style={styles.detalleEventoStatusText}>
                          {item.asistio ? 'Presente' : 
                            (item.justificado ? 'Justificado' : 'Ausente')}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={styles.detalleEventoTema}>{item.tema}</Text>
                  </View>
                )}
                keyExtractor={(item, index) => index.toString()}
              />
            )}
          </View>
        </View>
      </Modal>
      
      {/* Modal de selector de fecha personalizado */}
      <SimpleDatePicker
        visible={showDatePickerModal}
        onClose={() => setShowDatePickerModal(false)}
        onSelect={handleDateSelect}
        initialDate={currentDateField === 'inicio' ? fechaInicio : fechaFin}
      />
    </View>
  );
}

// Funciones auxiliares para generar datos de demostración

// Generar miembros de ejemplo
function getDemoMiembros(grado = null) {
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
  
  // Filtrar por grado si se especifica
  if (grado && grado !== 'todos') {
    return miembros.filter(m => m.grado === grado);
  }
  
  return miembros;
}

// Generar historial de asistencia para un miembro
function getDemoHistorialMiembro(miembroId) {
  // Datos de eventos de ejemplo
  const eventos = [
    {
      id: 'event1',
      fecha: '2025-02-15',
      tema: 'Introducción a los símbolos',
      grado: 'aprendiz',
      tipo: 'camara'
    },
    {
      id: 'event2',
      fecha: '2025-02-22',
      tema: 'Historia y tradiciones',
      grado: 'companero',
      tipo: 'trabajo'
    },
    {
      id: 'event3',
      fecha: '2025-03-01',
      tema: 'Principios filosóficos',
      grado: 'maestro',
      tipo: 'camara'
    },
    {
      id: 'event4',
      fecha: '2025-03-08',
      tema: 'Estudios fundamentales',
      grado: 'aprendiz',
      tipo: 'trabajo'
    }
  ];
  
  // Generar asistencias aleatorias
  return eventos.map(evento => {
    const asistio = Math.random() > 0.3; // 70% de probabilidad de asistir
    const justificacion = !asistio && Math.random() > 0.5 
      ? 'Justificación por motivos personales'
      : null;
    
    return {
      id: `asist-${evento.id}-${miembroId}`,
      evento_id: evento.id,
      miembro_id: miembroId,
      asistio,
      justificacion,
      evento
    };
  });
}

// Generar reporte general de ejemplo
function getDemoReporteGeneral(fechaInicio, fechaFin, grado = null) {
  // Eventos en el rango de fechas
  const eventos = [
    {
      id: 'event1',
      fecha: '2025-02-15',
      tema: 'Introducción a los símbolos',
      grado: 'aprendiz',
      tipo: 'camara'
    },
    {
      id: 'event2',
      fecha: '2025-02-22',
      tema: 'Historia y tradiciones',
      grado: 'companero',
      tipo: 'trabajo'
    },
    {
      id: 'event3',
      fecha: '2025-03-01',
      tema: 'Principios filosóficos',
      grado: 'maestro',
      tipo: 'camara'
    },
    {
      id: 'event4',
      fecha: '2025-03-08',
      tema: 'Estudios fundamentales',
      grado: 'aprendiz',
      tipo: 'trabajo'
    }
  ];
  
  // Filtrar eventos por grado si es necesario
  const filteredEventos = grado 
    ? eventos.filter(e => e.grado === grado)
    : eventos;
  
  // Miembros (filtrados por grado si es necesario)
  const miembros = getDemoMiembros(grado);
  
  // Generar reporte para cada miembro
  const reporte = miembros.map(miembro => {
    // Generar asistencias aleatorias para los eventos
    const asistencias = filteredEventos.map(evento => {
      const asistio = Math.random() > 0.2; // 80% de probabilidad de asistir
      const justificado = !asistio && Math.random() > 0.5; // 50% de justificar si no asistió
      
      return {
        evento_id: evento.id,
        fecha: evento.fecha,
        tema: evento.tema,
        asistio,
        justificado
      };
    });
    
    // Calcular estadísticas
    const total = asistencias.length;
    const asistidas = asistencias.filter(a => a.asistio).length;
    const justificadas = asistencias.filter(a => !a.asistio && a.justificado).length;
    const faltasInjustificadas = total - asistidas - justificadas;
    
    return {
      miembro,
      asistencias,
      estadisticas: {
        total,
        asistidas,
        justificadas,
        faltasInjustificadas,
        porcentajeAsistencia: total > 0 ? (asistidas / total) * 100 : 0
      }
    };
  });
  
  return {
    periodo: { fechaInicio, fechaFin },
    eventos: filteredEventos,
    reporte
  };
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
  filtersContainer: {
    flex: 1,
  },
  dateRangeContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    margin: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateLabel: {
    width: 60,
    fontSize: 15,
    color: '#555',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
  },
  dateButtonText: {
    fontSize: 15,
    color: '#333',
  },
  gradoFilterContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    margin: 15,
    marginTop: 5,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  gradoButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  gradoButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    marginBottom: 10,
  },
  gradoButtonSelected: {
    backgroundColor: '#007AFF',
  },
  gradoButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  gradoButtonTextSelected: {
    color: '#fff',
  },
  miembroFilterContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    margin: 15,
    marginTop: 5,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  miembroFilterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  clearSelectionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  clearSelectionText: {
    color: '#666',
    fontSize: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
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
    paddingBottom: 10,
  },
  miembroCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    marginHorizontal: 5,
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  selectedMiembroCard: {
    backgroundColor: '#e6f2ff',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  miembroName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  miembroGrado: {
    fontSize: 12,
    color: '#666',
  },
  loader: {
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginVertical: 20,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    margin: 15,
    marginTop: 5,
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#b0b0b0',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  reporteContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    margin: 15,
    marginTop: 0,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  reporteHeader: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reporteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  reportePeriodo: {
    fontSize: 14,
    color: '#666',
  },
  resumenContainer: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
  },
  resumenTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  asistenciaStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 5,
  },
  statItem: {
    width: '50%',
    paddingVertical: 5,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  asistenciasList: {
    padding: 15,
  },
  asistenciaCard: {
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
  asistenciaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  asistenciaFecha: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  asistenciaStatus: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  asistenciaPresente: {
    backgroundColor: '#E8F5E9',
  },
  asistenciaJustificada: {
    backgroundColor: '#FFF8E1',
  },
  asistenciaAusente: {
    backgroundColor: '#FFEBEE',
  },
  asistenciaStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  eventoTema: {
    fontSize: 15,
    color: '#333',
    marginBottom: 5,
  },
  eventoInfo: {
    fontSize: 13,
    color: '#666',
  },
  boldText: {
    fontWeight: 'bold',
  },
  justificacionContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
  },
  justificacionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 3,
  },
  justificacionText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  resumenGeneralContainer: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
  },
  statsGeneralContainer: {
    flexDirection: 'row',
  },
  statGeneralItem: {
    width: '50%',
  },
  statGeneralLabel: {
    fontSize: 13,
    color: '#666',
  },
  statGeneralValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  resumenList: {
    padding: 15,
  },
  resumenCard: {
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
  resumenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resumenName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  porcentajeIndicator: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  porcentajeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  verDetalles: {
    fontSize: 13,
    color: '#007AFF',
    textAlign: 'right',
    marginTop: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
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
    padding: 15,
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
  modalBody: {
    padding: 15,
    maxHeight: '80%',
  },
  modalMiembroName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  resumenAsistenciaModal: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  resumenModalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  porcentajeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  porcentajeLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  porcentajeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  detalleEventosTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  detalleEventoItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  detalleEventoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  detalleEventoFecha: {
    fontSize: 14,
    color: '#333',
  },
  detalleEventoStatus: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  statusPresente: {
    backgroundColor: '#E8F5E9',
  },
  statusJustificado: {
    backgroundColor: '#FFF8E1',
  },
  statusAusente: {
    backgroundColor: '#FFEBEE',
  },
  detalleEventoStatusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  detalleEventoTema: {
    fontSize: 14,
    color: '#555',
  }
});