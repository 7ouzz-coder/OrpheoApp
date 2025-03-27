import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GradeNavigation from '../../components/GradeNavigation';
import { miembrosService } from '../../services/miembrosService';

export default function MiembrosScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentGrade, setCurrentGrade] = useState('aprendiz');
  
  // Lista de cargos principales
  const cargosAdministrativos = [
    'Presidente',
    'Ex Presidente',
    'Primer Vicepresidente',
    'Segundo Vicepresidente',
    'Orador',
    'Secretario',
    'Tesorero'
  ];

  // Lista de cargos docentes
  const cargosDocentes = [
    'Primer Vicepresidente',
    'Segundo Vicepresidente',
    'Orador'
  ];

  useEffect(() => {
    cargarMiembros(currentGrade);
  }, [currentGrade]);

  const cargarMiembros = async (grado) => {
    try {
      setLoading(true);
      setError(null);
      let data;
      
      switch (grado) {
        case 'aprendiz':
          data = await miembrosService.obtenerAprendices();
          break;
        case 'companero':
          data = await miembrosService.obtenerCompaneros();
          break;
        case 'maestro':
          data = await miembrosService.obtenerMaestros();
          break;
        case 'oficial':
          data = await miembrosService.obtenerOficialidad();
          break;
        default:
          data = await miembrosService.obtenerAprendices();
      }
      
      if (!data || data.length === 0) {
        if (grado === 'oficial') {
          setError('No se encontró información de oficialidad');
        } else {
          setError(`No se encontraron ${
            grado === 'aprendiz' ? 'aprendices' : 
            grado === 'companero' ? 'compañeros' : 'maestros'
          }`);
        }
      }
      
      setMiembros(data || []);
    } catch (error) {
      console.error(`Error cargando miembros (${grado}):`, error);
      setError(error?.message || `Error al cargar los miembros (${grado})`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGrade = (grado) => {
    setSearchQuery(''); // Reiniciar búsqueda al cambiar de grado
    setCurrentGrade(grado);
  };

  const calcularTiempoAprendiz = (fechaInicio, fechaPase) => {
    if (!fechaInicio || !fechaPase) return 'No disponible';
    
    try {
      // Convertir a objetos Date
      const inicio = new Date(fechaInicio);
      const pase = new Date(fechaPase);
      
      // Calcular diferencia en meses
      const meses = (pase.getFullYear() - inicio.getFullYear()) * 12 + 
                    (pase.getMonth() - inicio.getMonth());
      
      return `${meses} meses`;
    } catch (e) {
      return 'No disponible';
    }
  };

  const esAdmin = (cargo) => {
    if (!cargo) return false;
    return cargosAdministrativos.includes(cargo) || cargo === 'Presidente' || cargo === 'Secretario';
  };

  const esDocente = (cargo) => {
    if (!cargo) return false;
    return cargosDocentes.includes(cargo);
  };

  const getGradoACargo = (cargo) => {
    if (!cargo) return null;
    if (cargo === 'Primer Vicepresidente') return 'Compañeros';
    if (cargo === 'Segundo Vicepresidente') return 'Aprendices';
    if (cargo === 'Orador') return 'Maestros';
    return null;
  };

  const filteredMiembros = miembros.filter(miembro => {
    if (!miembro) return false;
    
    // Determinar qué campos usar según la estructura de datos
    let nombreCompleto, rut, profesion, cargo;
    
    if (currentGrade === 'oficial') {
      // Formato para oficialidad
      nombreCompleto = miembro.miembro ? 
        `${miembro.miembro.nombres || ''} ${miembro.miembro.apellidos || ''}` : 
        miembro.cargo || '';
      cargo = miembro.cargo || '';
      return !searchQuery || 
        nombreCompleto.toLowerCase().includes(searchQuery.toLowerCase()) || 
        cargo.toLowerCase().includes(searchQuery.toLowerCase());
    } else {
      // Formato para miembros regulares
      nombreCompleto = `${miembro.identificacion?.nombres || ''} ${miembro.identificacion?.apellidos || ''}`.toLowerCase();
      rut = miembro.identificacion?.rut?.toLowerCase() || '';
      profesion = miembro.profesional?.profesion?.toLowerCase() || '';
      cargo = miembro.taller?.cargo?.toLowerCase() || '';
      const searchText = searchQuery.toLowerCase();
      
      return !searchText || 
        nombreCompleto.includes(searchText) || 
        rut.includes(searchText) || 
        profesion.includes(searchText) ||
        cargo.includes(searchText);
    }
  });

  const renderAprendiz = ({ item }) => {
    // Verificación segura de propiedades
    const identificacion = item.identificacion || {};
    const contacto = item.contacto || {};
    const taller = item.taller || {};
    
    return (
      <TouchableOpacity
        style={styles.miembroCard}
        onPress={() => navigation.navigate('MemberDetail', { 
          memberId: item.id,
          memberData: item
        })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.nameContainer}>
            <Text style={styles.nombre}>
              {identificacion.nombres || ''} {identificacion.apellidos || ''}
            </Text>
            <Text style={styles.rut}>{identificacion.rut || 'Sin RUT'}</Text>
          </View>
          <Text style={styles.fecha}>
            Desde: {taller?.fecha_iniciacion || 'No disponible'}
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Profesión:</Text>
            <Text style={styles.infoValue}>
              {item.profesional?.profesion || 'No especificada'}
            </Text>
          </View>
        </View>

        <View style={styles.contactContainer}>
          <View style={styles.contactItem}>
            <Ionicons name="call-outline" size={16} color="#007AFF" />
            <Text style={styles.contactText}>
              {contacto?.fono_movil || 'No especificado'}
            </Text>
          </View>
          <View style={styles.contactItem}>
            <Ionicons name="mail-outline" size={16} color="#007AFF" />
            <Text style={styles.contactText}>
              {contacto?.email || 'No especificado'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCompanero = ({ item }) => {
    // Verificación segura de propiedades
    const identificacion = item.identificacion || {};
    const contacto = item.contacto || {};
    const profesional = item.profesional || {};
    const taller = item.taller || {};
    
    return (
      <TouchableOpacity
        style={styles.miembroCard}
        onPress={() => navigation.navigate('MemberDetail', { 
          memberId: item.id,
          memberData: item
        })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.nameContainer}>
            <Text style={styles.nombre}>
              {identificacion.nombres || ''} {identificacion.apellidos || ''}
            </Text>
            <Text style={styles.rut}>{identificacion.rut || 'Sin RUT'}</Text>
          </View>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Profesión:</Text>
            <Text style={styles.infoValue}>
              {profesional?.profesion || 'No especificada'}
            </Text>
          </View>
        </View>

        <View style={styles.trayectoriaContainer}>
          <Text style={styles.trayectoriaTitle}>Trayectoria:</Text>
          <View style={styles.trayectoriaRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.trayectoriaText}>
              Tiempo como Aprendiz: {calcularTiempoAprendiz(taller?.fecha_iniciacion, taller?.fecha_aumento_salario)}
            </Text>
          </View>
          <View style={styles.trayectoriaRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.trayectoriaText}>
              Pase a Compañero: {taller?.fecha_aumento_salario || 'No disponible'}
            </Text>
          </View>
        </View>

        <View style={styles.contactContainer}>
          <View style={styles.contactItem}>
            <Ionicons name="call-outline" size={16} color="#007AFF" />
            <Text style={styles.contactText}>
              {contacto?.fono_movil || 'No especificado'}
            </Text>
          </View>
          <View style={styles.contactItem}>
            <Ionicons name="mail-outline" size={16} color="#007AFF" />
            <Text style={styles.contactText}>
              {contacto?.email || 'No especificado'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMaestro = ({ item }) => {
    // Verificación segura de propiedades
    const identificacion = item.identificacion || {};
    const contacto = item.contacto || {};
    const profesional = item.profesional || {};
    const taller = item.taller || {};
    
    return (
      <TouchableOpacity
        style={[
          styles.miembroCard,
          esAdmin(taller?.cargo) && styles.maestroCardAdmin,
          esDocente(taller?.cargo) && styles.maestroCardDocente
        ]}
        onPress={() => navigation.navigate('MemberDetail', { 
          memberId: item.id,
          memberData: item
        })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.nameContainer}>
            <Text style={styles.nombre}>
              {identificacion.nombres || ''} {identificacion.apellidos || ''}
            </Text>
            <Text style={styles.rut}>{identificacion.rut || 'Sin RUT'}</Text>
          </View>
          <View style={styles.cargoContainer}>
            <Text style={styles.cargoText}>{taller?.cargo || 'Sin cargo'}</Text>
            {esAdmin(taller?.cargo) && (
              <View style={styles.adminBadge}>
                <Text style={styles.badgeText}>Admin</Text>
              </View>
            )}
            {esDocente(taller?.cargo) && (
              <View style={styles.docenteBadge}>
                <Text style={styles.badgeText}>Docente</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Profesión:</Text>
            <Text style={styles.infoValue}>
              {profesional?.profesion || 'No especificada'}
            </Text>
          </View>
        </View>

        <View style={styles.trayectoriaContainer}>
          <Text style={styles.trayectoriaTitle}>Trayectoria:</Text>
          <View style={styles.trayectoriaRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.trayectoriaText}>
              Inicio: {taller?.fecha_iniciacion || 'No disponible'}
            </Text>
          </View>
          <View style={styles.trayectoriaRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.trayectoriaText}>
              Pase a Compañero: {taller?.fecha_aumento_salario || 'No disponible'}
            </Text>
          </View>
          <View style={styles.trayectoriaRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.trayectoriaText}>
              Pase a Maestro: {taller?.fecha_exaltacion || 'No disponible'}
            </Text>
          </View>
        </View>

        {esDocente(taller?.cargo) && (
          <View style={styles.docenteContainer}>
            <Text style={styles.docenteTitle}>
              <Ionicons name="school-outline" size={16} color="#4CAF50" /> Docencia
            </Text>
            <Text style={styles.docenteInfo}>
              A cargo de: {getGradoACargo(taller?.cargo) || 'No especificado'}
            </Text>
          </View>
        )}

        <View style={styles.contactContainer}>
          <View style={styles.contactItem}>
            <Ionicons name="call-outline" size={16} color="#007AFF" />
            <Text style={styles.contactText}>
              {contacto?.fono_movil || 'No especificado'}
            </Text>
          </View>
          <View style={styles.contactItem}>
            <Ionicons name="mail-outline" size={16} color="#007AFF" />
            <Text style={styles.contactText}>
              {contacto?.email || 'No especificado'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderOficial = ({ item }) => {
    // Para oficiales, el formato es diferente
    if (!item) return null;
    
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.oficialCard,
          item.es_admin && styles.oficialCardAdmin,
          item.es_docente && styles.oficialCardDocente
        ]}
        onPress={() => navigation.navigate('MemberDetail', { 
          memberId: item.miembro?.id,
          memberData: { ...item.miembro, cargo: item.cargo }
        })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cargoText}>{item.cargo || 'Sin cargo'}</Text>
          <View style={styles.badgesContainer}>
            {item.es_admin && (
              <View style={[styles.badge, styles.adminBadge]}>
                <Text style={styles.badgeText}>Admin</Text>
              </View>
            )}
            {item.es_docente && (
              <View style={[styles.badge, styles.docenteBadge]}>
                <Text style={styles.badgeText}>Docente</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.nombre}>{item.miembro ? `${item.miembro.nombres || ''} ${item.miembro.apellidos || ''}` : 'No asignado'}</Text>

        {item.es_docente && item.grado_a_cargo && (
          <View style={styles.docenteInfo}>
            <Ionicons name="school-outline" size={16} color="#4CAF50" />
            <Text style={styles.gradoCargoText}>
              A cargo de: {item.grado_a_cargo}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderMiembro = ({ item }) => {
    if (!item) return null;
    
    switch (currentGrade) {
      case 'aprendiz':
        return renderAprendiz({ item });
      case 'companero':
        return renderCompanero({ item });
      case 'maestro':
        return renderMaestro({ item });
      case 'oficial':
        return renderOficial({ item });
      default:
        return renderAprendiz({ item });
    }
  };

  const renderListEmptyComponent = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => cargarMiembros(currentGrade)}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          No se encontraron {
            currentGrade === 'aprendiz' ? 'aprendices' : 
            currentGrade === 'companero' ? 'compañeros' : 
            currentGrade === 'maestro' ? 'maestros' : 'oficiales'
          }
        </Text>
        {currentGrade === 'oficial' && (
          <Text style={styles.emptySubText}>
            Es posible que aún no esté configurada la información de oficialidad en el sistema
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <GradeNavigation onSelectGrade={handleSelectGrade} currentGrade={currentGrade} />
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Buscar ${
            currentGrade === 'aprendiz' ? 'aprendices' : 
            currentGrade === 'companero' ? 'compañeros' : 
            currentGrade === 'maestro' ? 'maestros' : 'oficiales'
          }...`}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            Cargando {
              currentGrade === 'aprendiz' ? 'aprendices' : 
              currentGrade === 'companero' ? 'compañeros' : 
              currentGrade === 'maestro' ? 'maestros' : 'oficiales'
            }...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMiembros}
          renderItem={renderMiembro}
          keyExtractor={item => item.id || Math.random().toString()}
          contentContainerStyle={styles.listContainer}
          onRefresh={() => cargarMiembros(currentGrade)}
          refreshing={loading}
          ListEmptyComponent={renderListEmptyComponent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  listContainer: {
    padding: 10,
    flexGrow: 1,
  },
  miembroCard: {
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
  maestroCardAdmin: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  maestroCardDocente: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  oficialCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  oficialCardAdmin: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  oficialCardDocente: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  nameContainer: {
    flex: 1,
    marginRight: 10,
  },
  nombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  rut: {
    fontSize: 14,
    color: '#666',
  },
  fecha: {
    fontSize: 14,
    color: '#666',
  },
  cargoContainer: {
    alignItems: 'flex-end',
  },
  cargoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  badgesContainer: {
    flexDirection: 'row',
    marginTop: 5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 5,
  },
  adminBadge: {
    backgroundColor: '#007AFF',
  },
  docenteBadge: {
    backgroundColor: '#4CAF50',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoLabel: {
    width: 80,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  trayectoriaContainer: {
    backgroundColor: '#e8f4ff',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  trayectoriaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  trayectoriaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  trayectoriaText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  docenteContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  docenteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 5,
  },
  docenteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  gradoCargoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  contactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#007AFF',
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
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 300,
  },
  errorText: {
    fontSize: 16,
    color: '#ff4d4f',
    textAlign: 'center',
    marginBottom: 20,
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});