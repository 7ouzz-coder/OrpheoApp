// src/services/programaService.js
import { supabase } from '../config/database';

export const programaService = {
  // Obtener programas por grado y tipo
  async obtenerPorGradoYTipo(grado, tipo) {
    try {
      const { data, error } = await supabase
        .from('programa_docente')
        .select('*')
        .eq('grado', grado)
        .eq('tipo', tipo)
        .order('fecha', { ascending: true });
      
      if (error) throw error;
      return data || [];
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
      
      const { data, error } = await supabase
        .from('programa_docente')
        .select(`
          *,
          creador:creado_por(username)
        `)
        .in('grado', grados)
        .order('fecha', { ascending: true });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo programas permitidos:', error);
      return [];
    }
  },
  
  // Obtener programas por tipo (cámara o trabajo)
  async obtenerPorTipo(tipo) {
    try {
      const { data, error } = await supabase
        .from('programa_docente')
        .select(`
          *,
          creador:creado_por(username)
        `)
        .eq('tipo', tipo)
        .order('fecha', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error obteniendo programas de tipo ${tipo}:`, error);
      return [];
    }
  },
  
  // Obtener programa por ID con detalles
  async obtenerPorId(id) {
    try {
      const { data, error } = await supabase
        .from('programa_docente')
        .select(`
          *,
          creador:creado_por(username)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
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
      
      const { data, error } = await supabase
        .from('programa_docente')
        .insert([programa])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error creando programa:', error);
      throw error;
    }
  },
  
  // Actualizar programa existente
  async actualizar(id, programa) {
    try {
      const { data, error } = await supabase
        .from('programa_docente')
        .update(programa)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error actualizando programa:', error);
      throw error;
    }
  },
  
  // Eliminar programa
  async eliminar(id) {
    try {
      const { data, error } = await supabase
        .from('programa_docente')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error eliminando programa:', error);
      throw error;
    }
  },
  
  // Registrar asistencia a un programa
  async registrarAsistencia(programaId, miembroId, asistio, justificacion = null) {
    try {
      const { data, error } = await supabase
        .from('asistencia')
        .upsert([{
          evento_id: programaId,
          miembro_id: miembroId,
          asistio,
          justificacion
        }], { onConflict: 'miembro_id, evento_id' })
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error registrando asistencia:', error);
      throw error;
    }
  },
  
  // Obtener asistencia de un programa
  async obtenerAsistencia(programaId) {
    try {
      const { data, error } = await supabase
        .from('asistencia')
        .select(`
          id,
          asistio,
          justificacion,
          miembro:miembro_id(
            id,
            nombres,
            apellidos,
            grado
          )
        `)
        .eq('evento_id', programaId);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo asistencia:', error);
      return [];
    }
  },
  
  // Obtener jerarquía organizacional por tipo
  async obtenerJerarquia(tipo) {
    try {
      const { data, error } = await supabase
        .from('jerarquia_organizacional')
        .select('*')
        .eq('tipo', tipo);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error obteniendo jerarquía de tipo ${tipo}:`, error);
      return [];
    }
  },
  
  // Obtener toda la jerarquía organizacional
  async obtenerTodaJerarquia() {
    try {
      const { data, error } = await supabase
        .from('jerarquia_organizacional')
        .select('*')
        .order('tipo', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo toda la jerarquía:', error);
      return [];
    }
  },
  
  // Actualizar jerarquía
  async actualizarJerarquia(id, datos) {
    try {
      const { data, error } = await supabase
        .from('jerarquia_organizacional')
        .update(datos)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error actualizando jerarquía:', error);
      throw error;
    }
  },
  
  // Obtener programas próximos
  async obtenerProgramasProximos(limit = 5) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('programa_docente')
        .select('*')
        .gte('fecha', today)
        .order('fecha', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo programas próximos:', error);
      return [];
    }
  },
  
  // Obtener estadísticas de asistencia por miembro
  async obtenerEstadisticasAsistenciaMiembro(miembroId) {
    try {
      // Obtener todas las asistencias del miembro
      const { data: asistencias, error: asistenciasError } = await supabase
        .from('asistencia')
        .select('asistio, justificacion')
        .eq('miembro_id', miembroId);
      
      if (asistenciasError) throw asistenciasError;
      
      // Calcular estadísticas
      const total = asistencias.length;
      const asistidas = asistencias.filter(a => a.asistio).length;
      const justificadas = asistencias.filter(a => !a.asistio && a.justificacion).length;
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