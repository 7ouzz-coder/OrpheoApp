// src/utils/index.js

// Exportamos todas nuestras utilidades desde un solo archivo
export { default as navigationHelper } from './navigationHelper';

// Si estás usando utilidades de depuración, descomenta esto
// export { debugHelper } from './debugHelper';

// Para verificar la base de datos, esto puede ser útil
// export { checkDatabaseStructure } from './checkDatabaseStructure';
// export { testSupabaseConnection } from './testSupabaseConnection';

// Utilidad para manejo de listas y evitar errores de FlatList anidada
export const listHelper = {
  /**
   * Divide una lista en subgrupos para renderizar en una FlatList
   * Esto puede ayudar a evitar anidación de FlatList/VirtualizedList
   * 
   * @param {Array} data - El array original
   * @param {number} chunkSize - Tamaño de cada grupo
   * @returns {Array} - Array de arrays agrupados
   */
  chunkArray: (data, chunkSize = 10) => {
    if (!Array.isArray(data)) return [];
    
    const chunks = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
  },
  
  /**
   * Extrae secciones de un array para usar con SectionList
   * Útil para convertir una lista plana en secciones
   * 
   * @param {Array} data - El array original
   * @param {Function} getSectionKey - Función para obtener la clave de sección
   * @param {Function} sectionSortFn - Función opcional para ordenar secciones
   * @returns {Array} - Array de objetos {title, data} para SectionList
   */
  createSections: (data, getSectionKey, sectionSortFn = null) => {
    if (!Array.isArray(data)) return [];
    
    // Agrupar por sección
    const sections = {};
    data.forEach(item => {
      const key = getSectionKey(item);
      if (!sections[key]) {
        sections[key] = [];
      }
      sections[key].push(item);
    });
    
    // Convertir a formato de SectionList
    const result = Object.keys(sections).map(key => ({
      title: key,
      data: sections[key]
    }));
    
    // Aplicar ordenamiento si se proporciona una función
    if (typeof sectionSortFn === 'function') {
      result.sort(sectionSortFn);
    }
    
    return result;
  }
};

// Utilidad para evitar el error de "texto fuera de componente Text"
export const textHelper = {
  /**
   * Asegura que un valor sea un string seguro para usar
   * @param {any} value - Valor a convertir
   * @returns {string} - String seguro
   */
  safeString: (value) => {
    if (value === undefined || value === null) return '';
    return String(value);
  },
  
  /**
   * Trunca un texto a un cierto límite con puntos suspensivos
   * @param {string} text - Texto a truncar
   * @param {number} limit - Límite de caracteres
   * @returns {string} - Texto truncado
   */
  truncate: (text, limit = 100) => {
    if (!text) return '';
    text = String(text);
    if (text.length <= limit) return text;
    return text.slice(0, limit) + '...';
  },
  
  /**
   * Formatea fechas consistentemente en la aplicación
   * @param {string|Date} date - Fecha a formatear
   * @returns {string} - Fecha formateada
   */
  formatDate: (date) => {
    if (!date) return '';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return String(date);
    }
  }
};

// Utilidad para evitar errores en navigación
export const navScreenHelper = {
  /**
   * Registra una navegación para detectar problemas
   * @param {string} screenName - Nombre de la pantalla
   * @param {object} params - Parámetros
   */
  logNavigation: (screenName, params = {}) => {
    console.log(`Navegando a: ${screenName}`, params);
  },
  
  /**
   * Verifica si una pantalla existe en el navegador
   * @param {object} navigation - Objeto de navegación
   * @param {string} screenName - Nombre de la pantalla a verificar
   * @returns {boolean} - true si existe, false si no
   */
  screenExists: (navigation, screenName) => {
    try {
      const state = navigation.getState();
      const routes = state.routes;
      
      // Verificar en rutas actuales
      if (routes.some(route => route.name === screenName)) {
        return true;
      }
      
      // Verificar en rutas anidadas
      for (const route of routes) {
        if (route.state && route.state.routes) {
          if (route.state.routes.some(nestedRoute => nestedRoute.name === screenName)) {
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.warn('Error verificando existencia de pantalla:', error);
      return false;
    }
  }
};

// Exportar todo en un objeto global
export default {
  navigation: navigationHelper,
  list: listHelper,
  text: textHelper,
  screen: navScreenHelper
};