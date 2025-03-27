// src/services/documentosService.js
import pool from '../config/database.js';
import { databaseService } from './databaseService.js';

export const documentosService = {
  // Obtener documentos por categoría y subcategoría
  async obtenerPorCategoria(categoria, subcategoria = null) {
    try {
      let query = `
        SELECT 
          d.*,
          a.id as autor_id, a.nombres as autor_nombres, a.apellidos as autor_apellidos,
          u.id as subido_por_id, u.username as subido_por_username
        FROM documentos d
        LEFT JOIN miembros a ON d.autor = a.id
        LEFT JOIN usuarios u ON d.subido_por = u.id
        WHERE d.categoria = $1
      `;
      
      const params = [categoria];
      
      if (subcategoria) {
        query += ` AND d.subcategoria = $2`;
        params.push(subcategoria);
      }
      
      query += ` ORDER BY d.created_at DESC`;
      
      const { rows } = await pool.query(query, params);
      
      // Formatear el resultado para mantener compatibilidad
      return rows.map(doc => ({
        id: doc.id,
        nombre: doc.nombre,
        tipo: doc.tipo,
        tamano: doc.tamano,
        descripcion: doc.descripcion,
        url: doc.url,
        categoria: doc.categoria,
        subcategoria: doc.subcategoria,
        palabras_clave: doc.palabras_clave,
        created_at: doc.created_at,
        autor: doc.autor_id ? {
          id: doc.autor_id,
          nombres: doc.autor_nombres,
          apellidos: doc.autor_apellidos
        } : null,
        subido_por: doc.subido_por_id ? {
          id: doc.subido_por_id,
          username: doc.subido_por_username
        } : null
      }));
    } catch (error) {
      console.error(`Error obteniendo documentos de ${categoria}:`, error);
      return [];
    }
  },
  
  // Obtener documentos según el nivel de acceso del usuario
  async obtenerDocumentosPermitidos(userGrado) {
    try {
      let categorias = [];
      
      // Determinar qué categorías puede ver el usuario
      switch(userGrado) {
        case 'maestro':
          categorias = ['aprendices', 'companeros', 'maestros', 'general', 'administrativos'];
          break;
        case 'companero':
          categorias = ['aprendices', 'companeros', 'general'];
          break;
        case 'aprendiz':
        default:
          categorias = ['aprendices', 'general'];
          break;
      }
      
      // Crear placeholders para la consulta SQL
      const placeholders = categorias.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `
        SELECT 
          d.*,
          a.id as autor_id, a.nombres as autor_nombres, a.apellidos as autor_apellidos,
          u.id as subido_por_id, u.username as subido_por_username
        FROM documentos d
        LEFT JOIN miembros a ON d.autor = a.id
        LEFT JOIN usuarios u ON d.subido_por = u.id
        WHERE d.categoria IN (${placeholders})
        ORDER BY d.created_at DESC
      `;
      
      const { rows } = await pool.query(query, categorias);
      
      // Formatear el resultado para mantener compatibilidad
      return rows.map(doc => ({
        id: doc.id,
        nombre: doc.nombre,
        tipo: doc.tipo,
        tamano: doc.tamano,
        descripcion: doc.descripcion,
        url: doc.url,
        categoria: doc.categoria,
        subcategoria: doc.subcategoria,
        palabras_clave: doc.palabras_clave,
        created_at: doc.created_at,
        autor: doc.autor_id ? {
          id: doc.autor_id,
          nombres: doc.autor_nombres,
          apellidos: doc.autor_apellidos
        } : null,
        subido_por: doc.subido_por_id ? {
          id: doc.subido_por_id,
          username: doc.subido_por_username
        } : null
      }));
    } catch (error) {
      console.error('Error obteniendo documentos permitidos:', error);
      return [];
    }
  },
  
  // Buscar documentos por palabra clave
  async buscarPorPalabraClave(palabraClave, userGrado) {
    try {
      let categorias = [];
      
      // Determinar qué categorías puede ver el usuario
      switch(userGrado) {
        case 'maestro':
          categorias = ['aprendices', 'companeros', 'maestros', 'general', 'administrativos'];
          break;
        case 'companero':
          categorias = ['aprendices', 'companeros', 'general'];
          break;
        case 'aprendiz':
        default:
          categorias = ['aprendices', 'general'];
          break;
      }
      
      // Crear placeholders para la consulta SQL
      const placeholdersCategoria = categorias.map((_, index) => `$${index + 1}`).join(', ');
      const paramsBusqueda = [...categorias, `%${palabraClave}%`, `%${palabraClave}%`, `%${palabraClave}%`];
      
      const query = `
        SELECT 
          d.*,
          a.id as autor_id, a.nombres as autor_nombres, a.apellidos as autor_apellidos,
          u.id as subido_por_id, u.username as subido_por_username
        FROM documentos d
        LEFT JOIN miembros a ON d.autor = a.id
        LEFT JOIN usuarios u ON d.subido_por = u.id
        WHERE d.categoria IN (${placeholdersCategoria})
        AND (
          d.descripcion ILIKE $${categorias.length + 1} OR
          d.nombre ILIKE $${categorias.length + 2} OR
          d.palabras_clave ILIKE $${categorias.length + 3}
        )
        ORDER BY d.created_at DESC
      `;
      
      const { rows } = await pool.query(query, paramsBusqueda);
      
      // Formatear el resultado para mantener compatibilidad
      return rows.map(doc => ({
        id: doc.id,
        nombre: doc.nombre,
        tipo: doc.tipo,
        tamano: doc.tamano,
        descripcion: doc.descripcion,
        url: doc.url,
        categoria: doc.categoria,
        subcategoria: doc.subcategoria,
        palabras_clave: doc.palabras_clave,
        created_at: doc.created_at,
        autor: doc.autor_id ? {
          id: doc.autor_id,
          nombres: doc.autor_nombres,
          apellidos: doc.autor_apellidos
        } : null,
        subido_por: doc.subido_por_id ? {
          id: doc.subido_por_id,
          username: doc.subido_por_username
        } : null
      }));
    } catch (error) {
      console.error('Error buscando documentos:', error);
      return [];
    }
  },
  
  // Obtener planchas por grado
  async obtenerPlanchas(grado) {
    try {
      const query = `
        SELECT 
          p.*,
          a.id as autor_id, a.nombres as autor_nombres, a.apellidos as autor_apellidos,
          d.id as documento_id, d.nombre, d.tipo, d.tamano, d.descripcion, d.url, 
          d.categoria, d.subcategoria, d.palabras_clave, d.created_at
        FROM planchas p
        LEFT JOIN miembros a ON p.autor_id = a.id
        LEFT JOIN documentos d ON p.documento_id = d.id
        WHERE p.grado = $1
        ORDER BY p.fecha_presentacion DESC
      `;
      
      const { rows } = await pool.query(query, [grado]);
      
      // Formatear el resultado para mantener compatibilidad
      return rows.map(p => ({
        id: p.id,
        titulo: p.titulo,
        autor_id: p.autor_id,
        fecha_presentacion: p.fecha_presentacion,
        grado: p.grado,
        contenido: p.contenido,
        estado: p.estado,
        comentarios: p.comentarios,
        documento_id: p.documento_id,
        autor: p.autor_id ? {
          id: p.autor_id,
          nombres: p.autor_nombres,
          apellidos: p.autor_apellidos
        } : null,
        documento: p.documento_id ? {
          id: p.documento_id,
          nombre: p.nombre,
          tipo: p.tipo,
          tamano: p.tamano,
          descripcion: p.descripcion,
          url: p.url,
          categoria: p.categoria,
          subcategoria: p.subcategoria,
          palabras_clave: p.palabras_clave,
          created_at: p.created_at
        } : null
      }));
    } catch (error) {
      console.error(`Error obteniendo planchas de grado ${grado}:`, error);
      return [];
    }
  },
  
  // Obtener plancha por ID
  async obtenerPlanchaPorId(id) {
    try {
      const query = `
        SELECT 
          p.*,
          a.id as autor_id, a.nombres as autor_nombres, a.apellidos as autor_apellidos,
          d.id as documento_id, d.nombre, d.tipo, d.tamano, d.descripcion, d.url, 
          d.categoria, d.subcategoria, d.palabras_clave, d.created_at
        FROM planchas p
        LEFT JOIN miembros a ON p.autor_id = a.id
        LEFT JOIN documentos d ON p.documento_id = d.id
        WHERE p.id = $1
      `;
      
      const { rows } = await pool.query(query, [id]);
      
      if (rows.length === 0) {
        throw new Error(`No se encontró plancha con ID: ${id}`);
      }
      
      const p = rows[0];
      
      // Formatear el resultado
      return {
        id: p.id,
        titulo: p.titulo,
        autor_id: p.autor_id,
        fecha_presentacion: p.fecha_presentacion,
        grado: p.grado,
        contenido: p.contenido,
        estado: p.estado,
        comentarios: p.comentarios,
        documento_id: p.documento_id,
        autor: p.autor_id ? {
          id: p.autor_id,
          nombres: p.autor_nombres,
          apellidos: p.autor_apellidos
        } : null,
        documento: p.documento_id ? {
          id: p.documento_id,
          nombre: p.nombre,
          tipo: p.tipo,
          tamano: p.tamano,
          descripcion: p.descripcion,
          url: p.url,
          categoria: p.categoria,
          subcategoria: p.subcategoria,
          palabras_clave: p.palabras_clave,
          created_at: p.created_at
        } : null
      };
    } catch (error) {
      console.error(`Error obteniendo plancha con ID ${id}:`, error);
      throw error;
    }
  },
  
  // Crear nuevo documento
  async crear(documentoData) {
    try {
      // Obtener las columnas y valores
      const columns = Object.keys(documentoData);
      const values = Object.values(documentoData);
      
      // Crear placeholders para la consulta SQL
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `
        INSERT INTO documentos (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const { rows } = await pool.query(query, values);
      return rows[0];
    } catch (error) {
      console.error('Error creando documento:', error);
      throw error;
    }
  },
  
  // Actualizar documento existente
  async actualizar(id, documentoData) {
    try {
      // Obtener las columnas y valores
      const columns = Object.keys(documentoData);
      const values = Object.values(documentoData);
      
      // Crear la parte SET de la consulta SQL
      const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');
      
      // Añadir el ID como último parámetro
      values.push(id);
      
      const query = `
        UPDATE documentos
        SET ${setClause}
        WHERE id = $${values.length}
        RETURNING *
      `;
      
      const { rows } = await pool.query(query, values);
      
      if (rows.length === 0) {
        throw new Error(`No se encontró documento con ID: ${id}`);
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error actualizando documento:', error);
      throw error;
    }
  },
  
  // Eliminar documento
  async eliminar(id) {
    try {
      const query = `
        DELETE FROM documentos
        WHERE id = $1
        RETURNING *
      `;
      
      const { rows } = await pool.query(query, [id]);
      
      if (rows.length === 0) {
        throw new Error(`No se encontró documento con ID: ${id} para eliminar`);
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error eliminando documento:', error);
      throw error;
    }
  },
  
  // Crear nueva plancha
  async crearPlancha(planchaData, documentoData = null) {
    const client = await databaseService.iniciarTransaccion();
    
    try {
      let documentoId = planchaData.documento_id || null;
      
      // Si tenemos datos de documento, creamos primero el documento
      if (documentoData) {
        const documentoColumnas = Object.keys(documentoData);
        const documentoValores = Object.values(documentoData);
        const documentoPlaceholders = documentoValores.map((_, index) => `$${index + 1}`).join(', ');
        
        const documentoQuery = `
          INSERT INTO documentos (${documentoColumnas.join(', ')})
          VALUES (${documentoPlaceholders})
          RETURNING *
        `;
        
        const documentoResult = await client.query(documentoQuery, documentoValores);
        documentoId = documentoResult.rows[0].id;
      }
      
      // Crear la plancha con el documento asociado
      planchaData.documento_id = documentoId;
      
      const planchaColumnas = Object.keys(planchaData);
      const planchaValores = Object.values(planchaData);
      const planchaPlaceholders = planchaValores.map((_, index) => `$${index + 1}`).join(', ');
      
      const planchaQuery = `
        INSERT INTO planchas (${planchaColumnas.join(', ')})
        VALUES (${planchaPlaceholders})
        RETURNING *
      `;
      
      const planchaResult = await client.query(planchaQuery, planchaValores);
      
      await databaseService.confirmarTransaccion(client);
      return planchaResult.rows[0];
    } catch (error) {
      await databaseService.revertirTransaccion(client);
      console.error('Error creando plancha:', error);
      throw error;
    }
  },
  
  // Actualizar plancha
  async actualizarPlancha(id, planchaData) {
    try {
      // Obtener las columnas y valores
      const columns = Object.keys(planchaData);
      const values = Object.values(planchaData);
      
      // Crear la parte SET de la consulta SQL
      const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');
      
      // Añadir el ID como último parámetro
      values.push(id);
      
      const query = `
        UPDATE planchas
        SET ${setClause}
        WHERE id = $${values.length}
        RETURNING *
      `;
      
      const { rows } = await pool.query(query, values);
      
      if (rows.length === 0) {
        throw new Error(`No se encontró plancha con ID: ${id}`);
      }
      
      return rows[0];
    } catch (error) {
      console.error('Error actualizando plancha:', error);
      throw error;
    }
  },
  
  // Eliminar plancha
  async eliminarPlancha(id) {
    const client = await databaseService.iniciarTransaccion();
    
    try {
      // Primero obtenemos el ID del documento asociado
      const planchaQuery = `
        SELECT documento_id FROM planchas
        WHERE id = $1
      `;
      
      const planchaResult = await client.query(planchaQuery, [id]);
      
      if (planchaResult.rows.length === 0) {
        throw new Error(`No se encontró plancha con ID: ${id}`);
      }
      
      const documentoId = planchaResult.rows[0].documento_id;
      
      // Eliminar la plancha
      const deletePlanchaQuery = `
        DELETE FROM planchas
        WHERE id = $1
        RETURNING *
      `;
      
      await client.query(deletePlanchaQuery, [id]);
      
      // Si hay un documento asociado, eliminarlo también
      if (documentoId) {
        const deleteDocumentoQuery = `
          DELETE FROM documentos
          WHERE id = $1
          RETURNING *
        `;
        
        await client.query(deleteDocumentoQuery, [documentoId]);
      }
      
      await databaseService.confirmarTransaccion(client);
      return true;
    } catch (error) {
      await databaseService.revertirTransaccion(client);
      console.error('Error eliminando plancha:', error);
      throw error;
    }
  }
};

export default documentosService;