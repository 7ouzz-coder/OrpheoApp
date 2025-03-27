// src/screens/auth/LoginScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../config/database';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    // Verificar si hay una sesión guardada
    const checkSavedSession = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsedData = JSON.parse(userData);
          
          // Establecer valores globales para uso en toda la app
          global.userRole = parsedData.rol;
          global.userGrado = parsedData.grado;
          global.userName = parsedData.username;
          global.userCargo = parsedData.cargo || '';
          global.userFullName = parsedData.fullName;
          global.userId = parsedData.id || '00000000-0000-0000-0000-000000000000';
          
          // Navegar directamente a la pantalla principal
          navigation.replace('Main');
        }
      } catch (error) {
        console.error('Error verificando sesión guardada:', error);
      }
    };

    checkSavedSession();
  }, []);

  const handleLogin = async () => {
    // Validaciones básicas
    if (!username.trim()) {
      Alert.alert('Error', 'Por favor, ingrese su nombre de usuario.');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Error', 'Por favor, ingrese su contraseña.');
      return;
    }

    setLoading(true);
    try {
      // Verificar credenciales en la base de datos
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          id,
          username,
          email,
          rol,
          grado,
          activo,
          miembro_id,
          miembro:miembro_id (
            id,
            nombres,
            apellidos,
            cargo
          )
        `)
        .eq('username', username.trim())
        .eq('password', password) // En producción usar hash
        .eq('activo', true)
        .single();
      
      if (error || !data) {
        Alert.alert('Error', 'Credenciales incorrectas o usuario inactivo.');
        return;
      }
      
      // Preparar datos del usuario para guardar/usar
      const userData = {
        id: data.id,
        username: data.username,
        email: data.email,
        rol: data.rol,
        grado: data.grado,
        miembro_id: data.miembro_id,
        cargo: data.miembro?.cargo || '',
        fullName: data.miembro ? `${data.miembro.nombres} ${data.miembro.apellidos}` : data.username
      };
      
      // Guardar sesión si "recordarme" está activo
      if (rememberMe) {
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
      }
      
      // Establecer valores globales
      global.userRole = userData.rol;
      global.userGrado = userData.grado;
      global.userName = userData.username;
      global.userCargo = userData.cargo || '';
      global.userFullName = userData.fullName;
      global.userId = userData.id;
      
      // Navegar a la pantalla principal
      navigation.replace('Main');
      
    } catch (error) {
      console.error('Error en inicio de sesión:', error);
      Alert.alert('Error', 'No se pudo iniciar sesión. Verifique sus credenciales o intente más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <Image
            source={require('../../../assets/Orpheo1.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          
          <Text style={styles.title}>Iniciar Sesión</Text>
          
          {/* Formulario */}
          <View style={styles.formContainer}>
            {/* Campo de usuario */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nombre de usuario"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            {/* Campo de contraseña */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secureTextEntry}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setSecureTextEntry(!secureTextEntry)}
              >
                <Ionicons
                  name={secureTextEntry ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            
            {/* Opción "Recordarme" */}
            <TouchableOpacity
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={styles.checkboxContainer}>
                <Ionicons
                  name={rememberMe ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={rememberMe ? '#007AFF' : '#666'}
                />
                <Text style={styles.rememberMeText}>Recordarme</Text>
              </View>
            </TouchableOpacity>
            
            {/* Botón de iniciar sesión */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
              )}
            </TouchableOpacity>
            
            {/* Enlace para registro */}
            <TouchableOpacity
              style={styles.registerContainer}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.registerText}>
                ¿No tienes una cuenta? <Text style={styles.registerLink}>Regístrate aquí</Text>
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Pie de página */}
          <Text style={styles.footerText}>
            OrpheoApp v1.0.0
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c274c',
    marginBottom: 30,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 5,
  },
  rememberMeContainer: {
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#666',
  },
  registerLink: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  footerText: {
    marginTop: 30,
    fontSize: 12,
    color: '#999',
  }
});