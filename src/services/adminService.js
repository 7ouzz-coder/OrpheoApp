// src/services/adminService.js
import pool from '../config/database.js';
import { databaseService } from './databaseService.js';

export const adminService = {
  // Obtener todos los usuarios con detalles
  async obtenerUsuarios() {
    try {
      const query = `
        SELECT 
          u.*,
          m.id AS miembro_id, m.nombres, m.apellidos, m.cargo, m.grado
        FROM usuarios u
        LEFT JOIN miembros m ON u.miembro_id = m.id
        ORDER BY u.created_at DESC
      `;
      
      const { rows } = await pool.query(query);
      
      // Formatear los resultados para mantener compatibilidad con la estructura anterior
      return rows.map(row => ({
        id: row.id,
        username: row.username,
        email: row.email,
        rol: row.rol,
        grado: row.grado,
        activo: row.activo,
        created_at: row.created_at,
        miembro_id: row.miembro_id,
        miembro: row.miembro_id ? {
          id: row.miembro_id,
          nombres: row.nombres,
          apellidos: row.apellidos,
          cargo: row.cargo,
          grado: row.grado
        } : null
      }));
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      return [];
    }
  },
  
  // Obtener usuarios pendientes de aprobación
  async obtenerUsuariosPendientes() {
    try {
      const query = `
        SELECT 
          u.*,
          m.id AS miembro_id, m.nombres, m.apellidos, m.rut, m.email, 
          m.telefono, m.profesion
        FROM usuarios u
        LEFT JOIN miembros m ON u.miembro_id = m.id
        WHERE u.activo = false
        ORDER BY u.created_at DESC
      `;
      
      const { rows } = await pool.query(query);
      
      // Formatear los resultados para mantener compatibilidad con la estructura anterior
      return rows.map(row => ({
        id: row.id,
        username: row.username,
        email: row.email,
        rol: row.rol,
        grado: row.grado,
        activo: row.activo,
        created_at: row.created_at,
        miembro_id: row.miembro_id,
        miembro: row.miembro_id ? {
          id: row.miembro_id,
          nombres: row.nombres,
          apellidos: row.apellidos,
          rut: row.rut,
          email: row.email,
          telefono: row.telefono,
          profesion: row.profesion
        } : null
      }));
    } catch (error) {
      console.error('Error obteniendo usuarios pendientes:', error);
      return [];
    }
  },
  
  // Aprobar usuario
  async aprobarUsuario(id, rol, grado) {
    const client = await databaseService.iniciarTransaccion();
    
    try {
      // Primero actualizamos el usuario
      const usuarioQuery = `
        UPDATE usuarios 
        SET activo = true, rol = $2, grado = $3
        WHERE id = $1
        RETURNING *
      `;
      
      const usuarioResult = await client.query(usuarioQuery, [id, rol || 'general', grado || 'aprendiz']);
      
      if (usuarioResult.rows.length === 0) {
        throw new Error(`No se encontró usuario con ID: ${id}`);
      }
      
      const usuario = usuarioResult.rows[0];
      
      // Si hay un miembro asociado, actualizamos también su grado
      if (usuario.miembro_id) {
        const miembroQuery = `
          UPDATE miembros
          SET grado = $2
          WHERE id = $1
          RETURNING *
        `;
        
        await client.query(miembroQuery, [usuario.miembro_id, grado || 'aprendiz']);
      }
      
      await databaseService.confirmarTransaccion(client);
      return usuario;
    } catch (error) {
      await databaseService.revertirTransaccion(client);
      console.error('Error aprobando usuario:', error);
      throw error;
    }
  },
  
  // Rechazar/eliminar usuario
  async rechazarUsuario(id) {
    const client = await databaseService.iniciarTransaccion();
    
    try {
      // Primero obtenemos el ID del miembro asociado
      const usuarioQuery = `
        SELECT miembro_id FROM usuarios
        WHERE id = $1
      `;
      
      const usuarioResult = await client.query(usuarioQuery, [id]);
      
      if (usuarioResult.rows.length === 0) {
        throw new Error(`No se encontró usuario con ID: ${id}`);
      }
      
      const miembroId = usuarioResult.rows[0].miembro_id;
      
      // Eliminamos el usuario
      const deleteUserQuery = `
        DELETE FROM usuarios
        WHERE id = $1
        RETURNING *
      `;
      
      await client.query(deleteUserQuery, [id]);
      
      // Si hay un miembro asociado, lo eliminamos también
      if (miembroId) {
        const deleteMiembroQuery = `
          DELETE FROM miembros
          WHERE id = $1
          RETURNING *
        `;
        
        await client.query(deleteMiembroQuery, [miembroId]);
      }
      
      await databaseService.confirmarTransaccion(client);
      return true;
    } catch (error) {
      await databaseService.revertirTransaccion(client);
      console.error('Error rechazando usuario:', error);
      throw error;
    }
  },
  
  // Cambiar rol de usuario
  async cambiarRolUsuario(id, nuevoRol) {
    try {
      // Validar que sea un rol válido
      if (!['general', 'admin', 'superadmin'].includes(nuevoRol)) {
        throw new Error('Rol no válido');
      }
      
      const query = `
        UPDATE usuarios
        SET rol = $2
        WHERE id = $1
        RETURNING *
      `;
      
      const { rows } = await pool.query(query, [id, nuevoRol]);
      
      if (rows.length === 0) {
        throw new Error(`No se encontró usuario con ID: ${id}`);
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error cambiando rol:', error);
      throw error;
    }
  },
  
  // Cambiar grado de un usuario
  async cambiarGradoUsuario(id, nuevoGrado) {
    const client = await databaseService.iniciarTransaccion();
    
    try {
      // Validar que sea un grado válido
      if (!['aprendiz', 'companero', 'maestro'].includes(nuevoGrado)) {
        throw new Error('Grado no válido');
      }
      
      // Obtener el miembro_id del usuario
      const usuarioQuery = `
        SELECT miembro_id FROM usuarios
        WHERE id = $1
      `;
      
      const usuarioResult = await client.query(usuarioQuery, [id]);
      
      if (usuarioResult.rows.length === 0) {
        throw new Error(`No se encontró usuario con ID: ${id}`);
      }
      
      const miembroId = usuarioResult.rows[0].miembro_id;
      
      // Actualizar el grado del usuario
      const updateUsuarioQuery = `
        UPDATE usuarios
        SET grado = $2
        WHERE id = $1
        RETURNING *
      `;
      
      const updateUsuarioResult = await client.query(updateUsuarioQuery, [id, nuevoGrado]);
      
      // Si hay un miembro asociado, también actualizamos su grado
      if (miembroId) {
        const updateMiembroQuery = `
          UPDATE miembros
          SET grado = $2
          WHERE id = $1
          RETURNING *
        `;
        
        await client.query(updateMiembroQuery, [miembroId, nuevoGrado]);
      }
      
      await databaseService.confirmarTransaccion(client);
      return updateUsuarioResult.rows[0];
    } catch (error) {
      await databaseService.revertirTransaccion(client);
      console.error('Error cambiando grado:', error);
      throw error;
    }
  },
  
  // Crear o actualizar oficialidad
  async gestionarOficialidad(oficialidadData) {
    try {
      // Verificar si ya existe esta oficialidad
      let query;
      let values;
      
      if (oficialidadData.id) {
        // Actualizar oficialidad existente
        const columns = Object.keys(oficialidadData).filter(key => key !== 'id');
        const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');
        
        query = `
          UPDATE oficialidad
          SET ${setClause}
          WHERE id = $1
          RETURNING *
        `;
        
        values = [oficialidadData.id, ...columns.map(col => oficialidadData[col])];
      } else {
        // Crear nueva oficialidad
        const columns = Object.keys(oficialidadData);
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        
        query = `
          INSERT INTO oficialidad (${columns.join(', ')})
          VALUES (${placeholders})
          RETURNING *
        `;
        
        values = columns.map(col => oficialidadData[col]);
      }
      
      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (error) {
      console.error('Error gestionando oficialidad:', error);
      throw error;
    }
  },
  
  // Crear o actualizar cargo de oficialidad
  async gestionarCargoOficialidad(cargoData) {
    try {
      // Verificar si ya existe este cargo
      let query;
      let values;
      
      if (cargoData.id) {
        // Actualizar cargo existente
        const columns = Object.keys(cargoData).filter(key => key !== 'id');
        const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');
        
        query = `
          UPDATE cargos_oficialidad
          SET ${setClause}
          WHERE id = $1
          RETURNING *
        `;
        
        values = [cargoData.id, ...columns.map(col => cargoData[col])];
      } else {
        // Crear nuevo cargo
        const columns = Object.keys(cargoData);
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        
        query = `
          INSERT INTO cargos_oficialidad (${columns.join(', ')})
          VALUES (${placeholders})
          RETURNING *
        `;
        
        values = columns.map(col => cargoData[col]);
      }
      
      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (error) {
      console.error('Error gestionando cargo de oficialidad:', error);
      throw error;
    }
  },
  
  // Asignar cargo a un miembro
  async asignarCargo(asignacionData) {
    const client = await databaseService.iniciarTransaccion();
    
    try {
      // Primero desactivamos cualquier asignación actual para este cargo
      if (asignacionData.cargo_id) {
        const desactivarQuery = `
          UPDATE asignacion_cargos
          SET activo = false, fecha_fin = $2
          WHERE cargo_id = $1 AND activo = true
        `;
        
        await client.query(desactivarQuery, [
          asignacionData.cargo_id, 
          new Date().toISOString().split('T')[0]
        ]);
      }
      
      // Ahora creamos la nueva asignación
      const insertQuery = `
        INSERT INTO asignacion_cargos (
          cargo_id, miembro_id, fecha_inicio, activo
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const insertResult = await client.query(insertQuery, [
        asignacionData.cargo_id,
        asignacionData.miembro_id,
        asignacionData.fecha_inicio || new Date().toISOString().split('T')[0],
        true
      ]);
      
      await databaseService.confirmarTransaccion(client);
      return insertResult.rows[0];
    } catch (error) {
      await databaseService.revertirTransaccion(client);
      console.error('Error asignando cargo:', error);
      throw error;
    }
  },
  
  // Obtener estadísticas para dashboard
  async obtenerEstadisticas() {
    try {
      // Total de miembros
      const totalMiembrosQuery = `
        SELECT COUNT(*) FROM miembros WHERE vigente = true
      `;
      
      const totalMiembrosResult = await pool.query(totalMiembrosQuery);
      const totalMiembros = parseInt(totalMiembrosResult.rows[0].count);
      
      // Conteo por grados
      const aprendicesQuery = `
        SELECT COUNT(*) FROM miembros 
        WHERE grado = 'aprendiz' AND vigente = true
      `;
      
      const aprendicesResult = await pool.query(aprendicesQuery);
      const aprendices = parseInt(aprendicesResult.rows[0].count);
      
      const companeroQuery = `
        SELECT COUNT(*) FROM miembros 
        WHERE grado = 'companero' AND vigente = true
      `;
      
      const companeroResult = await pool.query(companeroQuery);
      const companeros = parseInt(companeroResult.rows[0].count);
      
      const maestrosQuery = `
        SELECT COUNT(*) FROM miembros 
        WHERE grado = 'maestro' AND vigente = true
      `;
      
      const maestrosResult = await pool.query(maestrosQuery);
      const maestros = parseInt(maestrosResult.rows[0].count);
      
      // Usuarios pendientes
      const pendientesQuery = `
        SELECT COUNT(*) FROM usuarios 
        WHERE activo = false
      `;
      
      const pendientesResult = await pool.query(pendientesQuery);
      const pendientesCount = parseInt(pendientesResult.rows[0].count);
      
      // Próximos eventos
      const today = new Date().toISOString().split('T')[0];
      const proximosEventosQuery = `
        SELECT * FROM programa_docente
        WHERE fecha >= $1
        ORDER BY fecha ASC
        LIMIT 5
      `;
      
      const proximosEventosResult = await pool.query(proximosEventosQuery, [today]);
      const proximosEventos = proximosEventosResult.rows;
      
      return {
        totalMiembros: totalMiembros || 0,
        aprendices: aprendices || 0,
        companeros: companeros || 0,
        maestros: maestros || 0,
        pendientes: pendientesCount || 0,
        proximosEventos: proximosEventos || []
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  },
  
  // Crear jerarquía organizacional
  async crearJerarquia(jerarquiaData) {
    try {
      const columns = Object.keys(jerarquiaData);
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `
        INSERT INTO jerarquia_organizacional (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const values = columns.map(col => jerarquiaData[col]);
      
      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (error) {
      console.error('Error creando jerarquía:', error);
      throw error;
    }
  },
  
  // Actualizar jerarquía organizacional
  async actualizarJerarquia(id, jerarquiaData) {
    try {
      const columns = Object.keys(jerarquiaData);
      const setClause = columns.map((col, index) => `${col} = $${index + 2}`).join(', ');
      
      const query = `
        UPDATE jerarquia_organizacional
        SET ${setClause}
        WHERE id = $1
        RETURNING *
      `;
      
      const values = [id, ...columns.map(col => jerarquiaData[col])];
      
      const { rows } = await pool.query(query, values);
      
      if (rows.length === 0) {
        throw new Error(`No se encontró jerarquía con ID: ${id}`);
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error actualizando jerarquía:', error);
      throw error;
    }
  }
};

export default adminService;