// src/services/databaseService.js
import pool from '../config/database.js';

export const databaseService = {
  // ==========================================
  // Operaciones genéricas
  // ==========================================

  // Seleccionar todos los registros de una tabla
  async seleccionar(tabla, columnas = '*', orden = {}, filtro = null) {
    try {
      let query = `SELECT ${columnas} FROM ${tabla}`;
      const values = [];
      
      // Aplicar filtro si existe
      if (filtro) {
        query += ' WHERE ';
        let condiciones = [];
        
        Object.entries(filtro).forEach(([columna, valor], index) => {
          // Para manejar operadores distintos a igualdad (ej: >=, <=, LIKE, etc)
          if (typeof valor === 'object' && valor !== null && valor.operador) {
            condiciones.push(`${columna} ${valor.operador} $${index + 1}`);
            values.push(valor.valor);
          } else {
            condiciones.push(`${columna} = $${index + 1}`);
            values.push(valor);
          }
        });
        
        query += condiciones.join(' AND ');
      }
      
      // Aplicar ordenamiento
      if (orden.columna) {
        query += ` ORDER BY ${orden.columna} ${orden.ascendente !== false ? 'ASC' : 'DESC'}`;
      }
      
      const { rows } = await pool.query(query, values);
      return rows;
    } catch (error) {
      console.error(`Error seleccionando de tabla ${tabla}:`, error);
      throw error;
    }
  },

  // Seleccionar un registro por ID
  async seleccionarPorId(tabla, id, columnas = '*') {
    try {
      const query = `SELECT ${columnas} FROM ${tabla} WHERE id = $1`;
      const { rows } = await pool.query(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error(`Error seleccionando registro con ID ${id} de tabla ${tabla}:`, error);
      throw error;
    }
  },

  // Insertar un nuevo registro
  async insertar(tabla, datos) {
    try {
      const columnas = Object.keys(datos).join(', ');
      const valores = Object.values(datos);
      const placeholders = valores.map((_, i) => `$${i + 1}`).join(', ');

      const query = `INSERT INTO ${tabla} (${columnas}) VALUES (${placeholders}) RETURNING *`;
      const { rows } = await pool.query(query, valores);
      return rows[0];
    } catch (error) {
      console.error(`Error insertando en tabla ${tabla}:`, error);
      throw error;
    }
  },

  // Actualizar un registro
  async actualizar(tabla, id, datos) {
    try {
      const columnas = Object.keys(datos).map((col, i) => `${col} = $${i + 1}`).join(', ');
      const valores = Object.values(datos);
      valores.push(id);

      const query = `UPDATE ${tabla} SET ${columnas} WHERE id = $${valores.length} RETURNING *`;
      const { rows } = await pool.query(query, valores);
      return rows[0] || null;
    } catch (error) {
      console.error(`Error actualizando registro con ID ${id} en tabla ${tabla}:`, error);
      throw error;
    }
  },

  // Eliminar un registro
  async eliminar(tabla, id) {
    try {
      const query = `DELETE FROM ${tabla} WHERE id = $1 RETURNING *`;
      const { rows } = await pool.query(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error(`Error eliminando registro con ID ${id} de tabla ${tabla}:`, error);
      throw error;
    }
  },

  // Seleccionar con filtro
  async seleccionarConFiltro(tabla, columna, valor, columnas = '*', orden = {}) {
    try {
      let query = `SELECT ${columnas} FROM ${tabla} WHERE ${columna} = $1`;
      if (orden.columna) {
        query += ` ORDER BY ${orden.columna} ${orden.ascendente !== false ? 'ASC' : 'DESC'}`;
      }
      const { rows } = await pool.query(query, [valor]);
      return rows;
    } catch (error) {
      console.error(`Error seleccionando con filtro de tabla ${tabla}:`, error);
      throw error;
    }
  },

  // Ejecutar consulta SQL personalizada
  async ejecutarConsulta(sql, params = []) {
    try {
      const { rows } = await pool.query(sql, params);
      return rows;
    } catch (error) {
      console.error(`Error ejecutando consulta SQL:`, error);
      throw error;
    }
  },
  
  // Contar registros que cumplen un filtro
  async contar(tabla, filtro = null) {
    try {
      let query = `SELECT COUNT(*) FROM ${tabla}`;
      const values = [];
      
      if (filtro) {
        query += ' WHERE ';
        let condiciones = [];
        
        Object.entries(filtro).forEach(([columna, valor], index) => {
          condiciones.push(`${columna} = $${index + 1}`);
          values.push(valor);
        });
        
        query += condiciones.join(' AND ');
      }
      
      const { rows } = await pool.query(query, values);
      return parseInt(rows[0].count);
    } catch (error) {
      console.error(`Error contando registros en tabla ${tabla}:`, error);
      throw error;
    }
  },

  // ==========================================
  // Operaciones específicas para miembros
  // ==========================================

  async obtenerMiembros() {
    return await this.seleccionarConFiltro('miembros', 'vigente', true, '*', { columna: 'apellidos' });
  },

  async obtenerMiembrosPorGrado(grado) {
    return await this.seleccionarConFiltro('miembros', 'grado', grado, '*', { columna: 'apellidos' });
  },

  // ==========================================
  // Operaciones específicas para programas docentes
  // ==========================================

  async obtenerProgramasPorGrado(grado) {
    try {
      const query = `
        SELECT p.*, u.username AS creador
        FROM programa_docente p
        LEFT JOIN usuarios u ON p.creado_por = u.id
        WHERE p.grado = $1
        ORDER BY p.fecha ASC
      `;
      const { rows } = await pool.query(query, [grado]);
      return rows;
    } catch (error) {
      console.error(`Error obteniendo programas de grado ${grado}:`, error);
      return [];
    }
  },

  // ==========================================
  // Operaciones específicas para documentos
  // ==========================================

  async obtenerDocumentosPorCategoria(categoria) {
    try {
      const query = `
        SELECT d.*, 
          m.id AS autor_id, m.nombres AS autor_nombres, m.apellidos AS autor_apellidos, 
          u.id AS subido_por_id, u.username AS subido_por_username
        FROM documentos d
        LEFT JOIN miembros m ON d.autor = m.id
        LEFT JOIN usuarios u ON d.subido_por = u.id
        WHERE d.categoria = $1
        ORDER BY d.created_at DESC
      `;
      const { rows } = await pool.query(query, [categoria]);
      return rows;
    } catch (error) {
      console.error(`Error obteniendo documentos de categoría ${categoria}:`, error);
      return [];
    }
  },

  // ==========================================
  // Operaciones específicas para usuarios
  // ==========================================

  async obtenerUsuarioPorUsername(username) {
    try {
      const query = `
        SELECT u.*, 
          m.id AS miembro_id, m.nombres, m.apellidos, m.email, m.telefono
        FROM usuarios u
        LEFT JOIN miembros m ON u.miembro_id = m.id
        WHERE u.username = $1 AND u.activo = true
      `;
      const { rows } = await pool.query(query, [username]);
      return rows[0] || null;
    } catch (error) {
      console.error(`Error obteniendo usuario ${username}:`, error);
      return null;
    }
  },

  async verificarCredenciales(username, password) {
    try {
      const query = `
        SELECT u.*, 
          m.id AS miembro_id, m.nombres, m.apellidos
        FROM usuarios u
        LEFT JOIN miembros m ON u.miembro_id = m.id
        WHERE u.username = $1 AND u.password = $2 AND u.activo = true
      `;
      const { rows } = await pool.query(query, [username, password]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error verificando credenciales:', error);
      return null;
    }
  },

  // ==========================================
  // Operaciones específicas para oficialidad
  // ==========================================

  async obtenerOficialidadActual() {
    try {
      const query = `
        SELECT o.id, o.nombre, o.periodo, 
          c.id AS cargo_id, c.cargo, c.tipo, c.es_admin, c.es_docente, c.grado_a_cargo,
          a.id AS asignacion_id, a.fecha_inicio, a.fecha_fin, a.activo,
          m.id AS miembro_id, m.nombres, m.apellidos, m.email, m.telefono
        FROM oficialidad o
        LEFT JOIN cargos_oficialidad c ON o.id = c.oficialidad_id
        LEFT JOIN asignacion_cargos a ON c.id = a.cargo_id AND a.activo = true
        LEFT JOIN miembros m ON a.miembro_id = m.id
        ORDER BY c.orden ASC
      `;
      const { rows } = await pool.query(query);
      return rows;
    } catch (error) {
      console.error('Error obteniendo oficialidad actual:', error);
      return [];
    }
  },
  
  // ==========================================
  // Transacciones
  // ==========================================
  
  // Iniciar transacción
  async iniciarTransaccion() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      return client;
    } catch (error) {
      client.release();
      throw error;
    }
  },
  
  // Confirmar transacción
  async confirmarTransaccion(client) {
    try {
      await client.query('COMMIT');
    } finally {
      client.release();
    }
  },
  
  // Revertir transacción
  async revertirTransaccion(client) {
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }
};

export default databaseService;