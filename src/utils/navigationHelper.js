// src/utils/navigationHelper.js

/**
 * Helper para navegar correctamente entre navegadores anidados
 */
export const navigationHelper = {
    /**
     * Navega a la pantalla MemberDetail desde cualquier parte de la app
     * @param {object} navigation - Objeto de navegación
     * @param {string} memberId - ID del miembro a mostrar
     * @param {object} memberData - Datos del miembro (opcional)
     */
    navigateToMemberDetail: (navigation, memberId, memberData = null) => {
      // Determinar en qué navegador estamos para navegar correctamente
      try {
        // Obtener el estado actual de navegación
        const currentRoute = navigation.getState().routes[navigation.getState().index];
        
        // Verificar el navegador actual
        if (currentRoute.name === 'Admin') {
          // Si estamos en Admin, navegar usando la ruta dentro de AdminStack
          navigation.navigate('MemberDetail', { memberId, memberData });
        } else if (currentRoute.name === 'Home') {
          // Si estamos en Home, navegar usando la ruta dentro de HomeStack
          navigation.navigate('MemberDetail', { memberId, memberData });
        } else if (currentRoute.name === 'Grades') {
          // Si estamos en Grades, navegar usando la ruta dentro de GradesNavigator
          navigation.navigate('MemberDetail', { memberId, memberData });
        } else {
          // Para otros casos, intentar navegar a Home y luego a MemberDetail
          navigation.navigate('Home', { 
            screen: 'MemberDetail', 
            params: { memberId, memberData }
          });
        }
      } catch (error) {
        console.error('Error al navegar a MemberDetail:', error);
        // Si falla, intentar el enfoque más directo
        try {
          navigation.navigate('MemberDetail', { memberId, memberData });
        } catch (finalError) {
          console.error('Error final al navegar a MemberDetail:', finalError);
          // Si todo falla, intentar navegar al inicio
          navigation.navigate('Home');
        }
      }
    },
  
    /**
     * Navega a la pantalla ProgramDetail desde cualquier parte de la app
     * @param {object} navigation - Objeto de navegación
     * @param {string} programId - ID del programa a mostrar
     * @param {object} programData - Datos del programa (opcional)
     */
    navigateToProgramDetail: (navigation, programId, programData = null) => {
      try {
        // Obtener el estado actual de navegación
        const currentRoute = navigation.getState().routes[navigation.getState().index];
        
        // Verificar el navegador actual
        if (currentRoute.name === 'Home') {
          // Si estamos en Home, navegar usando la ruta dentro de HomeStack
          navigation.navigate('ProgramDetail', { programId, programData });
        } else if (currentRoute.name === 'Content') {
          // Si estamos en Content, navegar a Home y luego a ProgramDetail
          navigation.navigate('Home', { 
            screen: 'ProgramDetail', 
            params: { programId, programData }
          });
        } else {
          // Para otros casos, intentar navegar a Home y luego a ProgramDetail
          navigation.navigate('Home', { 
            screen: 'ProgramDetail', 
            params: { programId, programData }
          });
        }
      } catch (error) {
        console.error('Error al navegar a ProgramDetail:', error);
        // Si falla, intentar navegar al inicio
        navigation.navigate('Home');
      }
    },
  
    /**
     * Navega a la pantalla de UserManagement
     * @param {object} navigation - Objeto de navegación
     */
    navigateToUserManagement: (navigation) => {
      try {
        if (global.userRole === 'admin' || global.userRole === 'superadmin') {
          navigation.navigate('Admin', { 
            screen: 'UserManagement'
          });
        } else {
          console.warn('Intento de acceso a área de administración sin permisos');
          navigation.navigate('Home');
        }
      } catch (error) {
        console.error('Error al navegar a UserManagement:', error);
        navigation.navigate('Home');
      }
    },
  
    /**
     * Navega a la pantalla de Documents
     * @param {object} navigation - Objeto de navegación
     * @param {string} category - Categoría de documentos (opcional)
     */
    navigateToDocuments: (navigation, category = null) => {
      try {
        // Intentar navegar a Content y luego a Documents
        navigation.navigate('Content', {
          screen: 'Documentos',
          params: category ? { category } : undefined
        });
      } catch (error) {
        console.error('Error al navegar a Documents:', error);
        // Si falla, intentar desde Home
        try {
          navigation.navigate('Home', {
            screen: 'Documents',
            params: category ? { category } : undefined
          });
        } catch (finalError) {
          console.error('Error final al navegar a Documents:', finalError);
          navigation.navigate('Home');
        }
      }
    }
  };
  
  export default navigationHelper;