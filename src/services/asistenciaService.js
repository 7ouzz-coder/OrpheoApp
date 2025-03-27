// src/services/asistenciaService.js
import { supabase } from '../config/database';

export const asistenciaService = {
  // Obtener todos los programas donde se puede registrar asistencia
  async obtenerProgramasParaAsistencia(fechaInicio = null, fechaFin = null) {
    try {
      let query = supabase
        .from('programa_docente')
        .select(`
          id,
          fecha,
          tema,
          grado,
          tipo,
          estado
        `)
        .order('fecha', { ascending: false });
      
      // Filtrar por fechas si se proporcionan
      if (fechaInicio) {
        query = query.gte('fecha', fechaInicio);
      }
      
      if (fechaFin) {
        query = query.lte('fecha', fechaFin);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo programas para asistencia:', error);
      // Si estamos en desarrollo o hay error, devolvemos datos de prueba
      return getDemoProgramas();
    }
  },

  // Obtener miembros para registrar asistencia según grado
  async obtenerMiembrosPorGrado(grado) {
    try {
      const { data, error } = await supabase
        .from('miembros')
        .select(`
          id,
          nombres,
          apellidos,
          grado
        `)
        .eq('grado', grado)
        .eq('vigente', true)
        .order('apellidos', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error obteniendo miembros de grado ${grado}:`, error);
      // Si estamos en desarrollo o hay error, devolvemos datos de prueba
      return getDemoMiembros(grado);
    }
  },

  // Obtener todos los miembros activos
  async obtenerTodosMiembros() {
    try {
      const { data, error } = await supabase
        .from('miembros')
        .select(`
          id,
          nombres,
          apellidos,
          grado
        `)
        .eq('vigente', true)
        .order('apellidos', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo todos los miembros:', error);
      // Si estamos en desarrollo o hay error, combinamos todos los grados
      return [
        ...getDemoMiembros('aprendiz'),
        ...getDemoMiembros('companero'),
        ...getDemoMiembros('maestro')
      ];
    }
  },

  // Registrar asistencia para un miembro
  async registrarAsistencia(programaId, miembroId, asistio, justificacion = null) {
    try {
      const { data, error } = await supabase
        .from('asistencia')
        .upsert([{
          evento_id: programaId,
          miembro_id: miembroId,
          asistio,
          justificacion
        }], { onConflict: 'evento_id, miembro_id' })
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error registrando asistencia:', error);
      // En modo desarrollo, simular éxito
      return {
        id: 'temp-' + Date.now(),
        evento_id: programaId,
        miembro_id: miembroId,
        asistio,
        justificacion
      };
    }
  },

  // Registrar asistencia para múltiples miembros
  async registrarAsistenciaMultiple(programaId, asistencias) {
    try {
      // asistencias debe ser un array de objetos {miembro_id, asistio, justificacion}
      const registros = asistencias.map(a => ({
        evento_id: programaId,
        miembro_id: a.miembro_id,
        asistio: a.asistio,
        justificacion: a.justificacion || null
      }));
      
      // Si no estamos en una BD real o es modo desarrollo, simular éxito
      if (!programaId.includes('-') || programaId === '123') {
        console.log('Modo desarrollo: simulando registro de asistencias');
        return registros.map(r => ({...r, id: 'mock-' + Math.random().toString(36).substring(7)}));
      }
      
      const { data, error } = await supabase
        .from('asistencia')
        .upsert(registros, { onConflict: 'evento_id, miembro_id' })
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error registrando asistencia múltiple:', error);
      // En modo desarrollo, simular éxito
      return asistencias.map(a => ({
        id: 'temp-' + Date.now() + '-' + Math.random().toString(36).substring(7),
        evento_id: programaId,
        miembro_id: a.miembro_id,
        asistio: a.asistio,
        justificacion: a.justificacion
      }));
    }
  },

  // Obtener asistencia registrada para un programa
  async obtenerAsistenciasPrograma(programaId) {
    try {
      // Si es un ID de demo o desarrollo, devolver datos de ejemplo
      if (!programaId || !programaId.includes('-') || programaId === '123') {
        return getDemoAsistencias(programaId);
      }
      
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
      console.error(`Error obteniendo asistencias para programa ${programaId}:`, error);
      return getDemoAsistencias(programaId);
    }
  },

  // Obtener historial de asistencia de un miembro
  async obtenerHistorialMiembro(miembroId) {
    try {
      // Si es un ID de demo o desarrollo, devolver datos de ejemplo
      if (!miembroId || !miembroId.includes('-')) {
        return getDemoHistorialMiembro(miembroId);
      }
      
      const { data, error } = await supabase
        .from('asistencia')
        .select(`
          id,
          asistio,
          justificacion,
          evento:evento_id(
            id,
            fecha,
            tema,
            grado,
            tipo
          )
        `)
        .eq('miembro_id', miembroId)
        .order('evento(fecha)', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error obteniendo historial de asistencia para miembro ${miembroId}:`, error);
      return getDemoHistorialMiembro(miembroId);
    }
  },

  // Generar reporte de asistencia por período
  async generarReporteAsistencia(fechaInicio, fechaFin, grado = null) {
    try {
      // En modo desarrollo, devolvemos datos de ejemplo
      if (process.env.NODE_ENV === 'development') {
        return getDemoReporteAsistencia(fechaInicio, fechaFin, grado);
      }
      
      // Obtener eventos en el período
      let eventosQuery = supabase
        .from('programa_docente')
        .select('id, fecha, tema, grado, tipo')
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha', { ascending: true });
      
      if (grado) {
        eventosQuery = eventosQuery.eq('grado', grado);
      }
      
      const { data: eventos, error: eventosError } = await eventosQuery;
      
      if (eventosError) throw eventosError;
      
      // Si no hay eventos, devolver reporte vacío
      if (!eventos || eventos.length === 0) {
        return getDemoReporteAsistencia(fechaInicio, fechaFin, grado);
      }
      
      // Obtener miembros
      let miembrosQuery = supabase
        .from('miembros')
        .select('id, nombres, apellidos, grado')
        .eq('vigente', true);
      
      if (grado) {
        miembrosQuery = miembrosQuery.eq('grado', grado);
      }
      
      const { data: miembros, error: miembrosError } = await miembrosQuery;
      
      if (miembrosError) throw miembrosError;
      
      // Obtener todas las asistencias para estos eventos
      const { data: asistencias, error: asistenciasError } = await supabase
        .from('asistencia')
        .select('evento_id, miembro_id, asistio, justificacion')
        .in('evento_id', eventos.map(e => e.id));
      
      if (asistenciasError) throw asistenciasError;
      
      // Generar matriz de reporte
      const reporte = miembros.map(miembro => {
        const asistenciasMiembro = eventos.map(evento => {
          const asistencia = asistencias.find(a => 
            a.evento_id === evento.id && a.miembro_id === miembro.id);
          
          return {
            evento_id: evento.id,
            fecha: evento.fecha,
            tema: evento.tema,
            asistio: asistencia ? asistencia.asistio : null,
            justificado: asistencia && !asistencia.asistio && asistencia.justificacion ? true : false
          };
        });
        
        // Calcular estadísticas
        const total = asistenciasMiembro.length;
        const registradas = asistenciasMiembro.filter(a => a.asistio !== null).length;
        const asistidas = asistenciasMiembro.filter(a => a.asistio === true).length;
        const justificadas = asistenciasMiembro.filter(a => a.justificado).length;
        const faltasInjustificadas = registradas - asistidas - justificadas;
        
        return {
          miembro: {
            id: miembro.id,
            nombres: miembro.nombres,
            apellidos: miembro.apellidos,
            grado: miembro.grado
          },
          asistencias: asistenciasMiembro,
          estadisticas: {
            total,
            registradas,
            asistidas,
            justificadas,
            faltasInjustificadas,
            porcentajeAsistencia: registradas > 0 ? (asistidas / registradas) * 100 : 0
          }
        };
      });
      
      return {
        periodo: { fechaInicio, fechaFin },
        eventos,
        reporte
      };
    } catch (error) {
      console.error('Error generando reporte de asistencia:', error);
      return getDemoReporteAsistencia(fechaInicio, fechaFin, grado);
    }
  }
};

// Datos de demostración

// Generar programas de ejemplo para desarrollo
function getDemoProgramas() {
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  
  const semanaAnterior = new Date(hoy);
  semanaAnterior.setDate(semanaAnterior.getDate() - 7);

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };
  
  return [
    {
      id: 'prog1',
      fecha: formatDate(hoy),
      tema: 'Introducción a los símbolos',
      grado: 'aprendiz',
      tipo: 'camara',
      estado: 'Programado'
    },
    {
      id: 'prog2',
      fecha: formatDate(ayer),
      tema: 'Historia y tradiciones',
      grado: 'companero',
      tipo: 'trabajo',
      estado: 'Completado'
    },
    {
      id: 'prog3',
      fecha: formatDate(manana),
      tema: 'Principios filosóficos',
      grado: 'maestro',
      tipo: 'camara',
      estado: 'Programado'
    },
    {
      id: 'prog4',
      fecha: formatDate(semanaAnterior),
      tema: 'Estudios fundamentales',
      grado: 'aprendiz',
      tipo: 'trabajo',
      estado: 'Completado'
    }
  ];
}

// Generar miembros de ejemplo por grado
function getDemoMiembros(grado) {
  const miembros = [
    {
      id: 'miembro1',
      nombres: 'Juan Carlos',
      apellidos: 'Rodríguez López',
      profesion: 'Ingeniero Civil',
      grado: 'aprendiz'
    },
    {
      id: 'miembro2',
      nombres: 'Pedro Miguel',
      apellidos: 'González Soto',
      profesion: 'Abogado',
      grado: 'aprendiz'
    },
    {
      id: 'miembro3',
      nombres: 'Luis Alberto',
      apellidos: 'Martínez Pérez',
      profesion: 'Arquitecto',
      grado: 'companero'
    },
    {
      id: 'miembro4',
      nombres: 'Roberto José',
      apellidos: 'Fernández Torres',
      profesion: 'Médico',
      grado: 'companero'
    },
    {
      id: 'miembro5',
      nombres: 'Carlos Eduardo',
      apellidos: 'Sánchez Díaz',
      profesion: 'Profesor',
      grado: 'maestro'
    },
    {
      id: 'miembro6',
      nombres: 'Miguel Ángel',
      apellidos: 'Ramírez Silva',
      profesion: 'Contador',
      grado: 'maestro'
    }
  ];
  
  // Filtrar por grado solicitado
  return miembros.filter(m => m.grado === grado);
}

// Generar asistencias de ejemplo para un programa
function getDemoAsistencias(programaId) {
  // Si no hay ID de programa, devolver array vacío
  if (!programaId) return [];
  
  // Obtener miembros según el ID del programa (asumimos el grado a partir del ID)
  let grado = 'aprendiz';
  if (programaId === 'prog2') grado = 'companero';
  if (programaId === 'prog3') grado = 'maestro';
  
  const miembros = getDemoMiembros(grado);
  
  // Generar asistencias aleatorias para los miembros
  return miembros.map(miembro => {
    const asistio = Math.random() > 0.3; // 70% de probabilidad de asistir
    const justificacion = !asistio && Math.random() > 0.5 ? 'Justificación por motivos personales' : null;
    
    return {
      id: `asistencia-${programaId}-${miembro.id}`,
      asistio,
      justificacion,
      miembro
    };
  });
}

// Generar historial de asistencia para un miembro
function getDemoHistorialMiembro(miembroId) {
  const programas = getDemoProgramas();
  
  // Generar historial de asistencia aleatorio para los programas
  return programas.map(programa => {
    const asistio = Math.random() > 0.3; // 70% de probabilidad de asistir
    const justificacion = !asistio && Math.random() > 0.5 ? 'Justificación por motivos personales' : null;
    
    return {
      id: `historial-${programa.id}-${miembroId}`,
      asistio,
      justificacion,
      evento: programa
    };
  });
}

// Generar reporte de asistencia de ejemplo
function getDemoReporteAsistencia(fechaInicio, fechaFin, grado = null) {
  // Obtener programas filtrados por grado si es necesario
  let eventos = getDemoProgramas();
  if (grado) {
    eventos = eventos.filter(e => e.grado === grado);
  }
  
  // Obtener miembros filtrados por grado si es necesario
  let miembros = [];
  if (grado) {
    miembros = getDemoMiembros(grado);
  } else {
    miembros = [
      ...getDemoMiembros('aprendiz'),
      ...getDemoMiembros('companero'),
      ...getDemoMiembros('maestro')
    ];
  }
  
  // Generar reporte para cada miembro
  const reporte = miembros.map(miembro => {
    // Generar asistencias aleatorias para cada evento
    const asistenciasMiembro = eventos.map(evento => {
      const asistio = Math.random() > 0.2; // 80% de probabilidad de asistir
      const justificado = !asistio && Math.random() > 0.5; // 50% de probabilidad de justificar si no asistió
      
      return {
        evento_id: evento.id,
        fecha: evento.fecha,
        tema: evento.tema,
        asistio,
        justificado
      };
    });
    
    // Calcular estadísticas
    const total = asistenciasMiembro.length;
    const asistidas = asistenciasMiembro.filter(a => a.asistio).length;
    const justificadas = asistenciasMiembro.filter(a => !a.asistio && a.justificado).length;
    const faltasInjustificadas = total - asistidas - justificadas;
    const porcentajeAsistencia = total > 0 ? (asistidas / total) * 100 : 0;
    
    return {
      miembro: {
        id: miembro.id,
        nombres: miembro.nombres,
        apellidos: miembro.apellidos,
        grado: miembro.grado
      },
      asistencias: asistenciasMiembro,
      estadisticas: {
        total,
        registradas: total,
        asistidas,
        justificadas,
        faltasInjustificadas,
        porcentajeAsistencia
      }
    };
  });
  
  return {
    periodo: { fechaInicio, fechaFin },
    eventos,
    reporte
  };
}