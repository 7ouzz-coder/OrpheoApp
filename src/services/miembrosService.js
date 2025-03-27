// src/services/miembrosService.js
import { supabase } from '../config/database';

export const miembrosService = {
  // Obtener todos los miembros
  async obtenerTodos() {
    try {
      const { data, error } = await supabase
        .from('miembros')
        .select('*')
        .eq('vigente', true)
        .order('apellidos', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo todos los miembros:', error);
      return [];
    }
  },

  // Obtener miembro por ID
  async obtenerPorId(id) {
    try {
      const { data, error } = await supabase
        .from('miembros')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error obteniendo miembro con ID ${id}:`, error);
      throw error;
    }
  },

  // Obtener miembros por grado 'aprendiz'
  async obtenerAprendices() {
    try {
      const { data, error } = await supabase
        .from('miembros')
        .select('*')
        .eq('grado', 'aprendiz')
        .eq('vigente', true)
        .order('apellidos', { ascending: true });
      
      if (error) {
        console.error('Error en obtenerAprendices:', error);
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Error fatal en obtenerAprendices:', error);
      return [];
    }
  },

  // Obtener miembros por grado 'companero'
  async obtenerCompaneros() {
    try {
      const { data, error } = await supabase
        .from('miembros')
        .select('*')
        .eq('grado', 'companero')
        .eq('vigente', true)
        .order('apellidos', { ascending: true });
      
      if (error) {
        console.error('Error en obtenerCompaneros:', error);
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Error fatal en obtenerCompaneros:', error);
      return [];
    }
  },

  // Obtener miembros por grado 'maestro'
  async obtenerMaestros() {
    try {
      const { data, error } = await supabase
        .from('miembros')
        .select('*')
        .eq('grado', 'maestro')
        .eq('vigente', true)
        .order('apellidos', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error cargando maestros:', error);
      return [];
    }
  },

  // Obtener miembros de la oficialidad
  async obtenerOficialidad() {
    try {
      // Para modo DEMO/Desarrollo: Si no hay conexión a la BD, devolver datos de ejemplo
      if (!supabase || process.env.NODE_ENV === 'development') {
        console.log('Modo DEMO: Usando datos de oficialidad de muestra');
        return getOficialidadDemoData();
      }
      
      // Primero obtenemos la oficialidad activa
      const { data: oficialidad, error: oficialidadError } = await supabase
        .from('oficialidad')
        .select('id')
        .order('periodo_inicio', { ascending: false })
        .limit(1);
      
      if (oficialidadError) {
        console.log('Error al obtener oficialidad:', oficialidadError);
        return getOficialidadDemoData();
      }
      
      if (!oficialidad || oficialidad.length === 0) {
        console.log('No se encontró información de oficialidad');
        return getOficialidadDemoData();
      }

      const oficialidadId = oficialidad[0].id;

      // Obtenemos los cargos de la oficialidad
      const { data: cargos, error: cargosError } = await supabase
        .from('cargos_oficialidad')
        .select(`
          id,
          cargo,
          tipo,
          es_admin,
          es_docente,
          grado_a_cargo,
          orden,
          asignaciones:asignacion_cargos(
            id,
            fecha_inicio,
            fecha_fin,
            activo,
            miembro:miembro_id(
              id,
              nombres,
              apellidos,
              email,
              telefono,
              profesion
            )
          )
        `)
        .eq('oficialidad_id', oficialidadId)
        .order('orden', { ascending: true });
      
      if (cargosError) {
        console.error('Error obteniendo cargos:', cargosError);
        return getOficialidadDemoData();
      }

      // Formateamos los datos para presentación
      const result = cargos.map(cargo => {
        // Buscamos la asignación activa para este cargo
        const asignacionActiva = cargo.asignaciones?.find(a => a.activo);
        
        return {
          id: cargo.id,
          cargo: cargo.cargo,
          tipo: cargo.tipo,
          es_admin: cargo.es_admin,
          es_docente: cargo.es_docente,
          grado_a_cargo: cargo.grado_a_cargo,
          miembro: asignacionActiva?.miembro || null
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
      const { data: miembro, error } = await supabase
        .from('miembros')
        .update(data)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return miembro;
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
      
      const { data, error } = await supabase
        .from('miembros')
        .select('*')
        .or(`nombres.ilike.%${searchTerms}%,apellidos.ilike.%${searchTerms}%,rut.ilike.%${searchTerms}%,profesion.ilike.%${searchTerms}%`)
        .eq('vigente', true);
      
      if (error) throw error;
      return data || [];
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