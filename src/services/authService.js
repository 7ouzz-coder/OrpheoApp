// src/services/authService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/database';

export const authService = {
  // Iniciar sesión
  async login(username, password) {
    try {
      // En producción deberías usar hash para las contraseñas
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          id,
          username,
          email,
          rol,
          grado,
          cargo,
          activo,
          miembro_id,
          miembro:miembro_id (
            id,
            nombres,
            apellidos
          )
        `)
        .eq('username', username)
        .eq('password', password)
        .eq('activo', true)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Credenciales incorrectas o usuario inactivo');

      // Preparar datos de usuario
      const userData = {
        id: data.id,
        username: data.username,
        email: data.email,
        rol: data.rol,
        grado: data.grado,
        cargo: data.cargo || '',
        miembro_id: data.miembro_id,
        fullName: data.miembro ? `${data.miembro.nombres} ${data.miembro.apellidos}` : username
      };

      return userData;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  },

  // Registrar nuevo usuario
  async register(userData) {
    try {
      // 1. Crear el registro del miembro
      const miembroData = {
        nombres: userData.nombres,
        apellidos: userData.apellidos,
        rut: userData.rut,
        fecha_nacimiento: userData.fechaNacimiento,
        profesion: userData.profesion,
        email: userData.email,
        telefono: userData.telefono,
        direccion: userData.direccion,
        grado: 'aprendiz',
        fecha_iniciacion: userData.fechaIniciacion,
        contacto_emergencia_nombre: userData.contactoEmergenciaNombre,
        contacto_emergencia_telefono: userData.contactoEmergenciaTelefono,
        situacion_salud: userData.situacionSalud,
        pareja_nombre: userData.parejaNombre,
        pareja_telefono: userData.parejaTelefono,
        pareja_cumpleanos: userData.parejaCumpleanos,
        trabajo_nombre: userData.trabajoNombre,
        trabajo_cargo: userData.trabajoCargo,
        trabajo_direccion: userData.trabajoDireccion,
        trabajo_email: userData.trabajoEmail,
        trabajo_telefono: userData.trabajoTelefono
      };

      const { data: miembro, error: miembroError } = await supabase
        .from('miembros')
        .insert([miembroData])
        .select()
        .single();

      if (miembroError) throw miembroError;

      // 2. Crear el usuario asociado al miembro
      const usuarioData = {
        username: userData.username,
        password: userData.password, // En producción usar hash
        email: userData.email,
        rol: 'general',
        grado: 'aprendiz',
        activo: false, // Requiere aprobación del admin
        miembro_id: miembro.id
      };

      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .insert([usuarioData])
        .select()
        .single();

      if (usuarioError) throw usuarioError;

      return { success: true, miembro, usuario };
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    }
  },

  // Guardar sesión en almacenamiento local
  async guardarSesion(userData) {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      
      // Establecer variables globales
      global.userRole = userData.rol;
      global.userGrado = userData.grado;
      global.userName = userData.username;
      global.userCargo = userData.cargo || '';
      global.userFullName = userData.fullName;
      global.userId = userData.id;
      
      return true;
    } catch (error) {
      console.error('Error guardando sesión:', error);
      throw error;
    }
  },

  // Cerrar sesión
  async cerrarSesion() {
    try {
      await AsyncStorage.removeItem('userData');
      
      // Limpiar variables globales
      global.userRole = null;
      global.userGrado = null;
      global.userName = null;
      global.userCargo = null;
      global.userFullName = null;
      global.userId = null;
      
      return true;
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      throw error;
    }
  },

  // Solicitar recuperación de contraseña
  async solicitarRecuperacionPassword(email) {
    try {
      // Buscar usuario con ese email
      const { data: miembro, error: miembroError } = await supabase
        .from('miembros')
        .select('id')
        .eq('email', email)
        .single();

      if (miembroError || !miembro) {
        throw new Error('No se encontró ningún usuario con ese correo electrónico');
      }

      // Buscar el usuario asociado
      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('miembro_id', miembro.id)
        .single();

      if (usuarioError || !usuario) {
        throw new Error('No se encontró una cuenta asociada a este correo');
      }

      // Generar token de recuperación
      const token = Math.random().toString(36).substring(2, 15) + 
                    Math.random().toString(36).substring(2, 15);
      
      // Calcular fecha de expiración (1 hora)
      const expiracion = new Date();
      expiracion.setHours(expiracion.getHours() + 1);

      // Guardar token en la base de datos
      await supabase
        .from('recuperacion_password')
        .insert([{
          usuario_id: usuario.id,
          token,
          expiracion: expiracion.toISOString(),
          utilizado: false
        }]);

      // En una implementación real, aquí enviaríamos un correo al usuario
      // con un enlace que contiene el token
      
      return { success: true, message: 'Se ha enviado un correo con instrucciones para recuperar tu contraseña' };
    } catch (error) {
      console.error('Error en recuperación de contraseña:', error);
      throw error;
    }
  },

  // Verificar token de recuperación
  async verificarTokenRecuperacion(token) {
    try {
      const { data, error } = await supabase
        .from('recuperacion_password')
        .select('*')
        .eq('token', token)
        .eq('utilizado', false)
        .gt('expiracion', new Date().toISOString())
        .single();

      if (error || !data) {
        throw new Error('Token inválido o expirado');
      }

      return { success: true, usuarioId: data.usuario_id };
    } catch (error) {
      console.error('Error verificando token:', error);
      throw error;
    }
  },

  // Restablecer contraseña
  async restablecerPassword(token, nuevaPassword) {
    try {
      // Verificar token
      const { success, usuarioId } = await this.verificarTokenRecuperacion(token);
      
      if (!success) {
        throw new Error('Token inválido o expirado');
      }

      // Actualizar contraseña
      const { error: passwordError } = await supabase
        .from('usuarios')
        .update({ password: nuevaPassword }) // En producción usar hash
        .eq('id', usuarioId);

      if (passwordError) throw passwordError;

      // Marcar token como utilizado
      await supabase
        .from('recuperacion_password')
        .update({ utilizado: true })
        .eq('token', token);

      return { success: true, message: 'Contraseña actualizada correctamente' };
    } catch (error) {
      console.error('Error restableciendo contraseña:', error);
      throw error;
    }
  }
};