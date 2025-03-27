// src/services/miembrosService.js
import pool from '../config/database.js';
import { databaseService } from './databaseService.js';

export const miembrosService = {
  // Obtener todos los miembros
  async obtenerTodos() {
    try {
      const query = `
        SELECT * FROM miembros
        WHERE vigente = true
        ORDER BY apellidos ASC
      `;
      
      const { rows } = await pool.query(query);
      return rows || [];
    } catch (error) {
      console.error('Error obteniendo todos los miembros:', error);
      return [];
    }
  },

  // Obtener miembro por ID
  async obtenerPorId(id) {
    try {
      const query = `
        SELECT * FROM miembros
        WHERE id = $1
      `;
      
      const { rows } = await pool.query(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error(`Error obteniendo miembro con ID ${id}:`, error);
      throw error;
    }
  },

  // Obtener miembros por grado 'aprendiz'
  async obtenerAprendices() {
    try {
      const query = `
        SELECT * FROM miembros
        WHERE grado = 'aprendiz' AND vigente = true
        ORDER BY apellidos ASC
      `;
      
      const { rows } = await pool.query(query);
      return rows || [];
    } catch (error) {
      console.error('Error en obtenerAprendices:', error);
      throw error;
    }
  },

  // Obtener miembros por grado 'companero'
  async obtenerCompaneros() {
    try {
      const query = `
        SELECT * FROM miembros
        WHERE grado = 'companero' AND vigente = true
        ORDER BY apellidos ASC
      `;
      
      const { rows } = await pool.query(query);
      return rows || [];
    } catch (error) {
      console.error('Error en obtenerCompaneros:', error);
      throw error;
    }
  },

  // Obtener miembros por grado 'maestro'
  async obtenerMaestros() {
    try {
      const query = `
        SELECT * FROM miembros
        WHERE grado = 'maestro' AND vigente = true
        ORDER BY apellidos ASC
      `;
      
      const { rows } = await pool.query(query);
      return rows || [];
    } catch (error) {
      console.error('Error cargando maestros:', error);
      return [];
    }
  },

  // Obtener miembros de la oficialidad
  async obtenerOficialidad() {
    try {
      // Para modo DEMO/Desarrollo: Si no hay conexión a la BD, devolver datos de ejemplo
      if (process.env.NODE_ENV === 'development') {
        console.log('Modo DEMO: Usando datos de oficialidad de muestra');
        return getOficialidadDemoData();
      }
      
      // Primero obtenemos la oficialidad activa
      const oficialidadQuery = `
        SELECT id FROM oficialidad
        ORDER BY periodo_inicio DESC
        LIMIT 1
      `;
      
      const oficialidadResult = await pool.query(oficialidadQuery);
      
      if (oficialidadResult.rows.length === 0) {
        console.log('No se encontró información de oficialidad');
        return getOficialidadDemoData();
      }
      
      const oficialidadId = oficialidadResult.rows[0].id;

      // Obtenemos los cargos de la oficialidad
      const cargosQuery = `
        SELECT 
          c.id, c.cargo, c.tipo, c.es_admin, c.es_docente, c.grado_a_cargo, c.orden,
          a.id as asignacion_id, a.fecha_inicio, a.fecha_fin, a.activo,
          m.id as miembro_id, m.nombres, m.apellidos, m.email, m.telefono, m.profesion
        FROM cargos_oficialidad c
        LEFT JOIN asignacion_cargos a ON c.id = a.cargo_id AND a.activo = true
        LEFT JOIN miembros m ON a.miembro_id = m.id
        WHERE c.oficialidad_id = $1
        ORDER BY c.orden ASC
      `;
      
      const cargosResult = await pool.query(cargosQuery, [oficialidadId]);
      
      // Formateamos los datos para presentación
      const result = cargosResult.rows.map(cargo => {
        return {
          id: cargo.id,
          cargo: cargo.cargo,
          tipo: cargo.tipo,
          es_admin: cargo.es_admin,
          es_docente: cargo.es_docente,
          grado_a_cargo: cargo.grado_a_cargo,
          miembro: cargo.miembro_id ? {
            id: cargo.miembro_id,
            nombres: cargo.nombres,
            apellidos: cargo.apellidos,
            email: cargo.email,
            telefono: cargo.telefono,
            profesion: cargo.profesion
          } : null
        };
      });

      return result || [];
    } catch (error) {
      console.error('Error obteniendo oficialidad:', error);
      return getOficialidadDemoData();
    }
  },

  // Actualizar información de un miembro
  async actualizar(id, data) {
    try {
      // Convertir el objeto data en columnas y valores para la consulta SQL
      const columns = Object.keys(data);
      const values = Object.values(data);
      
      // Crear placeholders para la consulta preparada ($1, $2, etc.)
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      
      // Crear la parte SET de la consulta SQL
      const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');
      
      // Añadir el ID del miembro como último parámetro
      values.push(id);
      
      const query = `
        UPDATE miembros 
        SET ${setClause} 
        WHERE id = $${values.length} 
        RETURNING *
      `;
      
      const { rows } = await pool.query(query, values);
      return rows[0] || null;
    } catch (error) {
      console.error('Error actualizando miembro:', error);
      throw error;
    }
  },

  // Buscar miembros
  async buscar(query) {
    try {
      // Convertir la consulta a minúsculas para búsqueda insensible a mayúsculas/minúsculas
      const searchTerms = query.toLowerCase();
      
      const sqlQuery = `
        SELECT * FROM miembros
        WHERE 
          (LOWER(nombres) LIKE $1 OR
          LOWER(apellidos) LIKE $1 OR
          LOWER(rut) LIKE $1 OR
          LOWER(profesion) LIKE $1)
        AND vigente = true
      `;
      
      const { rows } = await pool.query(sqlQuery, [`%${searchTerms}%`]);
      return rows || [];
    } catch (error) {
      console.error('Error buscando miembros:', error);
      return [];
    }
  }
};

// Función para obtener datos de oficialidad de ejemplo para modo DEMO
function getOficialidadDemoData() {
  return [
    {
      id: '1',
      cargo: 'Presidente',
      tipo: 'directiva',
      es_admin: true,
      es_docente: false,
      miembro: {
        id: '101',
        nombres: 'Roberto',
        apellidos: 'Silva',
        email: 'roberto.silva@ejemplo.com',
        telefono: '+56912345678',
        profesion: 'Ingeniero'
      }
    },
    {
      id: '2',
      cargo: 'Ex Presidente',
      tipo: 'directiva',
      es_admin: false,
      es_docente: false,
      miembro: {
        id: '102',
        nombres: 'Carlos',
        apellidos: 'Rodríguez',
        email: 'carlos.rodriguez@ejemplo.com',
        telefono: '+56912345679',
        profesion: 'Abogado'
      }
    },
    {
      id: '3',
      cargo: 'Primer Vicepresidente',
      tipo: 'directiva',
      es_admin: false,
      es_docente: true,
      grado_a_cargo: 'Compañeros',
      miembro: {
        id: '103',
        nombres: 'Jorge',
        apellidos: 'Soto',
        email: 'jorge.soto@ejemplo.com',
        telefono: '+56912345680',
        profesion: 'Médico'
      }
    },
    {
      id: '4',
      cargo: 'Segundo Vicepresidente',
      tipo: 'directiva',
      es_admin: false,
      es_docente: true,
      grado_a_cargo: 'Aprendices',
      miembro: {
        id: '104',
        nombres: 'Luis',
        apellidos: 'Martínez',
        email: 'luis.martinez@ejemplo.com',
        telefono: '+56912345681',
        profesion: 'Profesor'
      }
    },
    {
      id: '5',
      cargo: 'Orador',
      tipo: 'directiva',
      es_admin: false,
      es_docente: true,
      grado_a_cargo: 'Maestros',
      miembro: {
        id: '105',
        nombres: 'Pedro',
        apellidos: 'González',
        email: 'pedro.gonzalez@ejemplo.com',
        telefono: '+56912345682',
        profesion: 'Escritor'
      }
    },
    {
      id: '6',
      cargo: 'Secretario',
      tipo: 'directiva',
      es_admin: true,
      es_docente: false,
      miembro: {
        id: '106',
        nombres: 'Juan',
        apellidos: 'Pérez',
        email: 'juan.perez@ejemplo.com',
        telefono: '+56912345683',
        profesion: 'Contador'
      }
    },
    {
      id: '7',
      cargo: 'Tesorero',
      tipo: 'directiva',
      es_admin: false,
      es_docente: false,
      miembro: {
        id: '107',
        nombres: 'Miguel',
        apellidos: 'López',
        email: 'miguel.lopez@ejemplo.com',
        telefono: '+56912345684',
        profesion: 'Economista'
      }
    }
  ];
}

export default miembrosService;