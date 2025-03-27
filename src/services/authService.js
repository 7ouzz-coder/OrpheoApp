// src/services/authService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import pool from '../config/database.js';
import { databaseService } from './databaseService.js';

export const authService = {
  // Iniciar sesión
  async login(username, password) {
    try {
      // En producción deberías usar hash para las contraseñas
      const query = `
        SELECT 
          u.id, u.username, u.email, u.rol, u.grado, u.cargo, u.activo, u.miembro_id,
          m.nombres, m.apellidos
        FROM usuarios u
        LEFT JOIN miembros m ON u.miembro_id = m.id
        WHERE u.username = $1 AND u.password = $2 AND u.activo = true
      `;
      
      const { rows } = await pool.query(query, [username, password]);
      
      if (rows.length === 0) {
        throw new Error('Credenciales incorrectas o usuario inactivo');
      }
      
      const user = rows[0];
      
      // Preparar datos de usuario
      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        rol: user.rol,
        grado: user.grado,
        cargo: user.cargo || '',
        miembro_id: user.miembro_id,
        fullName: user.nombres && user.apellidos ? `${user.nombres} ${user.apellidos}` : user.username
      };

      return userData;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  },

  // Registrar nuevo usuario
  async register(userData) {
    const client = await databaseService.iniciarTransaccion();
    
    try {
      // 1. Crear el registro del miembro
      const miembroQuery = `
        INSERT INTO miembros (
          nombres, apellidos, rut, fecha_nacimiento, profesion, email, 
          telefono, direccion, grado, fecha_iniciacion, 
          contacto_emergencia_nombre, contacto_emergencia_telefono,
          situacion_salud, pareja_nombre, pareja_telefono, pareja_cumpleanos,
          trabajo_nombre, trabajo_cargo, trabajo_direccion, trabajo_email, trabajo_telefono
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
          $16, $17, $18, $19, $20, $21
        ) RETURNING *
      `;
      
      const miembroValues = [
        userData.nombres || '',
        userData.apellidos || '',
        userData.rut || '',
        userData.fechaNacimiento || null,
        userData.profesion || '',
        userData.email || '',
        userData.telefono || '',
        userData.direccion || '',
        'aprendiz', // grado por defecto
        userData.fechaIniciacion || null,
        userData.contactoEmergenciaNombre || '',
        userData.contactoEmergenciaTelefono || '',
        userData.situacionSalud || '',
        userData.parejaNombre || '',
        userData.parejaTelefono || '',
        userData.parejaCumpleanos || null,
        userData.trabajoNombre || '',
        userData.trabajoCargo || '',
        userData.trabajoDireccion || '',
        userData.trabajoEmail || '',
        userData.trabajoTelefono || ''
      ];
      
      const miembroResult = await client.query(miembroQuery, miembroValues);
      const miembro = miembroResult.rows[0];
      
      // 2. Crear el usuario asociado al miembro
      const usuarioQuery = `
        INSERT INTO usuarios (
          username, password, email, rol, grado, activo, miembro_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        ) RETURNING *
      `;
      
      const usuarioValues = [
        userData.username,
        userData.password, // En producción usar hash
        userData.email || '',
        'general', // rol por defecto
        'aprendiz', // grado por defecto
        false, // inactivo por defecto, requiere aprobación
        miembro.id
      ];
      
      const usuarioResult = await client.query(usuarioQuery, usuarioValues);
      const usuario = usuarioResult.rows[0];
      
      await databaseService.confirmarTransaccion(client);
      
      return { success: true, miembro, usuario };
    } catch (error) {
      await databaseService.revertirTransaccion(client);
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
      // Buscar el miembro con ese correo electrónico
      const miembroQuery = `SELECT id FROM miembros WHERE email = $1`;
      const miembroResult = await pool.query(miembroQuery, [email]);
      
      if (miembroResult.rows.length === 0) {
        throw new Error('No se encontró ningún usuario con ese correo electrónico');
      }
      
      const miembroId = miembroResult.rows[0].id;
      
      // Buscar el usuario asociado al miembro
      const usuarioQuery = `SELECT id FROM usuarios WHERE miembro_id = $1`;
      const usuarioResult = await pool.query(usuarioQuery, [miembroId]);
      
      if (usuarioResult.rows.length === 0) {
        throw new Error('No se encontró una cuenta asociada a este correo');
      }
      
      const usuarioId = usuarioResult.rows[0].id;
      
      // Generar token de recuperación
      const token = Math.random().toString(36).substring(2, 15) + 
                    Math.random().toString(36).substring(2, 15);
      
      // Calcular fecha de expiración (1 hora)
      const expiracion = new Date();
      expiracion.setHours(expiracion.getHours() + 1);
      
      // Guardar token en la base de datos
      const tokenQuery = `
        INSERT INTO recuperacion_password (
          usuario_id, token, expiracion, utilizado
        ) VALUES ($1, $2, $3, $4)
      `;
      
      await pool.query(tokenQuery, [usuarioId, token, expiracion.toISOString(), false]);
      
      // En una implementación real, aquí enviaríamos un correo al usuario
      // con un enlace que contiene el token
      
      return { 
        success: true, 
        message: 'Se ha enviado un correo con instrucciones para recuperar tu contraseña' 
      };
    } catch (error) {
      console.error('Error en recuperación de contraseña:', error);
      throw error;
    }
  },

  // Verificar token de recuperación
  async verificarTokenRecuperacion(token) {
    try {
      const query = `
        SELECT * FROM recuperacion_password
        WHERE token = $1 AND utilizado = false AND expiracion > $2
      `;
      
      const { rows } = await pool.query(query, [token, new Date().toISOString()]);
      
      if (rows.length === 0) {
        throw new Error('Token inválido o expirado');
      }
      
      return { success: true, usuarioId: rows[0].usuario_id };
    } catch (error) {
      console.error('Error verificando token:', error);
      throw error;
    }
  },

  // Restablecer contraseña
  async restablecerPassword(token, nuevaPassword) {
    const client = await databaseService.iniciarTransaccion();
    
    try {
      // Verificar token
      const tokenQuery = `
        SELECT usuario_id FROM recuperacion_password
        WHERE token = $1 AND utilizado = false AND expiracion > $2
      `;
      
      const tokenResult = await client.query(tokenQuery, [token, new Date().toISOString()]);
      
      if (tokenResult.rows.length === 0) {
        throw new Error('Token inválido o expirado');
      }
      
      const usuarioId = tokenResult.rows[0].usuario_id;
      
      // Actualizar contraseña
      const passwordQuery = `
        UPDATE usuarios SET password = $1 WHERE id = $2
      `;
      
      await client.query(passwordQuery, [nuevaPassword, usuarioId]);
      
      // Marcar token como utilizado
      const updateTokenQuery = `
        UPDATE recuperacion_password SET utilizado = true WHERE token = $1
      `;
      
      await client.query(updateTokenQuery, [token]);
      
      await databaseService.confirmarTransaccion(client);
      
      return { success: true, message: 'Contraseña actualizada correctamente' };
    } catch (error) {
      await databaseService.revertirTransaccion(client);
      console.error('Error restableciendo contraseña:', error);
      throw error;
    }
  }
};

export default authService;