// src/services/adminService.js
import { supabase } from '../config/database';

export const adminService = {
  // Obtener todos los usuarios con detalles
  async obtenerUsuarios() {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          miembro:miembro_id(
            id,
            nombres,
            apellidos,
            cargo,
            grado
          )
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      return [];
    }
  },
  
  // Obtener usuarios pendientes de aprobación
  async obtenerUsuariosPendientes() {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          miembro:miembro_id(
            id,
            nombres,
            apellidos,
            rut,
            email,
            telefono,
            profesion
          )
        `)
        .eq('activo', false)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error obteniendo usuarios pendientes:', error);
      return [];
    }
  },
  
  // Aprobar usuario
  async aprobarUsuario(id, rol, grado) {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .update({ 
          activo: true,
          rol: rol || 'general',
          grado: grado || 'aprendiz'
        })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error aprobando usuario:', error);
      throw error;
    }
  },
  
  // Rechazar/eliminar usuario
  async rechazarUsuario(id) {
    try {
      // Primero obtenemos el ID del miembro asociado
      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('miembro_id')
        .eq('id', id)
        .single();
        
      if (usuarioError) throw usuarioError;
      
      // Eliminamos el usuario
      const { error: deleteUserError } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id);
        
      if (deleteUserError) throw deleteUserError;
      
      // Si hay un miembro asociado, lo eliminamos también
      if (usuario && usuario.miembro_id) {
        const { error: deleteMiembroError } = await supabase
          .from('miembros')
          .delete()
          .eq('id', usuario.miembro_id);
          
        if (deleteMiembroError) throw deleteMiembroError;
      }
      
      return true;
    } catch (error) {
      console.error('Error rechazando usuario:', error);
      throw error;
    }
  },
  
  // Cambiar rol de usuario
  async cambiarRolUsuario(id, nuevoRol) {
    try {
      // Validar que sea un rol válido
      if (!['general', 'admin', 'superadmin'].includes(nuevoRol)) {
        throw new Error('Rol no válido');
      }
      
      const { data, error } = await supabase
        .from('usuarios')
        .update({ rol: nuevoRol })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error cambiando rol:', error);
      throw error;
    }
  },
  
  // Cambiar grado de un usuario
  async cambiarGradoUsuario(id, nuevoGrado) {
    try {
      // Validar que sea un grado válido
      if (!['aprendiz', 'companero', 'maestro'].includes(nuevoGrado)) {
        throw new Error('Grado no válido');
      }
      
      // Obtener el miembro_id del usuario
      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('miembro_id')
        .eq('id', id)
        .single();
      
      if (usuarioError) throw usuarioError;
      
      // Actualizar el grado del usuario
      const { data, error } = await supabase
        .from('usuarios')
        .update({ grado: nuevoGrado })
        .eq('id', id)
        .select();
      
      if (error) throw error;
      
      // Si hay un miembro asociado, también actualizamos su grado
      if (usuario && usuario.miembro_id) {
        await supabase
          .from('miembros')
          .update({ grado: nuevoGrado })
          .eq('id', usuario.miembro_id);
      }
      
      return data[0];
    } catch (error) {
      console.error('Error cambiando grado:', error);
      throw error;
    }
  },
  
  // Crear o actualizar oficialidad
  async gestionarOficialidad(oficialidadData) {
    try {
      const { data, error } = await supabase
        .from('oficialidad')
        .upsert([oficialidadData])
        .select();
        
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error gestionando oficialidad:', error);
      throw error;
    }
  },
  
  // Crear o actualizar cargo de oficialidad
  async gestionarCargoOficialidad(cargoData) {
    try {
      const { data, error } = await supabase
        .from('cargos_oficialidad')
        .upsert([cargoData])
        .select();
        
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error gestionando cargo de oficialidad:', error);
      throw error;
    }
  },
  
  // Asignar cargo a un miembro
  async asignarCargo(asignacionData) {
    try {
      // Primero desactivamos cualquier asignación actual para este cargo
      if (asignacionData.cargo_id) {
        await supabase
          .from('asignacion_cargos')
          .update({ activo: false, fecha_fin: new Date().toISOString().split('T')[0] })
          .eq('cargo_id', asignacionData.cargo_id)
          .eq('activo', true);
      }
      
      // Ahora creamos la nueva asignación
      const { data, error } = await supabase
        .from('asignacion_cargos')
        .insert([{
          cargo_id: asignacionData.cargo_id,
          miembro_id: asignacionData.miembro_id,
          fecha_inicio: asignacionData.fecha_inicio || new Date().toISOString().split('T')[0],
          activo: true
        }])
        .select();
        
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error asignando cargo:', error);
      throw error;
    }
  },
  
  // Obtener estadísticas para dashboard
  async obtenerEstadisticas() {
    try {
      // Total de miembros
      const { count: totalMiembros, error: countError } = await supabase
        .from('miembros')
        .select('id', { count: 'exact', head: true })
        .eq('vigente', true);
        
      if (countError) throw countError;
      
      // Conteo por grados
      const { data: aprendices, error: aprendicesError } = await supabase
        .from('miembros')
        .select('id')
        .eq('grado', 'aprendiz')
        .eq('vigente', true);
        
      if (aprendicesError) throw aprendicesError;
      
      const { data: companeros, error: companeroError } = await supabase
        .from('miembros')
        .select('id')
        .eq('grado', 'companero')
        .eq('vigente', true);
        
      if (companeroError) throw companeroError;
      
      const { data: maestros, error: maestrosError } = await supabase
        .from('miembros')
        .select('id')
        .eq('grado', 'maestro')
        .eq('vigente', true);
        
      if (maestrosError) throw maestrosError;
      
      // Usuarios pendientes
      const { count: pendientesCount, error: pendientesError } = await supabase
        .from('usuarios')
        .select('id', { count: 'exact', head: true })
        .eq('activo', false);
        
      if (pendientesError) throw pendientesError;
      
      // Próximos eventos
      const today = new Date().toISOString().split('T')[0];
      const { data: proximosEventos, error: eventosError } = await supabase
        .from('programa_docente')
        .select('*')
        .gte('fecha', today)
        .order('fecha', { ascending: true })
        .limit(5);
        
      if (eventosError) throw eventosError;
      
      return {
        totalMiembros: totalMiembros || 0,
        aprendices: aprendices?.length || 0,
        companeros: companeros?.length || 0,
        maestros: maestros?.length || 0,
        pendientes: pendientesCount || 0,
        proximosEventos: proximosEventos || []
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  },
  
  // Crear jerarquía organizacional
  async crearJerarquia(jerarquiaData) {
    try {
      const { data, error } = await supabase
        .from('jerarquia_organizacional')
        .insert([jerarquiaData])
        .select();
        
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error creando jerarquía:', error);
      throw error;
    }
  },
  
  // Actualizar jerarquía organizacional
  async actualizarJerarquia(id, jerarquiaData) {
    try {
      const { data, error } = await supabase
        .from('jerarquia_organizacional')
        .update(jerarquiaData)
        .eq('id', id)
        .select();
        
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error actualizando jerarquía:', error);
      throw error;
    }
  }
};