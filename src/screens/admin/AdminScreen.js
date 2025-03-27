// src/screens/admin/AdminScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../config/database';

export default function AdminScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [stats, setStats] = useState({
    totalMiembros: 0,
    aprendices: 0,
    companeros: 0,
    maestros: 0,
    pendientes: 0,
    ultimosRegistros: []
  });

  // Estados para modales
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showUserEditModal, setShowUserEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editUserData, setEditUserData] = useState({
    rol: 'general',
    grado: 'aprendiz',
    activo: true
  });

  const isSuperAdmin = global.userRole === 'superadmin';
  const isAdmin = global.userRole === 'admin' || isSuperAdmin;

  // Cargar datos al iniciar
  useEffect(() => {
    if (isAdmin) {
      loadData();
    } else {
      navigation.goBack();
      Alert.alert('Acceso Denegado', 'No tienes permiso para acceder a esta sección.');
    }
  }, []);

  // Cargar todos los datos necesarios
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadStats(),
        loadPendingUsers(),
        loadAllUsers(),
        loadMiembros()
      ]);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setError('Ocurrió un error al cargar los datos. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar estadísticas
  const loadStats = async () => {
    try {
      // Total miembros
      const { count: totalMiembros } = await supabase
        .from('miembros')
        .select('id', { count: 'exact', head: true })
        .eq('vigente', true);
      
      // Aprendices
      const { count: aprendices } = await supabase
        .from('miembros')
        .select('id', { count: 'exact', head: true })
        .eq('grado', 'aprendiz')
        .eq('vigente', true);
      
      // Compañeros
      const { count: companeros } = await supabase
        .from('miembros')
        .select('id', { count: 'exact', head: true })
        .eq('grado', 'companero')
        .eq('vigente', true);
      
      // Maestros
      const { count: maestros } = await supabase
        .from('miembros')
        .select('id', { count: 'exact', head: true })
        .eq('grado', 'maestro')
        .eq('vigente', true);
      
      // Pendientes
      const { count: pendientes } = await supabase
        .from('usuarios')
        .select('id', { count: 'exact', head: true })
        .eq('activo', false);
      
      // Últimos registros
      const { data: ultimosRegistros } = await supabase
        .from('usuarios')
        .select(`
          id,
          username,
          created_at,
          miembro_id,
          miembro:miembro_id(
            nombres,
            apellidos
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalMiembros: totalMiembros || 0,
        aprendices: aprendices || 0,
        companeros: companeros || 0,
        maestros: maestros || 0,
        pendientes: pendientes || 0,
        ultimosRegistros: ultimosRegistros || []
      });
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      throw error;
    }
  };

  // Cargar usuarios pendientes
  const loadPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          id,
          username,
          email,
          rol,
          grado,
          activo,
          created_at,
          miembro_id,
          miembro:miembro_id (
            id,
            nombres,
            apellidos,
            rut,
            email,
            telefono,
            profesion,
            cargo
          )
        `)
        .eq('activo', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPendingUsers(data || []);
    } catch (error) {
      console.error('Error cargando usuarios pendientes:', error);
      throw error;
    }
  };

  // Cargar todos los usuarios
  const loadAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          id,
          username,
          email,
          rol,
          grado,
          activo,
          created_at,
          miembro_id,
          miembro:miembro_id (
            id,
            nombres,
            apellidos,
            rut,
            grado,
            cargo,
            email,
            telefono,
            profesion
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error('Error cargando todos los usuarios:', error);
      throw error;
    }
  };

  // Cargar miembros
  const loadMiembros = async () => {
    try {
      const { data, error } = await supabase
        .from('miembros')
        .select(`
          id,
          nombres,
          apellidos,
          rut,
          fecha_nacimiento,
          profesion,
          email,
          telefono,
          direccion,
          cargo,
          grado,
          fecha_iniciacion,
          fecha_aumento_salario,
          fecha_exaltacion,
          vigente
        `)
        .order('apellidos', { ascending: true });
      
      if (error) throw error;
      setMiembros(data || []);
    } catch (error) {
      console.error('Error cargando miembros:', error);
      throw error;
    }
  };

  // Abrir modal para aprobar usuario
  const handleApproveUser = (user) => {
    setSelectedUser(user);
    setEditUserData({
      rol: 'general',
      grado: 'aprendiz',
      activo: true
    });
    setShowApproveModal(true);
  };

  // Abrir modal para editar usuario
  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditUserData({
      rol: user.rol,
      grado: user.grado,
      activo: user.activo
    });
    setShowUserEditModal(true);
  };

  // Verificar si el usuario actual puede editar a otro usuario
  const canEditUser = (user) => {
    // Super admin puede editar a cualquiera
    if (isSuperAdmin) return true;
    
    // Admin normal no puede editar a otros admins
    if (user.rol === 'admin' || user.rol === 'superadmin') return false;
    
    return true;
  };

  // Aprobar usuario pendiente
  const confirmApproval = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      
      // Actualizar usuario
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          rol: editUserData.rol,
          grado: editUserData.grado,
          activo: true
        })
        .eq('id', selectedUser.id);
      
      if (updateError) throw updateError;
      
      // Actualizar miembro
      if (selectedUser.miembro_id) {
        const { error: miembroError } = await supabase
          .from('miembros')
          .update({
            grado: editUserData.grado
          })
          .eq('id', selectedUser.miembro_id);
        
        if (miembroError) throw miembroError;
      }
      
      Alert.alert('Éxito', 'Usuario aprobado correctamente');
      setShowApproveModal(false);
      await loadData();
    } catch (error) {
      console.error('Error aprobando usuario:', error);
      Alert.alert('Error', 'No se pudo aprobar el usuario');
    } finally {
      setLoading(false);
    }
  };

  // Actualizar usuario existente
  const confirmUserUpdate = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      
      // Actualizar usuario
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          rol: editUserData.rol,
          grado: editUserData.grado,
          activo: editUserData.activo
        })
        .eq('id', selectedUser.id);
      
      if (updateError) throw updateError;
      
      // Actualizar miembro
      if (selectedUser.miembro_id) {
        const { error: miembroError } = await supabase
          .from('miembros')
          .update({
            grado: editUserData.grado,
            vigente: editUserData.activo
          })
          .eq('id', selectedUser.miembro_id);
        
        if (miembroError) throw miembroError;
      }
      
      Alert.alert('Éxito', 'Usuario actualizado correctamente');
      setShowUserEditModal(false);
      await loadData();
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      Alert.alert('Error', 'No se pudo actualizar el usuario');
    } finally {
      setLoading(false);
    }
  };

  // Rechazar usuario pendiente
  const handleRejectUser = (user) => {
    Alert.alert(
      'Confirmar Rechazo',
      '¿Estás seguro de rechazar este usuario? Esta acción eliminará al usuario y sus datos relacionados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Rechazar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Primero obtener el ID del miembro asociado
              const miembroId = user.miembro_id;
              
              // Eliminar el usuario
              const { error: userError } = await supabase
                .from('usuarios')
                .delete()
                .eq('id', user.id);
              
              if (userError) throw userError;
              
              // Si hay un miembro asociado, eliminarlo también
              if (miembroId) {
                const { error: miembroError } = await supabase
                  .from('miembros')
                  .delete()
                  .eq('id', miembroId);
                
                if (miembroError) throw miembroError;
              }
              
              Alert.alert('Éxito', 'Usuario rechazado correctamente');
              await loadData();
            } catch (error) {
              console.error('Error rechazando usuario:', error);
              Alert.alert('Error', 'No se pudo rechazar el usuario');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Eliminar usuario
  const handleDeleteUser = (user) => {
    Alert.alert(
      'Confirmar Eliminación',
      '¿Estás seguro de eliminar este usuario? Esta acción eliminará al usuario y sus datos relacionados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Verificar si es un superadmin (solo superadmin puede eliminar)
              if (user.rol === 'superadmin' && !isSuperAdmin) {
                Alert.alert('Error', 'No tienes permiso para eliminar un super administrador');
                setLoading(false);
                return;
              }
              
              // Verificar si es un admin y el usuario actual no es superadmin
              if (user.rol === 'admin' && !isSuperAdmin) {
                Alert.alert('Error', 'No tienes permiso para eliminar un administrador');
                setLoading(false);
                return;
              }
              
              // Eliminar el usuario
              const { error: userError } = await supabase
                .from('usuarios')
                .delete()
                .eq('id', user.id);
              
              if (userError) throw userError;
              
              // Si hay un miembro asociado, marcarlo como no vigente
              if (user.miembro_id) {
                const { error: miembroError } = await supabase
                  .from('miembros')
                  .update({ vigente: false })
                  .eq('id', user.miembro_id);
                
                if (miembroError) throw miembroError;
              }
              
              Alert.alert('Éxito', 'Usuario eliminado correctamente');
              await loadData();
            } catch (error) {
              console.error('Error eliminando usuario:', error);
              Alert.alert('Error', 'No se pudo eliminar el usuario');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Cambiar estado de usuario (activo/inactivo)
  const toggleUserStatus = async (user) => {
    try {
      setLoading(true);
      
      // Verificar permisos
      if (!canEditUser(user)) {
        Alert.alert('Error', 'No tienes permiso para modificar este usuario');
        setLoading(false);
        return;
      }
      
      const newStatus = !user.activo;
      
      // Actualizar usuario
      const { error: userError } = await supabase
        .from('usuarios')
        .update({ activo: newStatus })
        .eq('id', user.id);
      
      if (userError) throw userError;
      
      // Actualizar miembro si es necesario
      if (user.miembro_id) {
        const { error: miembroError } = await supabase
          .from('miembros')
          .update({ vigente: newStatus })
          .eq('id', user.miembro_id);
        
        if (miembroError) throw miembroError;
      }
      
      Alert.alert('Éxito', `Usuario ${newStatus ? 'activado' : 'desactivado'} correctamente`);
      await loadAllUsers();
    } catch (error) {
      console.error('Error cambiando estado del usuario:', error);
      Alert.alert('Error', 'No se pudo cambiar el estado del usuario');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar grado de un miembro
  const handleGradoChange = async (miembro, nuevoGrado) => {
    try {
      setLoading(true);
      
      // Buscar usuario asociado
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('id, rol')
        .eq('miembro_id', miembro.id)
        .single();
      
      // Verificar permisos
      if (userData && !canEditUser(userData)) {
        Alert.alert('Error', 'No tienes permiso para modificar este miembro');
        setLoading(false);
        return;
      }
      
      // Actualizar miembro
      const { error: miembroError } = await supabase
        .from('miembros')
        .update({ grado: nuevoGrado })
        .eq('id', miembro.id);
      
      if (miembroError) throw miembroError;
      
      // Actualizar usuario asociado
      if (userData) {
        const { error: updateUserError } = await supabase
          .from('usuarios')
          .update({ grado: nuevoGrado })
          .eq('id', userData.id);
        
        if (updateUserError) throw updateUserError;
      }
      
      Alert.alert('Éxito', `Miembro actualizado a grado ${nuevoGrado}`);
      await loadData();
    } catch (error) {
      console.error('Error cambiando grado:', error);
      Alert.alert('Error', 'No se pudo cambiar el grado del miembro');
    } finally {
      setLoading(false);
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Renderizar panel de control
  const renderDashboard = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Panel de Control</Text>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalMiembros}</Text>
          <Text style={styles.statLabel}>Total Miembros</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.aprendices}</Text>
          <Text style={styles.statLabel}>Aprendices</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.companeros}</Text>
          <Text style={styles.statLabel}>Compañeros</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.maestros}</Text>
          <Text style={styles.statLabel}>Maestros</Text>
        </View>
      </View>
      
      <View style={styles.actionCard}>
        <View style={styles.actionHeader}>
          <Ionicons name="people" size={24} color="#007AFF" />
          <Text style={styles.actionTitle}>Solicitudes Pendientes</Text>
          <Text style={styles.actionBadge}>{stats.pendientes}</Text>
        </View>
        <Text style={styles.actionDescription}>
          Tienes {stats.pendientes} solicitudes pendientes de aprobación
        </Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={styles.actionButtonText}>Ver Solicitudes</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Registros Recientes</Text>
      </View>
      
      {stats.ultimosRegistros.length > 0 ? (
        stats.ultimosRegistros.map((registro) => (
          <View key={registro.id} style={styles.recentUserCard}>
            <Ionicons name="person-circle" size={40} color="#007AFF" />
            <View style={styles.recentUserInfo}>
              <Text style={styles.recentUserName}>
                {registro.miembro 
                  ? `${registro.miembro.nombres} ${registro.miembro.apellidos}` 
                  : registro.username}
              </Text>
              <Text style={styles.recentUserDate}>
                Registro: {formatDate(registro.created_at)}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No hay registros recientes</Text>
      )}
    </ScrollView>
  );

  // Renderizar solicitudes pendientes
  const renderPendingUsers = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Solicitudes Pendientes</Text>
        <Text style={styles.sectionSubtitle}>
          {pendingUsers.length} solicitudes pendientes de aprobación
        </Text>
      </View>
      
      {pendingUsers.length > 0 ? (
        pendingUsers.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userCardHeader}>
              <View>
                <Text style={styles.userName}>
                  {user.miembro 
                    ? `${user.miembro.nombres} ${user.miembro.apellidos}` 
                    : user.username}
                </Text>
                <Text style={styles.userUsername}>@{user.username}</Text>
              </View>
              <Text style={styles.userDate}>
                Solicitado: {formatDate(user.created_at)}
              </Text>
            </View>
            
            {user.miembro && (
              <View style={styles.userDetails}>
                <View style={styles.userDetailRow}>
                  <Text style={styles.userDetailLabel}>Email:</Text>
                  <Text style={styles.userDetailValue}>{user.miembro.email || user.email || 'No especificado'}</Text>
                </View>
                
                <View style={styles.userDetailRow}>
                  <Text style={styles.userDetailLabel}>RUT:</Text>
                  <Text style={styles.userDetailValue}>{user.miembro.rut || 'No especificado'}</Text>
                </View>
                
                <View style={styles.userDetailRow}>
                  <Text style={styles.userDetailLabel}>Teléfono:</Text>
                  <Text style={styles.userDetailValue}>{user.miembro.telefono || 'No especificado'}</Text>
                </View>
                
                <View style={styles.userDetailRow}>
                  <Text style={styles.userDetailLabel}>Profesión:</Text>
                  <Text style={styles.userDetailValue}>{user.miembro.profesion || 'No especificada'}</Text>
                </View>
              </View>
            )}
            
            <View style={styles.userActions}>
              <TouchableOpacity
                style={[styles.userActionButton, styles.approveButton]}
                onPress={() => handleApproveUser(user)}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.userActionButtonText}>Aprobar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.userActionButton, styles.rejectButton]}
                onPress={() => handleRejectUser(user)}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
                <Text style={styles.userActionButtonText}>Rechazar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
          <Text style={styles.emptyText}>No hay solicitudes pendientes</Text>
        </View>
      )}
    </ScrollView>
  );

  // Renderizar administración de usuarios
  const renderUsersManagement = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Gestión de Usuarios</Text>
        <Text style={styles.sectionSubtitle}>
          {allUsers.length} usuarios registrados en el sistema
        </Text>
      </View>
      
      {allUsers.length > 0 ? (
        allUsers.map((user) => (
          <View key={user.id} style={[
            styles.userCard,
            !user.activo && styles.inactiveUserCard
          ]}>
            <View style={styles.userCardHeader}>
              <View>
                <Text style={styles.userName}>
                  {user.miembro 
                    ? `${user.miembro.nombres} ${user.miembro.apellidos}` 
                    : user.username}
                </Text>
                <Text style={styles.userUsername}>@{user.username}</Text>
              </View>
              <View style={styles.userBadges}>
                <View style={[
                  styles.userBadge,
                  user.rol === 'admin' ? styles.adminBadge : 
                  user.rol === 'superadmin' ? styles.superAdminBadge : 
                  styles.generalBadge
                ]}>
                  <Text style={styles.userBadgeText}>{user.rol}</Text>
                </View>
                <View style={[
                  styles.userBadge,
                  user.grado === 'aprendiz' ? styles.aprendizBadge : 
                  user.grado === 'companero' ? styles.companeroBadge : 
                  styles.maestroBadge
                ]}>
                  <Text style={styles.userBadgeText}>{user.grado}</Text>
                </View>
              </View>
            </View>
            
            {user.miembro && (
              <View style={styles.userDetails}>
                <View style={styles.userDetailRow}>
                  <Text style={styles.userDetailLabel}>Email:</Text>
                  <Text style={styles.userDetailValue}>{user.miembro.email || user.email || 'No especificado'}</Text>
                </View>
                
                {user.miembro.cargo && (
                  <View style={styles.userDetailRow}>
                    <Text style={styles.userDetailLabel}>Cargo:</Text>
                    <Text style={styles.userDetailValue}>{user.miembro.cargo}</Text>
                  </View>
                )}
                
                <View style={styles.userDetailRow}>
                  <Text style={styles.userDetailLabel}>Estado:</Text>
                  <Text style={[
                    styles.userStatusText,
                    user.activo ? styles.activeStatus : styles.inactiveStatus
                  ]}>
                    {user.activo ? 'Activo' : 'Inactivo'}
                  </Text>
                </View>
              </View>
            )}
            
            {canEditUser(user) ? (
              <View style={styles.userActions}>
                <TouchableOpacity
                  style={[styles.userActionButton, styles.editButton]}
                  onPress={() => handleEditUser(user)}
                >
                  <Ionicons name="create" size={20} color="#fff" />
                  <Text style={styles.userActionButtonText}>Editar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.userActionButton, 
                    user.activo ? styles.deactivateButton : styles.activateButton
                  ]}
                  onPress={() => toggleUserStatus(user)}
                >
                  <Ionicons 
                    name={user.activo ? "close-circle" : "checkmark-circle"} 
                    size={20} 
                    color="#fff" 
                  />
                  <Text style={styles.userActionButtonText}>
                    {user.activo ? 'Desactivar' : 'Activar'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.userActionButton, styles.deleteButton]}
                  onPress={() => handleDeleteUser(user)}
                >
                  <Ionicons name="trash" size={20} color="#fff" />
                  <Text style={styles.userActionButtonText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.restrictedActions}>
                <Text style={styles.restrictedText}>
                  {isSuperAdmin 
                    ? 'Puedes editar este usuario' 
                    : 'No tienes permiso para editar este usuario'}
                </Text>
              </View>
            )}
          </View>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="people" size={60} color="#666" />
          <Text style={styles.emptyText}>No hay usuarios registrados</Text>
        </View>
      )}
    </ScrollView>
  );

  // Renderizar gestión de grados
  const renderGradosManagement = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Gestión de Grados</Text>
        <Text style={styles.sectionSubtitle}>
          Administrar ascensos, descensos y cambios de grado
        </Text>
      </View>
      
      <View style={styles.gradosContainer}>
        <View style={styles.gradoSection}>
          <Text style={styles.gradoTitle}>Aprendices ({stats.aprendices})</Text>
          {miembros.filter(m => m.grado === 'aprendiz' && m.vigente).map(miembro => (
            <View key={miembro.id} style={styles.miembroCard}>
              <Text style={styles.miembroName}>{miembro.nombres} {miembro.apellidos}</Text>
              {miembro.cargo && (
                <Text style={styles.miembroCargo}>{miembro.cargo}</Text>
              )}
              
              <View style={styles.miembroActions}>
                <TouchableOpacity
                  style={[styles.miembroActionButton, styles.ascenderButton]}
                  onPress={() => handleGradoChange(miembro, 'companero')}
                >
                  <Ionicons name="arrow-up" size={16} color="#fff" />
                  <Text style={styles.miembroActionText}>Ascender a Compañero</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {miembros.filter(m => m.grado === 'aprendiz' && m.vigente).length === 0 && (
            <Text style={styles.emptyGradoText}>No hay aprendices registrados</Text>
          )}
        </View>
        
        <View style={styles.gradoSection}>
          <Text style={styles.gradoTitle}>Compañeros ({stats.companeros})</Text>
          {miembros.filter(m => m.grado === 'companero' && m.vigente).map(miembro => (
            <View key={miembro.id} style={styles.miembroCard}>
              <Text style={styles.miembroName}>{miembro.nombres} {miembro.apellidos}</Text>
              {miembro.cargo && (
                <Text style={styles.miembroCargo}>{miembro.cargo}</Text>
              )}
              
              <View style={styles.miembroActions}>
                <TouchableOpacity
                  style={[styles.miembroActionButton, styles.descenderButton]}
                  onPress={() => handleGradoChange(miembro, 'aprendiz')}
                >
                  <Ionicons name="arrow-down" size={16} color="#fff" />
                  <Text style={styles.miembroActionText}>Descender a Aprendiz</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.miembroActionButton, styles.ascenderButton]}
                  onPress={() => handleGradoChange(miembro, 'maestro')}
                >
                  <Ionicons name="arrow-up" size={16} color="#fff" />
                  <Text style={styles.miembroActionText}>Ascender a Maestro</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {miembros.filter(m => m.grado === 'companero' && m.vigente).length === 0 && (
            <Text style={styles.emptyGradoText}>No hay compañeros registrados</Text>
          )}
        </View>
        
        <View style={styles.gradoSection}>
          <Text style={styles.gradoTitle}>Maestros ({stats.maestros})</Text>
          {miembros.filter(m => m.grado === 'maestro' && m.vigente).map(miembro => (
            <View key={miembro.id} style={styles.miembroCard}>
              <Text style={styles.miembroName}>{miembro.nombres} {miembro.apellidos}</Text>
              {miembro.cargo && (
                <Text style={styles.miembroCargo}>{miembro.cargo}</Text>
              )}
              
              <View style={styles.miembroActions}>
                <TouchableOpacity
                  style={[styles.miembroActionButton, styles.descenderButton]}
                  onPress={() => handleGradoChange(miembro, 'companero')}
                >
                  <Ionicons name="arrow-down" size={16} color="#fff" />
                  <Text style={styles.miembroActionText}>Descender a Compañero</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {miembros.filter(m => m.grado === 'maestro' && m.vigente).length === 0 && (
            <Text style={styles.emptyGradoText}>No hay maestros registrados</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );

  // Modal para aprobar usuario
  const renderApproveModal = () => (
    <Modal
      visible={showApproveModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowApproveModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Aprobar Usuario</Text>
          
          {selectedUser && (
            <>
              <Text style={styles.modalSubtitle}>
                Aprobando a: {selectedUser.miembro 
                  ? `${selectedUser.miembro.nombres} ${selectedUser.miembro.apellidos}` 
                  : selectedUser.username}
              </Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Rol:</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={[
                      styles.radioButton,
                      editUserData.rol === 'general' && styles.radioButtonSelected
                    ]}
                    onPress={() => setEditUserData({...editUserData, rol: 'general'})}
                  >
                    <Text style={styles.radioButtonText}>General</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.radioButton,
                      editUserData.rol === 'admin' && styles.radioButtonSelected
                    ]}
                    onPress={() => setEditUserData({...editUserData, rol: 'admin'})}
                  >
                    <Text style={styles.radioButtonText}>Admin</Text>
                  </TouchableOpacity>
                  
                  {isSuperAdmin && (
                    <TouchableOpacity
                      style={[
                        styles.radioButton,
                        editUserData.rol === 'superadmin' && styles.radioButtonSelected
                      ]}
                      onPress={() => setEditUserData({...editUserData, rol: 'superadmin'})}
                    >
                      <Text style={styles.radioButtonText}>SuperAdmin</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Grado:</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={[
                      styles.radioButton,
                      editUserData.grado === 'aprendiz' && styles.radioButtonSelected
                    ]}
                    onPress={() => setEditUserData({...editUserData, grado: 'aprendiz'})}
                  >
                    <Text style={styles.radioButtonText}>Aprendiz</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.radioButton,
                      editUserData.grado === 'companero' && styles.radioButtonSelected
                    ]}
                    onPress={() => setEditUserData({...editUserData, grado: 'companero'})}
                  >
                    <Text style={styles.radioButtonText}>Compañero</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.radioButton,
                      editUserData.grado === 'maestro' && styles.radioButtonSelected
                    ]}
                    onPress={() => setEditUserData({...editUserData, grado: 'maestro'})}
                  >
                    <Text style={styles.radioButtonText}>Maestro</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowApproveModal(false)}
                >
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={confirmApproval}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonText}>Aprobar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  // Modal para editar usuario
  const renderEditUserModal = () => (
    <Modal
      visible={showUserEditModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowUserEditModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Editar Usuario</Text>
          
          {selectedUser && (
            <>
              <Text style={styles.modalSubtitle}>
                Editando a: {selectedUser.miembro 
                  ? `${selectedUser.miembro.nombres} ${selectedUser.miembro.apellidos}` 
                  : selectedUser.username}
              </Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Rol:</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={[
                      styles.radioButton,
                      editUserData.rol === 'general' && styles.radioButtonSelected
                    ]}
                    onPress={() => setEditUserData({...editUserData, rol: 'general'})}
                    disabled={selectedUser.rol === 'admin' && !isSuperAdmin}
                  >
                    <Text style={styles.radioButtonText}>General</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.radioButton,
                      editUserData.rol === 'admin' && styles.radioButtonSelected
                    ]}
                    onPress={() => setEditUserData({...editUserData, rol: 'admin'})}
                    disabled={selectedUser.rol === 'superadmin' && !isSuperAdmin}
                  >
                    <Text style={styles.radioButtonText}>Admin</Text>
                  </TouchableOpacity>
                  
                  {isSuperAdmin && (
                    <TouchableOpacity
                      style={[
                        styles.radioButton,
                        editUserData.rol === 'superadmin' && styles.radioButtonSelected
                      ]}
                      onPress={() => setEditUserData({...editUserData, rol: 'superadmin'})}
                    >
                      <Text style={styles.radioButtonText}>SuperAdmin</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Grado:</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={[
                      styles.radioButton,
                      editUserData.grado === 'aprendiz' && styles.radioButtonSelected
                    ]}
                    onPress={() => setEditUserData({...editUserData, grado: 'aprendiz'})}
                  >
                    <Text style={styles.radioButtonText}>Aprendiz</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.radioButton,
                      editUserData.grado === 'companero' && styles.radioButtonSelected
                    ]}
                    onPress={() => setEditUserData({...editUserData, grado: 'companero'})}
                  >
                    <Text style={styles.radioButtonText}>Compañero</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.radioButton,
                      editUserData.grado === 'maestro' && styles.radioButtonSelected
                    ]}
                    onPress={() => setEditUserData({...editUserData, grado: 'maestro'})}
                  >
                    <Text style={styles.radioButtonText}>Maestro</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Estado:</Text>
                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>Activo</Text>
                  <Switch
                    value={editUserData.activo}
                    onValueChange={(value) => setEditUserData({...editUserData, activo: value})}
                  />
                </View>
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowUserEditModal(false)}
                >
                  <Text style={styles.modalButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={confirmUserUpdate}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonText}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Cargando...</Text>
          </View>
        </View>
      )}
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Administración</Text>
      </View>
      
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'dashboard' && styles.activeTabButton]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Ionicons
            name={activeTab === 'dashboard' ? 'grid' : 'grid-outline'}
            size={24}
            color={activeTab === 'dashboard' ? '#007AFF' : '#666'}
          />
          <Text style={[
            styles.tabButtonText,
            activeTab === 'dashboard' && styles.activeTabButtonText
          ]}>Inicio</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'pending' && styles.activeTabButton]}
          onPress={() => setActiveTab('pending')}
        >
          <Ionicons
            name={activeTab === 'pending' ? 'people' : 'people-outline'}
            size={24}
            color={activeTab === 'pending' ? '#007AFF' : '#666'}
          />
          <Text style={[
            styles.tabButtonText,
            activeTab === 'pending' && styles.activeTabButtonText
          ]}>Pendientes</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'users' && styles.activeTabButton]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons
            name={activeTab === 'users' ? 'person' : 'person-outline'}
            size={24}
            color={activeTab === 'users' ? '#007AFF' : '#666'}
          />
          <Text style={[
            styles.tabButtonText,
            activeTab === 'users' && styles.activeTabButtonText
          ]}>Usuarios</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'grados' && styles.activeTabButton]}
          onPress={() => setActiveTab('grados')}
        >
          <Ionicons
            name={activeTab === 'grados' ? 'school' : 'school-outline'}
            size={24}
            color={activeTab === 'grados' ? '#007AFF' : '#666'}
          />
          <Text style={[
            styles.tabButtonText,
            activeTab === 'grados' && styles.activeTabButtonText
          ]}>Grados</Text>
        </TouchableOpacity>
      </View>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={60} color="#ff4d4f" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadData}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'pending' && renderPendingUsers()}
          {activeTab === 'users' && renderUsersManagement()}
          {activeTab === 'grados' && renderGradosManagement()}
        </>
      )}
      
      {renderApproveModal()}
      {renderEditUserModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 150,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabButtonText: {
    marginTop: 5,
    fontSize: 12,
    color: '#666',
  },
  activeTabButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 15,
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    width: '48%',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  actionCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginLeft: 10,
  },
  actionBadge: {
    backgroundColor: '#ff4d4f',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  recentUserCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentUserInfo: {
    marginLeft: 15,
    flex: 1,
  },
  recentUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  recentUserDate: {
    fontSize: 12,
    color: '#666',
  },
  userCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  inactiveUserCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff4d4f',
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: '#666',
  },
  userDate: {
    fontSize: 12,
    color: '#999',
  },
  userBadges: {
    flexDirection: 'row',
  },
  userBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 5,
  },
  generalBadge: {
    backgroundColor: '#f0f0f0',
  },
  adminBadge: {
    backgroundColor: '#1890ff',
  },
  superAdminBadge: {
    backgroundColor: '#722ed1',
  },
  aprendizBadge: {
    backgroundColor: '#52c41a',
  },
  companeroBadge: {
    backgroundColor: '#faad14',
  },
  maestroBadge: {
    backgroundColor: '#f5222d',
  },
  userBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  userDetails: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  userDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  userDetailLabel: {
    width: 80,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  userDetailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  userStatusText: {
    fontWeight: 'bold',
  },
  activeStatus: {
    color: '#52c41a',
  },
  inactiveStatus: {
    color: '#ff4d4f',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    flex: 1,
    margin: 2,
  },
  approveButton: {
    backgroundColor: '#52c41a',
  },
  rejectButton: {
    backgroundColor: '#ff4d4f',
  },
  editButton: {
    backgroundColor: '#1890ff',
  },
  activateButton: {
    backgroundColor: '#52c41a',
  },
  deactivateButton: {
    backgroundColor: '#faad14',
  },
  deleteButton: {
    backgroundColor: '#ff4d4f',
  },
  userActionButtonText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '500',
  },
  restrictedActions: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    marginTop: 10,
    alignItems: 'center',
  },
  restrictedText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff4d4f',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  gradosContainer: {
    marginBottom: 20,
  },
  gradoSection: {
    marginBottom: 20,
  },
  gradoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  miembroCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  miembroName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  miembroCargo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  miembroActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  miembroActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  ascenderButton: {
    backgroundColor: '#52c41a',
  },
  descenderButton: {
    backgroundColor: '#faad14',
  },
  miembroActionText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 5,
  },
  emptyGradoText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
  },
  radioButtonSelected: {
    backgroundColor: '#007AFF',
  },
  radioButtonText: {
    fontSize: 14,
    color: '#333',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});