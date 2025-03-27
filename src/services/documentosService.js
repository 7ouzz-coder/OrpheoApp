// src/services/documentosService.js
import pool from '../config/database.js';
import { databaseService } from './databaseService.js';
import fs from 'fs';
import path from 'path';

// Configuración para almacenamiento local de archivos
const STORAGE_DIR = process.env.STORAGE_DIR || './storage';
const DOCUMENTOS_DIR = path.join(STORAGE_DIR, 'documentos');
const PLANCHAS_DIR = path.join(STORAGE_DIR, 'planchas');

// Asegurar que los directorios existan
try {
  if (!fs.existsSync(STORAGE_DIR)){
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(DOCUMENTOS_DIR)){
    fs.mkdirSync(DOCUMENTOS_DIR, { recursive: true });
  }
  if (!fs.existsSync(PLANCHAS_DIR)){
    fs.mkdirSync(PLANCHAS_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Error creando directorios de almacenamiento:', error);
}

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
          palabras_clave: p.palabras_clave