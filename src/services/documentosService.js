// src/services/documentosService.js
import { supabase } from '../config/database';

export const documentosService = {
  // Obtener documentos por categoría y subcategoría
  async obtenerPorCategoria(categoria, subcategoria = null) {
    try {
      let query = supabase
        .from('documentos')
        .select(`
          *,
          autor:autor(
            id,
            nombres,
            apellidos
          ),
          subido_por:subido_por(
            id,
            username
          )
        `)
        .eq('categoria', categoria)
        .order('created_at', { ascending: false });
      
      if (subcategoria) {
        query = query.eq('subcategoria', subcategoria);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
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
      
      const { data, error } = await supabase
        .from('documentos')
        .select(`
          *,
          autor:autor(
            id,
            nombres,
            apellidos
          ),
          subido_por:subido_por(
            id,
            username
          )
        `)
        .in('categoria', categorias)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
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
      
      // Buscar en palabras clave, descripción y nombre
      const { data, error } = await supabase
        .from('documentos')
        .select(`
          *,
          autor:autor(
            id,
            nombres,
            apellidos
          ),
          subido_por:subido_por(
            id,
            username
          )
        `)
        .in('categoria', categorias)
        .or(`descripcion.ilike.%${palabraClave}%,nombre.ilike.%${palabraClave}%,palabras_clave.ilike.%${palabraClave}%`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error buscando documentos:', error);
      return [];
    }
  },
  
  // Obtener planchas por grado
  async obtenerPlanchas(grado) {
    try {
      const { data, error } = await supabase
        .from('planchas')
        .select(`
          *,
          autor:autor_id(
            id,
            nombres,
            apellidos
          ),
          documento:documento_id(*)
        `)
        .eq('grado', grado)
        .order('fecha_presentacion', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error obteniendo planchas de ${grado}:`, error);
      return [];
    }
  },
  
  // Obtener plancha por ID
  async obtenerPlanchaPorId(id) {
    try {
      const { data, error } = await supabase
        .from('planchas')
        .select(`
          *,
          autor:autor_id(
            id,
            nombres,
            apellidos
          ),
          documento:documento_id(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error obteniendo plancha por ID:', error);
      throw error;
    }
  },
  
  // Crear nueva plancha
  async crearPlancha(plancha, documento) {
    try {
      // Primero creamos el documento
      const { data: docData, error: docError } = await supabase
        .from('documentos')
        .insert([documento])
        .select();
      
      if (docError) throw docError;
      
      // Luego creamos la plancha con referencia al documento
      const planchaCompleta = {
        ...plancha,
        documento_id: docData[0].id
      };
      
      const { data, error } = await supabase
        .from('planchas')
        .insert([planchaCompleta])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error creando plancha:', error);
      throw error;
    }
  },
  
  // Actualizar plancha
  async actualizarPlancha(id, plancha) {
    try {
      const { data, error } = await supabase
        .from('planchas')
        .update(plancha)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error actualizando plancha:', error);
      throw error;
    }
  },
  
  // Crear documento
  async crear(documento) {
    try {
      // Si el usuario actual está identificado, asignar como subido_por
      if (global.userId && !documento.subido_por) {
        documento.subido_por = global.userId;
      }
      
      const { data, error } = await supabase
        .from('documentos')
        .insert([documento])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error creando documento:', error);
      throw error;
    }
  },
  
  // Eliminar documento
  async eliminar(id) {
    try {
      // Verificar si el documento está siendo usado en alguna plancha
      const { data: planchas, error: planchasError } = await supabase
        .from('planchas')
        .select('id')
        .eq('documento_id', id);
      
      if (planchasError) throw planchasError;
      
      // Si el documento está siendo usado, no lo eliminamos
      if (planchas && planchas.length > 0) {
        throw new Error('No se puede eliminar el documento porque está siendo usado en una plancha');
      }
      
      const { data, error } = await supabase
        .from('documentos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error eliminando documento:', error);
      throw error;
    }
  },
  
  // Obtener documento por ID
  async obtenerPorId(id) {
    try {
      const { data, error } = await supabase
        .from('documentos')
        .select(`
          *,
          autor:autor(
            id,
            nombres,
            apellidos
          ),
          subido_por:subido_por(
            id,
            username
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error obteniendo documento por ID:', error);
      throw error;
    }
  },
  
  // Actualizar documento
  async actualizar(id, documento) {
    try {
      const { data, error } = await supabase
        .from('documentos')
        .update(documento)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error actualizando documento:', error);
      throw error;
    }
  }
};