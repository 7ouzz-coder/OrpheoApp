import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MemberDetailScreen({ route }) {
  const { memberData } = route.params || {};
  const userGrado = global.userGrado || 'aprendiz';
  const isAdmin = global.userRole === 'admin';
  const isOficialidad = global.userCargo && global.userCargo.trim() !== '';

  // Verificar si tenemos datos antes de renderizar
  if (!memberData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando información...</Text>
      </View>
    );
  }

  // Función para determinar si el usuario puede ver información detallada
  const canViewFullDetails = () => {
    if (isAdmin || isOficialidad) return true; // Los admins y oficialidad ven todo
    
    // Un usuario puede ver detalles completos de grados menores o iguales
    const gradoValues = {
      'aprendiz': 1,
      'companero': 2,
      'maestro': 3
    };

    // Cuando el grado viene de memberData.grado, puede estar como string directo o dentro de un objeto taller
    let memberGrado = '';
    
    if (memberData.grado) {
      // Si el grado viene directamente como propiedad
      memberGrado = memberData.grado;
    } else if (memberData.taller && memberData.taller.grado) {
      // Si el grado viene dentro de un objeto taller
      memberGrado = memberData.taller.grado;
    } else {
      // Intentar determinarlo por las fechas
      if (memberData.taller) {
        if (memberData.taller.fecha_exaltacion) {
          memberGrado = 'maestro';
        } else if (memberData.taller.fecha_aumento_salario) {
          memberGrado = 'companero';
        } else {
          memberGrado = 'aprendiz';
        }
      } else {
        // Si no hay información suficiente, consideramos que es maestro por seguridad
        memberGrado = 'maestro';
      }
    }

    const userGradoValue = gradoValues[userGrado.toLowerCase()] || 1;
    const memberGradoValue = gradoValues[memberGrado.toString().toLowerCase()] || 3;

    return userGradoValue >= memberGradoValue;
  };

  // Extraer información del miembro de forma segura
  const getNombreCompleto = () => {
    if (memberData.nombreCompleto) {
      return memberData.nombreCompleto;
    }
    
    if (memberData.identificacion) {
      const nombres = memberData.identificacion.nombres || '';
      const apellidos = memberData.identificacion.apellidos || '';
      return `${nombres} ${apellidos}`.trim();
    }
    
    return 'Sin nombre';
  };

  const getGrado = () => {
    if (memberData.grado) {
      return memberData.grado;
    }
    
    if (memberData.taller) {
      if (memberData.taller.fecha_exaltacion) {
        return 'Maestro';
      } else if (memberData.taller.fecha_aumento_salario) {
        return 'Compañero';
      } else {
        return 'Aprendiz';
      }
    }
    
    return 'No especificado';
  };

  const getCargo = () => {
    if (memberData.cargo) {
      return memberData.cargo;
    }
    
    if (memberData.taller && memberData.taller.cargo) {
      return memberData.taller.cargo;
    }
    
    return '';
  };

  const getTelefono = () => {
    if (memberData.telefono1) {
      return memberData.telefono1;
    }
    
    if (memberData.contacto && memberData.contacto.fono_movil) {
      return memberData.contacto.fono_movil;
    }
    
    return 'No especificado';
  };

  const getEmail = () => {
    if (memberData.email1) {
      return memberData.email1;
    }
    
    if (memberData.contacto && memberData.contacto.email) {
      return memberData.contacto.email;
    }
    
    return 'No especificado';
  };

  const getRut = () => {
    if (memberData.rut) {
      return memberData.rut;
    }
    
    if (memberData.identificacion && memberData.identificacion.rut) {
      return memberData.identificacion.rut;
    }
    
    return 'No especificado';
  };

  const getProfesion = () => {
    if (memberData.profesion) {
      return memberData.profesion;
    }
    
    if (memberData.profesional && memberData.profesional.profesion) {
      return memberData.profesional.profesion;
    }
    
    return 'No especificada';
  };

  const getOcupacion = () => {
    if (memberData.ocupacion) {
      return memberData.ocupacion;
    }
    
    if (memberData.profesional && memberData.profesional.cargo) {
      return memberData.profesional.cargo;
    }
    
    return 'No especificada';
  };

  const getDireccion = () => {
    if (memberData.direccion) {
      return memberData.direccion;
    }
    
    if (memberData.contacto && memberData.contacto.direccion) {
      return memberData.contacto.direccion;
    }
    
    return 'No especificada';
  };

  const getFechaNacimiento = () => {
    if (memberData.fechaNacimiento) {
      return memberData.fechaNacimiento;
    }
    
    if (memberData.identificacion && memberData.identificacion.fecha_nacimiento) {
      return memberData.identificacion.fecha_nacimiento;
    }
    
    return 'No especificada';
  };

  const getTelefono2 = () => {
    if (memberData.telefono2) {
      return memberData.telefono2;
    }
    
    if (memberData.contacto && memberData.contacto.fono_residencia) {
      return memberData.contacto.fono_residencia;
    }
    
    return '';
  };

  const getNombrePareja = () => {
    if (memberData.nombrePareja) {
      return memberData.nombrePareja;
    }
    
    if (memberData.familiar && memberData.familiar.pareja_nombre) {
      return memberData.familiar.pareja_nombre;
    }
    
    return '';
  };

  const getFechaNacimientoPareja = () => {
    if (memberData.fechaNacimientoPareja) {
      return memberData.fechaNacimientoPareja;
    }
    
    if (memberData.familiar && memberData.familiar.pareja_cumpleanos) {
      return memberData.familiar.pareja_cumpleanos;
    }
    
    return '';
  };

  // Información básica siempre visible
  const renderBasicInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Información de Contacto</Text>
      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Nombre:</Text>
          <Text style={styles.value}>{getNombreCompleto()}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Grado:</Text>
          <Text style={styles.value}>{getGrado()}</Text>
        </View>
        {getCargo() && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Cargo:</Text>
            <Text style={styles.value}>{getCargo()}</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => Linking.openURL(`tel:${getTelefono()}`)}
        >
          <Ionicons name="call-outline" size={24} color="#007AFF" />
          <Text style={styles.contactText}>{getTelefono()}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => Linking.openURL(`mailto:${getEmail()}`)}
        >
          <Ionicons name="mail-outline" size={24} color="#007AFF" />
          <Text style={styles.contactText}>{getEmail()}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Información detallada solo para autorizados
  const renderDetailedInfo = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información Personal</Text>
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>RUT:</Text>
            <Text style={styles.value}>{getRut()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Profesión:</Text>
            <Text style={styles.value}>{getProfesion()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Ocupación:</Text>
            <Text style={styles.value}>{getOcupacion()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Dirección:</Text>
            <Text style={styles.value}>{getDireccion()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Fecha Nac.:</Text>
            <Text style={styles.value}>{getFechaNacimiento()}</Text>
          </View>
          {getTelefono2() && (
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => Linking.openURL(`tel:${getTelefono2()}`)}
            >
              <Ionicons name="call-outline" size={24} color="#007AFF" />
              <Text style={styles.contactText}>{getTelefono2()}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Información familiar */}
      {getNombrePareja() && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Familiar</Text>
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Cónyuge/Pareja:</Text>
              <Text style={styles.value}>{getNombrePareja()}</Text>
            </View>
            {getFechaNacimientoPareja() && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Fecha Nac.:</Text>
                <Text style={styles.value}>{getFechaNacimientoPareja()}</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </>
  );

  return (
    <ScrollView style={styles.container}>
      {renderBasicInfo()}
      {canViewFullDetails() && renderDetailedInfo()}
      
      {!canViewFullDetails() && (
        <View style={styles.restrictedInfo}>
          <Text style={styles.restrictedText}>
            La información detallada solo está disponible para miembros con el nivel de grado requerido.
          </Text>
        </View>
      )}
    </ScrollView>
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
  section: {
    backgroundColor: '#fff',
    margin: 10,
    marginTop: 15,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  infoContainer: {
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingVertical: 2,
  },
  label: {
    width: 120,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  contactText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#007AFF',
  },
  restrictedInfo: {
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  restrictedText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  gradoTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  gradoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cargoContainer: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  cargoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});