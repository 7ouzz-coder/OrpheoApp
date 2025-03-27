// src/services/programaService.js
import pool from '../config/database.js';
import { databaseService } from './databaseService.js';

export const programaService = {
  // Obtener programas por grado y tipo
  async obtenerPorGradoYTipo(grado, tipo) {
    try {
      const query = `
        SELECT * FROM programa_docente
        WHERE grado = $1 AND tipo = $2
        ORDER BY fecha ASC
      `;
      
      const { rows } = await pool.query(query, [grado, tipo]);
      return rows || [];
    } catch (error) {
      console.error(`Error obteniendo programas de ${grado} (${tipo}):`, error);
      return [];
    }
  },
  
  // Obtener todos los programas según el nivel de acceso del usuario
  async obtenerProgramasPermitidos(userGrado) {
    try {
      let grados = [];
      
      // Determinar qué grados puede ver el usuario
      switch(userGrado) {
        case 'maestro':
          grados = ['aprendiz', 'companero', 'maestro', 'general'];
          break;
        case 'companero':
          grados = ['aprendiz', 'companero', 'general'];
          break;
        case 'aprendiz':
        default:
          grados = ['aprendiz', 'general'];
          break;
      }
      
      const placeholders = grados.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `
        SELECT p.*, u.username AS creador
        FROM programa_docente p
        LEFT JOIN usuarios u ON p.creado_por = u.id
        WHERE p.grado IN (${placeholders})
        ORDER BY p.fecha ASC
      `;
        
      const { rows } = await pool.query(query, grados);
      return rows || [];
    } catch (error) {
      console.error('Error obteniendo programas permitidos:', error);
      return [];
    }
  },
  
  // Obtener programas por tipo (cámara o trabajo)
  async obtenerPorTipo(tipo) {
    try {
      const query = `
        SELECT p.*, u.username AS creador
        FROM programa_docente p
        LEFT JOIN usuarios u ON p.creado_por = u.id
        WHERE p.tipo = $1
        ORDER BY p.fecha ASC
      `;
      
      const { rows } = await pool.query(query, [tipo]);
      return rows || [];
    } catch (error) {
      console.error(`Error obteniendo programas de tipo ${tipo}:`, error);
      return [];
    }
  },
  
  // Obtener programa por ID con detalles
  async obtenerPorId(id) {
    try {
      const query = `
        SELECT p.*, u.username AS creador
        FROM programa_docente p
        LEFT JOIN usuarios u ON p.creado_por = u.id
        WHERE p.id = $1
      `;
      
      const { rows } = await pool.query(query, [id]);
      
      if (rows.length === 0) {
        throw new Error(`No se encontró programa con ID: ${id}`);
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error obteniendo programa por ID:', error);
      throw error;
    }
  },

  // Crear nuevo programa
  async crear(programa) {
    try {
      // Asegurarse de que programa.creado_por esté establecido (usuario actual)
      if (!programa.creado_por && global.userId) {
        programa.creado_por = global.userId;
      }
      
      // Obtener las columnas y valores del objeto programa
      const columns = Object.keys(programa);
      const values = Object.values(programa);
      
      // Crear los placeholders para la consulta SQL ($1, $2, etc.)
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `
        INSERT INTO programa_docente (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (error) {
      console.error('Error creando programa:', error);
      throw error;
    }
  },
  
  // Actualizar programa existente
  async actualizar(id, programa) {
    try {
      // Obtener las columnas y valores del objeto programa
      const columns = Object.keys(programa);
      const values = Object.values(programa);
      
      // Crear la parte SET de la consulta SQL
      const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');
      
      // Añadir el ID como último parámetro
      values.push(id);
      
      const query = `
        UPDATE programa_docente
        SET ${setClause}
        WHERE id = $${values.length}
        RETURNING *
      `;
      
      const { rows } = await pool.query(query, values);
      
      if (rows.length === 0) {
        throw new Error(`No se encontró programa con ID: ${id}`);
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error actualizando programa:', error);
      throw error;
    }
  },
  
  // Eliminar programa
  async eliminar(id) {
    try {
      const query = `
        DELETE FROM programa_docente
        WHERE id = $1
        RETURNING *
      `;
      
      const { rows } = await pool.query(query, [id]);
      
      if (rows.length === 0) {
        throw new Error(`No se encontró programa con ID: ${id} para eliminar`);
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error eliminando programa:', error);
      throw error;
    }
  },
  
  // Registrar asistencia a un programa
  async registrarAsistencia(programaId, miembroId, asistio, justificacion = null) {
    try {
      // Primero verificamos si ya existe una asistencia para este miembro en este programa
      const checkQuery = `
        SELECT id FROM asistencia
        WHERE evento_id = $1 AND miembro_id = $2
      `;
      
      const checkResult = await pool.query(checkQuery, [programaId, miembroId]);
      
      let result;
      
      if (checkResult.rows.length > 0) {
        // Ya existe, actualizamos
        const updateQuery = `
          UPDATE asistencia
          SET asistio = $3, justificacion = $4
          WHERE evento_id = $1 AND miembro_id = $2
          RETURNING *
        `;
        
        result = await pool.query(updateQuery, [programaId, miembroId, asistio, justificacion]);
      } else {
        // No existe, insertamos
        const insertQuery = `
          INSERT INTO asistencia (evento_id, miembro_id, asistio, justificacion)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `;
        
        result = await pool.query(insertQuery, [programaId, miembroId, asistio, justificacion]);
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error registrando asistencia:', error);
      throw error;
    }
  },
  
  // Obtener asistencia de un programa
  async obtenerAsistencia(programaId) {
    try {
      const query = `
        SELECT 
          a.id, a.asistio, a.justificacion,
          m.id as miembro_id, m.nombres, m.apellidos, m.grado
        FROM asistencia a
        LEFT JOIN miembros m ON a.miembro_id = m.id
        WHERE a.evento_id = $1
      `;
      
      const { rows } = await pool.query(query, [programaId]);
      
      // Formatear los resultados para mantener compatibilidad con la estructura anterior
      return rows.map(row => ({
        id: row.id,
        asistio: row.asistio,
        justificacion: row.justificacion,
        miembro: {
          id: row.miembro_id,
          nombres: row.nombres,
          apellidos: row.apellidos,
          grado: row.grado
        }
      }));
    } catch (error) {
      console.error('Error obteniendo asistencia:', error);
      return [];
    }
  },
  
  // Obtener jerarquía organizacional por tipo
  async obtenerJerarquia(tipo) {
    try {
      const query = `
        SELECT * FROM jerarquia_organizacional
        WHERE tipo = $1
      `;
      
      const { rows } = await pool.query(query, [tipo]);
      return rows || [];
    } catch (error) {
      console.error(`Error obteniendo jerarquía de tipo ${tipo}:`, error);
      return [];
    }
  },
  
  // Obtener toda la jerarquía organizacional
  async obtenerTodaJerarquia() {
    try {
      const query = `
        SELECT * FROM jerarquia_organizacional
        ORDER BY tipo ASC
      `;
      
      const { rows } = await pool.query(query);
      return rows || [];
    } catch (error) {
      console.error('Error obteniendo toda la jerarquía:', error);
      return [];
    }
  },
  
  // Actualizar jerarquía
  async actualizarJerarquia(id, datos) {
    try {
      // Obtener las columnas y valores
      const columns = Object.keys(datos);
      const values = Object.values(datos);
      
      // Crear la parte SET de la consulta SQL
      const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');
      
      // Añadir el ID como último parámetro
      values.push(id);
      
      const query = `
        UPDATE jerarquia_organizacional
        SET ${setClause}
        WHERE id = $${values.length}
        RETURNING *
      `;
      
      const { rows } = await pool.query(query, values);
      
      if (rows.length === 0) {
        throw new Error(`No se encontró jerarquía con ID: ${id}`);
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error actualizando jerarquía:', error);
      throw error;
    }
  },
  
  // Obtener programas próximos
  async obtenerProgramasProximos(limit = 5) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const query = `
        SELECT *
        FROM programa_docente
        WHERE fecha >= $1
        ORDER BY fecha ASC
        LIMIT $2
      `;
      
      const { rows } = await pool.query(query, [today, limit]);
      return rows || [];
    } catch (error) {
      console.error('Error obteniendo programas próximos:', error);
      return [];
    }
  },
  
  // Obtener estadísticas de asistencia por miembro
  async obtenerEstadisticasAsistenciaMiembro(miembroId) {
    try {
      // Obtener todas las asistencias del miembro
      const query = `
        SELECT asistio, justificacion
        FROM asistencia
        WHERE miembro_id = $1
      `;
      
      const { rows } = await pool.query(query, [miembroId]);
      
      // Calcular estadísticas
      const total = rows.length;
      const asistidas = rows.filter(a => a.asistio).length;
      const justificadas = rows.filter(a => !a.asistio && a.justificacion).length;
      const injustificadas = total - asistidas - justificadas;
      
      return {
        total,
        asistidas,
        justificadas,
        injustificadas,
        porcentajeAsistencia: total > 0 ? Math.round((asistidas / total) * 100) : 0
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de asistencia:', error);
      throw error;
    }
  }
};

export default programaService;