// src/screens/auth/RegisterScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../config/database';

export default function RegisterScreen({ navigation }) {
  // Estados para todos los datos del formulario
  const [formData, setFormData] = useState({
    // Identificación
    nombres: '',
    apellidos: '',
    rut: '',
    fecha_nacimiento: '',
    
    // Contacto
    email: '',
    telefono: '',
    direccion: '',
    
    // Familiar
    pareja_nombre: '',
    pareja_telefono: '',
    pareja_cumpleanos: '',
    
    // Profesional
    profesion: '',
    trabajo_nombre: '',
    trabajo_cargo: '',
    trabajo_direccion: '',
    trabajo_email: '',
    trabajo_telefono: '',
    
    // Taller
    fecha_iniciacion: '',
    cargo: '',
    contacto_emergencia_nombre: '',
    contacto_emergencia_telefono: '',
    situacion_salud: '',
    
    // Credenciales
    username: '',
    password: '',
    confirmPassword: ''
  });

  // Estado para documento requerido
  const [documento, setDocumento] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  // Función para actualizar cualquier campo
  const updateField = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  // Seleccionar documento PDF
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setDocumento(result.assets[0]);
      }
    } catch (error) {
      console.error('Error al seleccionar documento:', error);
      Alert.alert('Error', 'No se pudo seleccionar el documento');
    }
  };

  // Validar el paso actual antes de continuar
  const validateStep = () => {
    switch (currentStep) {
      case 1: // Identificación
        if (!formData.nombres.trim() || !formData.apellidos.trim() || !formData.rut.trim()) {
          Alert.alert('Error', 'Por favor complete los campos obligatorios');
          return false;
        }
        break;
      case 2: // Contacto
        if (!formData.email.trim() || !formData.telefono.trim()) {
          Alert.alert('Error', 'Por favor complete los campos obligatorios');
          return false;
        }
        break;
      case 3: // Familiar - Opcional
        break;
      case 4: // Profesional
        if (!formData.profesion.trim()) {
          Alert.alert('Error', 'Por favor indique su profesión');
          return false;
        }
        break;
      case 5: // Taller
        break;
      case 6: // Credenciales y documento
        if (!formData.username.trim() || !formData.password.trim() || !formData.confirmPassword.trim()) {
          Alert.alert('Error', 'Por favor complete los campos de credenciales');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          Alert.alert('Error', 'Las contraseñas no coinciden');
          return false;
        }
        if (!documento) {
          Alert.alert('Error', 'Debe adjuntar la solicitud con firma del secretario');
          return false;
        }
        break;
    }
    return true;
  };

  // Avanzar al siguiente paso
  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  // Volver al paso anterior
  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Enviar formulario
  const handleRegister = async () => {
    if (!validateStep()) return;

    setLoading(true);

    try {
      // 1. Crear registro en tabla miembros
      const { data: miembro, error: miembroError } = await supabase
        .from('miembros')
        .insert([{
          nombres: formData.nombres,
          apellidos: formData.apellidos,
          rut: formData.rut,
          fecha_nacimiento: formData.fecha_nacimiento,
          profesion: formData.profesion,
          email: formData.email,
          telefono: formData.telefono,
          direccion: formData.direccion,
          cargo: formData.cargo,
          grado: 'aprendiz',
          fecha_iniciacion: formData.fecha_iniciacion,
          contacto_emergencia_nombre: formData.contacto_emergencia_nombre,
          contacto_emergencia_telefono: formData.contacto_emergencia_telefono,
          situacion_salud: formData.situacion_salud,
          pareja_nombre: formData.pareja_nombre,
          pareja_telefono: formData.pareja_telefono,
          pareja_cumpleanos: formData.pareja_cumpleanos,
          trabajo_nombre: formData.trabajo_nombre,
          trabajo_cargo: formData.trabajo_cargo,
          trabajo_direccion: formData.trabajo_direccion,
          trabajo_email: formData.trabajo_email,
          trabajo_telefono: formData.trabajo_telefono
        }])
        .select()
        .single();

      if (miembroError) throw miembroError;

      // 2. Crear usuario
      const { error: userError } = await supabase
        .from('usuarios')
        .insert([{
          username: formData.username,
          password: formData.password, // En producción usar hash
          email: formData.email,
          rol: 'general',
          grado: 'aprendiz',
          miembro_id: miembro.id,
          activo: false // Requiere aprobación de admin
        }]);

      if (userError) throw userError;

      // 3. Procesar el documento adjunto
      if (documento) {
        // En una implementación real, subirías el documento a un almacenamiento
        // y registrarías su referencia en la base de datos
        console.log('Documento a procesar:', documento.name);
        
        // Aquí iría la lógica para subir el documento a Supabase Storage
        // const { data, error } = await supabase.storage
        //   .from('solicitudes')
        //   .upload(`${miembro.id}/${documento.name}`, documento.uri);
      }

      Alert.alert(
        'Registro Exitoso',
        'Su solicitud ha sido enviada y está pendiente de aprobación.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );

    } catch (error) {
      console.error('Error en registro:', error);
      Alert.alert('Error', 'No se pudo completar el registro. ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Componentes para cada paso del formulario
  const renderIdentificacionForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>Información Personal</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Nombres *</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombres"
          value={formData.nombres}
          onChangeText={(text) => updateField('nombres', text)}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Apellidos *</Text>
        <TextInput
          style={styles.input}
          placeholder="Apellidos"
          value={formData.apellidos}
          onChangeText={(text) => updateField('apellidos', text)}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>RUT (sin puntos y con guión) *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 12345678-9"
          value={formData.rut}
          onChangeText={(text) => updateField('rut', text)}
          keyboardType="default"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Fecha de Nacimiento (DD/MM/AAAA)</Text>
        <TextInput
          style={styles.input}
          placeholder="DD/MM/AAAA"
          value={formData.fecha_nacimiento}
          onChangeText={(text) => updateField('fecha_nacimiento', text)}
        />
      </View>

      <View style={styles.navigationButtons}>
        <View style={{flex: 1}}></View>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={nextStep}
        >
          <Text style={styles.nextButtonText}>Siguiente</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContactoForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>Información de Contacto</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Correo Electrónico *</Text>
        <TextInput
          style={styles.input}
          placeholder="correo@ejemplo.com"
          value={formData.email}
          onChangeText={(text) => updateField('email', text)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Teléfono Móvil *</Text>
        <TextInput
          style={styles.input}
          placeholder="+56 9 1234 5678"
          value={formData.telefono}
          onChangeText={(text) => updateField('telefono', text)}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Dirección</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Dirección completa"
          value={formData.direccion}
          onChangeText={(text) => updateField('direccion', text)}
          multiline
        />
      </View>

      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={prevStep}
        >
          <Ionicons name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={nextStep}
        >
          <Text style={styles.nextButtonText}>Siguiente</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFamiliarForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>Información Familiar</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Nombre de Cónyuge/Pareja</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre completo"
          value={formData.pareja_nombre}
          onChangeText={(text) => updateField('pareja_nombre', text)}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Teléfono de Contacto</Text>
        <TextInput
          style={styles.input}
          placeholder="+56 9 1234 5678"
          value={formData.pareja_telefono}
          onChangeText={(text) => updateField('pareja_telefono', text)}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Cumpleaños (DD/MM/AAAA)</Text>
        <TextInput
          style={styles.input}
          placeholder="DD/MM/AAAA"
          value={formData.pareja_cumpleanos}
          onChangeText={(text) => updateField('pareja_cumpleanos', text)}
        />
      </View>

      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={prevStep}
        >
          <Ionicons name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={nextStep}
        >
          <Text style={styles.nextButtonText}>Siguiente</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProfesionalForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>Información Profesional/Laboral</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Profesión *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Ingeniero, Abogado, etc."
          value={formData.profesion}
          onChangeText={(text) => updateField('profesion', text)}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Lugar de Trabajo</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre de la empresa"
          value={formData.trabajo_nombre}
          onChangeText={(text) => updateField('trabajo_nombre', text)}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Cargo</Text>
        <TextInput
          style={styles.input}
          placeholder="Cargo o puesto"
          value={formData.trabajo_cargo}
          onChangeText={(text) => updateField('trabajo_cargo', text)}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Dirección Laboral</Text>
        <TextInput
          style={styles.input}
          placeholder="Dirección de trabajo"
          value={formData.trabajo_direccion}
          onChangeText={(text) => updateField('trabajo_direccion', text)}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Email Trabajo</Text>
        <TextInput
          style={styles.input}
          placeholder="correo@trabajo.com"
          value={formData.trabajo_email}
          onChangeText={(text) => updateField('trabajo_email', text)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Teléfono Trabajo</Text>
        <TextInput
          style={styles.input}
          placeholder="+56 2 1234 5678"
          value={formData.trabajo_telefono}
          onChangeText={(text) => updateField('trabajo_telefono', text)}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={prevStep}
        >
          <Ionicons name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={nextStep}
        >
          <Text style={styles.nextButtonText}>Siguiente</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTallerForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>Información del Taller</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Fecha de Iniciación (DD/MM/AAAA)</Text>
        <TextInput
          style={styles.input}
          placeholder="DD/MM/AAAA"
          value={formData.fecha_iniciacion}
          onChangeText={(text) => updateField('fecha_iniciacion', text)}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Cargo</Text>
        <TextInput
          style={styles.input}
          placeholder="Cargo actual (si aplica)"
          value={formData.cargo}
          onChangeText={(text) => updateField('cargo', text)}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Contacto de Urgencia (Nombre)</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre completo"
          value={formData.contacto_emergencia_nombre}
          onChangeText={(text) => updateField('contacto_emergencia_nombre', text)}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Contacto de Urgencia (Teléfono)</Text>
        <TextInput
          style={styles.input}
          placeholder="+56 9 1234 5678"
          value={formData.contacto_emergencia_telefono}
          onChangeText={(text) => updateField('contacto_emergencia_telefono', text)}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Situación de Salud</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Indique alergias, condiciones médicas, etc."
          value={formData.situacion_salud}
          onChangeText={(text) => updateField('situacion_salud', text)}
          multiline
        />
      </View>

      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={prevStep}
        >
          <Ionicons name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={nextStep}
        >
          <Text style={styles.nextButtonText}>Siguiente</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCredentialsForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>Credenciales y Solicitud</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Nombre de Usuario *</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre de usuario"
          value={formData.username}
          onChangeText={(text) => updateField('username', text)}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Contraseña *</Text>
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={formData.password}
          onChangeText={(text) => updateField('password', text)}
          secureTextEntry
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Confirmar Contraseña *</Text>
        <TextInput
          style={styles.input}
          placeholder="Repita la contraseña"
          value={formData.confirmPassword}
          onChangeText={(text) => updateField('confirmPassword', text)}
          secureTextEntry
        />
      </View>

      <View style={styles.documentContainer}>
        <Text style={styles.documentTitle}>Documento de Solicitud *</Text>
        <Text style={styles.documentDescription}>
          Adjunte su solicitud con la firma del secretario (formato PDF)
        </Text>
        
        <TouchableOpacity
          style={styles.documentButton}
          onPress={pickDocument}
        >
          <Ionicons name="document-attach" size={24} color="#007AFF" />
          <Text style={styles.documentButtonText}>
            {documento ? documento.name : "Seleccionar Documento"}
          </Text>
        </TouchableOpacity>
        
        {documento && (
          <Text style={styles.documentInfo}>
            Documento seleccionado: {documento.name} 
            ({(documento.size / 1024 / 1024).toFixed(2)} MB)
          </Text>
        )}
      </View>

      <Text style={styles.requiredText}>* Campos obligatorios</Text>

      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={prevStep}
        >
          <Ionicons name="arrow-back" size={20} color="#666" />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.registerButtonText}>Registrarse</Text>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Renderizar el paso actual
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return renderIdentificacionForm();
      case 2:
        return renderContactoForm();
      case 3:
        return renderFamiliarForm();
      case 4:
        return renderProfesionalForm();
      case 5:
        return renderTallerForm();
      case 6:
        return renderCredentialsForm();
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Registro de Nuevo Miembro</Text>
      </View>
      
      <View style={styles.progressContainer}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              currentStep >= i + 1 && styles.progressDotActive
            ]}
          />
        ))}
      </View>
      
      <Text style={styles.stepText}>Paso {currentStep} de {totalSteps}</Text>
      
      {renderStep()}
      
      <TouchableOpacity 
        style={styles.loginLink}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.loginLinkText}>
          ¿Ya tienes una cuenta? Inicia sesión aquí
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ddd',
    marginHorizontal: 5,
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
  },
  stepText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  formSection: {
    margin: 15,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    marginLeft: 5,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 5,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 5,
  },
  documentContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  documentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f8ff',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
  },
  documentButtonText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 10,
  },
  documentInfo: {
    marginTop: 10,
    fontSize: 14,
    color: '#28a745',
  },
  requiredText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 15,
    marginBottom: 5,
    fontStyle: 'italic',
  },
  loginLink: {
    alignItems: 'center',
    padding: 20,
  },
  loginLinkText: {
    color: '#007AFF',
    fontSize: 14,
  }
});