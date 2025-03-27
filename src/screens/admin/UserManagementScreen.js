// src/screens/admin/UserManagementScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../services/adminService';

export default function UserManagementScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  
  // Filtros
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'active'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Opciones para modales
  const [selectedRole, setSelectedRole] = useState('general');
  const [selectedGrado, setSelectedGrado] = useState('aprendiz');
  
  // Detectar si el usuario actual es superadmin
  const isSuperAdmin = global.userRole === 'superadmin';

  useEffect(() => {
    loadUsers();
  }, [filter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      if (filter === 'pending') {
        const pendingUsers = await adminService.obtenerUsuariosPendientes();
        setUsers(pendingUsers);
      } else {
        const allUsers = await adminService.obtenerUsuarios();
        
        if (filter === 'active') {
          setUsers(allUsers.filter(user => user.activo));
        } else {
          setUsers(allUsers);
        }
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      setError('No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      await adminService.aprobarUsuario(selectedUser.id, selectedRole, selectedGrado);
      Alert.alert('Éxito', 'Usuario aprobado correctamente');
      setShowApprovalModal(false);
      loadUsers();
    } catch (error) {
      console.error('Error aprobando usuario:', error);
      Alert.alert('Error', 'No se pudo aprobar el usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = (user) => {
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
              await adminService.rechazarUsuario(user.id);
              Alert.alert('Éxito', 'Usuario rechazado correctamente');
              loadUsers();
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

  const handleChangeRole = async (nuevoRol) => {
    if (!selectedUser) return;
    
    // Solo superadmin puede designar superadmins
    if (nuevoRol === 'superadmin' && global.userRole !== 'superadmin') {
      Alert.alert('Error', 'No tienes permisos para designar superadministradores');
      return;
    }
    
    try {
      setLoading(true);
      await adminService.cambiarRolUsuario(selectedUser.id, nuevoRol);
      Alert.alert('Éxito', `Rol cambiado a ${nuevoRol}`);
      setShowUserModal(false);
      loadUsers();
    } catch (error) {
      console.error('Error cambiando rol:', error);
      Alert.alert('Error', 'No se pudo cambiar el rol del usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeGrado = async (nuevoGrado) => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      await adminService.cambiarGradoUsuario(selectedUser.id, nuevoGrado);
      Alert.alert('Éxito', `Grado cambiado a ${nuevoGrado}`);
      setShowUserModal(false);
      loadUsers();
    } catch (error) {
      console.error('Error cambiando grado:', error);
      Alert.alert('Error', 'No se pudo cambiar el grado del usuario');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = searchQuery.trim() === '' 
    ? users 
    : users.filter(user => {
        const searchTerms = searchQuery.trim().toLowerCase();
        const username = user.username?.toLowerCase() || '';
        const nombres = user.miembro?.identificacion?.nombres?.toLowerCase() || '';
        const apellidos = user.miembro?.identificacion?.apellidos?.toLowerCase() || '';
        
        return username.includes(searchTerms) || 
               nombres.includes(searchTerms) || 
               apellidos.includes(searchTerms);
      });

  const renderFilterButtons = () => (
    <View style={styles.filterButtons}>
      <TouchableOpacity
        style={[
          styles.filterButton,
          filter === 'all' && styles.activeFilterButton
        ]}
        onPress={() => setFilter('all')}
      >
        <Text style={[
          styles.filterButtonText,
          filter === 'all' && styles.activeFilterButtonText
        ]}>Todos</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterButton,
          filter === 'active' && styles.activeFilterButton
        ]}
        onPress={() => setFilter('active')}
      >
        <Text style={[
          styles.filterButtonText,
          filter === 'active' && styles.activeFilterButtonText
        ]}>Activos</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterButton,
          filter === 'pending' && styles.activeFilterButton
        ]}
        onPress={() => setFilter('pending')}
      >
        <Text style={[
          styles.filterButtonText,
          filter === 'pending' && styles.activeFilterButtonText
        ]}>Pendientes</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchBar}>
      <Ionicons name="search-outline" size={20} color="#666" />
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar usuarios..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity
          style={styles.clearSearch}
          onPress={() => setSearchQuery('')}
        >
          <Ionicons name="close-circle" size={20} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderUserItem = ({ item }) => {
    const nombres = item.miembro?.identificacion?.nombres || '';
    const apellidos = item.miembro?.identificacion?.apellidos || '';
    const nombreCompleto = `${nombres} ${apellidos}`.trim();
    const cargo = item.miembro?.taller?.cargo || 'Sin cargo';
    
    return (
      <TouchableOpacity
        style={[
          styles.userCard,
          !item.activo && styles.pendingUserCard
        ]}
        onPress={() => {
          setSelectedUser(item);
          
          if (!item.activo) {
            setShowApprovalModal(true);
          } else {
            setShowUserModal(true);
          }
        }}
      >
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {nombreCompleto || item.username}
            </Text>
            <Text style={styles.userUsername}>@{item.username}</Text>
          </View>
          <View style={styles.userBadges}>
            <Text style={[
              styles.userBadge, 
              styles[`${item.rol}Badge`]
            ]}>
              {item.rol}
            </Text>
            <Text style={[
              styles.userBadge, 
              styles[`${item.grado}Badge`]
            ]}>
              {item.grado}
            </Text>
          </View>
        </View>
        
        <View style={styles.userDetails}>
          {item.activo ? (
            <>
              <Text style={styles.userDetailText}>
                Cargo: {cargo}
              </Text>
              <Text style={styles.userDetailText}>
                Estado: <Text style={styles.activeStatus}>Activo</Text>
              </Text>
            </>
          ) : (
            <Text style={styles.pendingText}>
              Esperando aprobación
            </Text>
          )}
        </View>
        
        {!item.activo && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => {
                setSelectedUser(item);
                setShowApprovalModal(true);
              }}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Aprobar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleRejectUser(item)}
            >
              <Ionicons name="close-circle" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Rechazar</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderApprovalModal = () => (
    <Modal
      visible={showApprovalModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowApprovalModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Aprobar Usuario</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowApprovalModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {selectedUser && (
            <View style={styles.approvalForm}>
              <Text style={styles.approvalUserName}>
                {selectedUser.miembro?.identificacion?.nombres} {selectedUser.miembro?.identificacion?.apellidos}
              </Text>
              <Text style={styles.approvalUsername}>@{selectedUser.username}</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Rol:</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={[
                      styles.radioButton,
                      selectedRole === 'general' && styles.radioButtonSelected
                    ]}
                    onPress={() => setSelectedRole('general')}
                  >
                    <Text style={styles.radioButtonText}>General</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.radioButton,
                      selectedRole === 'admin' && styles.radioButtonSelected
                    ]}
                    onPress={() => setSelectedRole('admin')}
                  >
                    <Text style={styles.radioButtonText}>Admin</Text>
                  </TouchableOpacity>
                  
                  {isSuperAdmin && (
                    <TouchableOpacity
                      style={[
                        styles.radioButton,
                        selectedRole === 'superadmin' && styles.radioButtonSelected
                      ]}
                      onPress={() => setSelectedRole('superadmin')}
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
                      selectedGrado === 'aprendiz' && styles.radioButtonSelected
                    ]}
                    onPress={() => setSelectedGrado('aprendiz')}
                  >
                    <Text style={styles.radioButtonText}>Aprendiz</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.radioButton,
                      selectedGrado === 'companero' && styles.radioButtonSelected
                    ]}
                    onPress={() => setSelectedGrado('companero')}
                  >
                    <Text style={styles.radioButtonText}>Compañero</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.radioButton,
                      selectedGrado === 'maestro' && styles.radioButtonSelected
                    ]}
                    onPress={() => setSelectedGrado('maestro')}
                  >
                    <Text style={styles.radioButtonText}>Maestro</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.approveUserButton}
                onPress={handleApproveUser}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.approveUserButtonText}>Aprobar Usuario</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderUserModal = () => (
    <Modal
      visible={showUserModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowUserModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Gestionar Usuario</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowUserModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {selectedUser && (
            <View style={styles.userManagementForm}>
              <Text style={styles.approvalUserName}>
                {selectedUser.miembro?.identificacion?.nombres} {selectedUser.miembro?.identificacion?.apellidos}
              </Text>
              <Text style={styles.approvalUsername}>@{selectedUser.username}</Text>
              
              <View style={styles.userDetailRow}>
                <Text style={styles.userDetailLabel}>Rol actual:</Text>
                <Text style={[styles.userDetailValue, styles[`${selectedUser.rol}Text`]]}>
                  {selectedUser.rol}
                </Text>
              </View>
              
              <View style={styles.userDetailRow}>
                <Text style={styles.userDetailLabel}>Grado actual:</Text>
                <Text style={[styles.userDetailValue, styles[`${selectedUser.grado}Text`]]}>
                  {selectedUser.grado}
                </Text>
              </View>
              
              <View style={styles.actionSection}>
                <Text style={styles.actionSectionTitle}>Cambiar Rol:</Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.roleButton, styles.generalRoleButton]}
                    onPress={() => handleChangeRole('general')}
                  >
                    <Text style={styles.roleButtonText}>General</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.roleButton, styles.adminRoleButton]}
                    onPress={() => handleChangeRole('admin')}
                  >
                    <Text style={styles.roleButtonText}>Admin</Text>
                  </TouchableOpacity>
                  
                  {isSuperAdmin && (
                    <TouchableOpacity
                      style={[styles.roleButton, styles.superadminRoleButton]}
                      onPress={() => handleChangeRole('superadmin')}
                    >
                      <Text style={styles.roleButtonText}>SuperAdmin</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              <View style={styles.actionSection}>
                <Text style={styles.actionSectionTitle}>Cambiar Grado:</Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.gradoButton, styles.aprendizGradoButton]}
                    onPress={() => handleChangeGrado('aprendiz')}
                  >
                    <Text style={styles.gradoButtonText}>Aprendiz</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.gradoButton, styles.companeroGradoButton]}
                    onPress={() => handleChangeGrado('companero')}
                  >
                    <Text style={styles.gradoButtonText}>Compañero</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.gradoButton, styles.maestroGradoButton]}
                    onPress={() => handleChangeGrado('maestro')}
                  >
                    <Text style={styles.gradoButtonText}>Maestro</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {isSuperAdmin && selectedUser.rol !== 'superadmin' && (
                <TouchableOpacity
                  style={styles.deleteUserButton}
                  onPress={() => handleRejectUser(selectedUser)}
                >
                  <Ionicons name="trash" size={20} color="#fff" />
                  <Text style={styles.deleteUserButtonText}>Eliminar Usuario</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestión de Usuarios</Text>
      </View>
      
      {renderFilterButtons()}
      {renderSearchBar()}
      
      {loading && users.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Cargando usuarios...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadUsers}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshing={loading}
          onRefresh={loadUsers}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No hay usuarios{filter === 'pending' ? ' pendientes' : ''}{searchQuery ? ' que coincidan con la búsqueda' : ''}
              </Text>
            </View>
          }
        />
      )}
      
      {renderApprovalModal()}
      {renderUserModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  filterButtons: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: '#f0f0f0',
  },
  activeFilterButton: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    marginLeft: 10,
  },
  clearSearch: {
    padding: 5,
  },
  listContainer: {
    padding: 10,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  pendingUserCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userUsername: {
    fontSize: 14,
    color: '#666',
  },
  userBadges: {
    flexDirection: 'row',
  },
  userBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 5,
    fontSize: 12,
    fontWeight: 'bold',
  },
  generalBadge: {
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  adminBadge: {
    backgroundColor: '#007AFF',
    color: '#fff',
  },
  superadminBadge: {
    backgroundColor: '#ff4d4f',
    color: '#fff',
  },
  aprendizBadge: {
    backgroundColor: '#E8F5E9',
    color: '#388E3C',
  },
  companeroBadge: {
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
  },
  maestroBadge: {
    backgroundColor: '#FFF3E0',
    color: '#E65100',
  },
  userDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  userDetailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  activeStatus: {
    color: '#4CAF50',
    fontWeight: '500',
  },
  pendingText: {
    fontSize: 14,
    color: '#FFC107',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '500',
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  approvalForm: {
    paddingBottom: 20,
  },
  approvalUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  approvalUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    marginBottom: 10,
  },
  radioButtonSelected: {
    backgroundColor: '#007AFF',
  },
  radioButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  approveUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  approveUserButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  userManagementForm: {
    paddingBottom: 20,
  },
  userDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userDetailLabel: {
    width: 100,
    fontSize: 14,
    color: '#666',
  },
  userDetailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  generalText: {
    color: '#666',
  },
  adminText: {
    color: '#007AFF',
  },
  superadminText: {
    color: '#ff4d4f',
  },
  aprendizText: {
    color: '#388E3C',
  },
  companeroText: {
    color: '#1976D2',
  },
  maestroText: {
    color: '#E65100',
  },
  actionSection: {
    marginTop: 20,
    marginBottom: 15,
  },
  actionSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  roleButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  generalRoleButton: {
    backgroundColor: '#f0f0f0',
  },
  adminRoleButton: {
    backgroundColor: '#007AFF',
  },
  superadminRoleButton: {
    backgroundColor: '#ff4d4f',
  },
  roleButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  gradoButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
  },
  aprendizGradoButton: {
    backgroundColor: '#388E3C',
  },
  companeroGradoButton: {
    backgroundColor: '#1976D2',
  },
  maestroGradoButton: {
    backgroundColor: '#E65100',
  },
  gradoButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  deleteUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff4d4f',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  deleteUserButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff4d4f',
    textAlign: 'center',
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
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  }
});