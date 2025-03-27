import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
  Linking,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { documentosService } from '../../services/documentosService';
import { supabase } from '../../config/database';

export default function DocumentsScreen() {
  const [selectedMainCategory, setSelectedMainCategory] = useState('documentos');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [planchas, setPlanchas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Estados para la subida de documentos
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);

  // Modal para ver detalles de una plancha
  const [selectedPlancha, setSelectedPlancha] = useState(null);
  const [showPlanchaModal, setShowPlanchaModal] = useState(false);
  
  // Modal para previsualizar un documento
  const [previewDocument, setPreviewDocument] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Obtener el grado y rol del usuario
  const userGrado = global.userGrado || 'aprendiz';
  const isAdmin = global.userRole === 'admin';
  const isOficialidad = global.userCargo && global.userCargo.trim() !== '';

  // Datos para los selectores de categoría
  const mainCategories = [
    { id: 'documentos', title: 'Documentos' },
    { id: 'planchas', title: 'Planchas' }
  ];

  // Categorías de documentos
  const documentCategories = [
    { id: 'general', title: 'General' },
    { id: 'aprendices', title: 'Aprendices' },
    { id: 'companeros', title: 'Compañeros' },
    { id: 'maestros', title: 'Maestros' },
    { id: 'administrativos', title: 'Administrativos' },
  ];

  // Categorías de planchas
  const planchasCategories = [
    { id: 'aprendiz', title: 'Aprendiz' },
    { id: 'companero', title: 'Compañero' },
    { id: 'maestro', title: 'Maestro' },
    { id: 'general', title: 'General' },
  ];

  // Determinar qué categorías pueden verse según el nivel del usuario
  const getVisibleCategories = () => {
    if (selectedMainCategory === 'documentos') {
      if (isAdmin || isOficialidad) {
        return documentCategories;
      } else {
        return documentCategories.filter(cat => {
          const restrictedCategories = {
            'aprendiz': ['aprendices', 'general'],
            'companero': ['aprendices', 'companeros', 'general'],
            'maestro': ['aprendices', 'companeros', 'maestros', 'general', 'administrativos']
          };
          
          return restrictedCategories[userGrado]?.includes(cat.id) || false;
        });
      }
    } else { // Planchas
      if (isAdmin || isOficialidad) {
        return planchasCategories;
      } else {
        return planchasCategories.filter(cat => {
          const restrictedCategories = {
            'aprendiz': ['aprendiz', 'general'],
            'companero': ['aprendiz', 'companero', 'general'],
            'maestro': ['aprendiz', 'companero', 'maestro', 'general']
          };
          
          return restrictedCategories[userGrado]?.includes(cat.id) || false;
        });
      }
    }
  };

  const visibleCategories = getVisibleCategories();

  // Cargar datos según la categoría seleccionada
  useEffect(() => {
    loadData();
  }, [selectedMainCategory, selectedCategory]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (selectedMainCategory === 'documentos') {
        const data = await documentosService.obtenerPorCategoria(selectedCategory, selectedSubcategory);
        setDocuments(data);
      } else { // Planchas
        const data = await documentosService.obtenerPlanchas(selectedCategory);
        setPlanchas(data);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      setError('No se pudieron cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Búsqueda de documentos
  useEffect(() => {
    if (searchQuery.trim()) {
      searchDocuments();
    } else if (selectedMainCategory === 'documentos') {
      loadData();
    }
  }, [searchQuery]);

  const searchDocuments = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const data = await documentosService.buscarPorPalabraClave(searchQuery.trim(), userGrado);
      setDocuments(data);
    } catch (error) {
      console.error('Error buscando documentos:', error);
      setError('Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  // Función para seleccionar documentos
  const pickDocuments = async () => {
    try {
      setUploadLoading(true);
      
      // Opciones para el selector de documentos
      const options = {
        type: [
          'application/pdf', 
          'application/msword', 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/zip',
          'application/x-zip-compressed',
          'text/plain',
          'text/csv',
          'image/jpeg',
          'image/png'
        ],
        copyToCacheDirectory: true,
        multiple: true
      };
      
      // Seleccionar documentos
      const result = await DocumentPicker.getDocumentAsync(options);
      
      // Procesar resultados
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Añadir archivos a la lista
        setSelectedFiles(result.assets);
        setShowUploadModal(true);
      }
    } catch (err) {
      console.error('Error al seleccionar documentos:', err);
      Alert.alert('Error', 'No se pudo seleccionar los documentos');
    } finally {
      setUploadLoading(false);
    }
  };

  // Función para subir documentos
  const handleUpload = async () => {
    try {
      if (selectedFiles.length === 0) {
        Alert.alert('Error', 'Por favor seleccione al menos un documento');
        return;
      }

      if (!uploadDescription.trim()) {
        Alert.alert('Error', 'Por favor agregue una descripción');
        return;
      }

      setUploadLoading(true);
      
      // Subir cada archivo
      for (const file of selectedFiles) {
        try {
          // 1. Convertir el archivo a base64
          const fileContent = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.Base64
          });

          // 2. Subir archivo a Supabase Storage
          const fileExt = file.name.split('.').pop().toLowerCase();
          const filePath = `${selectedCategory}/${Date.now()}_${file.name}`;
          
          const { data: storageData, error: storageError } = await supabase
            .storage
            .from('documentos')
            .upload(filePath, fileContent, {
              contentType: file.mimeType,
              upsert: false
            });

          if (storageError) throw storageError;

          // 3. Obtener URL pública
          const { data: urlData } = supabase
            .storage
            .from('documentos')
            .getPublicUrl(filePath);

          // 4. Crear registro en la tabla documentos
          const newDocument = {
            nombre: file.name,
            tipo: fileExt.toUpperCase(),
            tamano: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            descripcion: uploadDescription,
            url: urlData.publicUrl,
            categoria: selectedCategory,
            subcategoria: selectedSubcategory || 'general',
            palabras_clave: uploadDescription,
            autor: global.userId,
            subido_por: global.userId
          };

          await documentosService.crear(newDocument);
        } catch (fileError) {
          console.error(`Error al subir archivo ${file.name}:`, fileError);
          Alert.alert('Error', `No se pudo subir el archivo ${file.name}`);
        }
      }

      Alert.alert('Éxito', 'Documentos subidos correctamente');
      setSelectedFiles([]);
      setUploadDescription('');
      setShowUploadModal(false);
      
      // Recargar los documentos
      loadData();
    } catch (error) {
      console.error('Error general al subir los documentos:', error);
      Alert.alert('Error', 'Hubo un problema al subir los documentos');
    } finally {
      setUploadLoading(false);
    }
  };

  // Descargar o abrir un documento
  const handleDownload = async (document) => {
    try {
      // Verificar si el documento tiene URL
      if (!document.url) {
        Alert.alert('Error', 'Este documento no tiene una URL asociada');
        return;
      }

      // Intentar abrir el documento con una app externa
      const supported = await Linking.canOpenURL(document.url);
      
      if (supported) {
        await Linking.openURL(document.url);
      } else {
        // Si no se puede abrir directamente, intentar descargar
        const documentsDir = FileSystem.documentDirectory;
        const downloadPath = `${documentsDir}${document.nombre}`;
        
        Alert.alert('Descargando', `Descargando ${document.nombre}...`);
        
        const downloadResult = await FileSystem.downloadAsync(
          document.url,
          downloadPath
        );
        
        if (downloadResult.status === 200) {
          Alert.alert('Éxito', `Documento descargado en ${downloadPath}`);
          
          // En dispositivos móviles, intentar abrir el archivo descargado
          if (Platform.OS !== 'web') {
            await FileSystem.getContentUriAsync(downloadPath)
              .then(uri => Linking.openURL(uri));
          }
        } else {
          throw new Error('Error en la descarga');
        }
      }
    } catch (error) {
      console.error('Error al descargar/abrir el documento:', error);
      Alert.alert('Error', 'No se pudo descargar o abrir el documento');
    }
  };

  // Ver previsualización de un documento
  const handlePreviewDocument = (document) => {
    if (document.url) {
      Linking.openURL(document.url);
    } else {
      Alert.alert('Error', 'Este documento no tiene una URL para previsualizar');
    }
  };

  // Eliminar un documento
  const handleDeleteDocument = (document) => {
    Alert.alert(
      'Confirmar Eliminación',
      `¿Está seguro que desea eliminar "${document.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await documentosService.eliminar(document.id);
              Alert.alert('Éxito', 'Documento eliminado correctamente');
              loadData();
            } catch (error) {
              console.error('Error eliminando documento:', error);
              Alert.alert('Error', 'No se pudo eliminar el documento');
            }
          }
        }
      ]
    );
  };

  // Subir una plancha
  const handleUploadPlancha = async () => {
    try {
      // Seleccionar archivo
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true
      });
      
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }
      
      const file = result.assets[0];
      
      // Solicitar título
      Alert.prompt(
        'Título de la Plancha',
        'Ingrese el título de la plancha',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Continuar',
            onPress: async (titulo) => {
              if (!titulo || !titulo.trim()) {
                Alert.alert('Error', 'El título es obligatorio');
                return;
              }
              
              // Solicitar descripción
              Alert.prompt(
                'Descripción',
                'Ingrese una breve descripción del contenido',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Subir',
                    onPress: async (descripcion) => {
                      setLoading(true);
                      
                      try {
                        // Leer archivo en base64
                        const fileContent = await FileSystem.readAsStringAsync(file.uri, {
                          encoding: FileSystem.EncodingType.Base64
                        });

                        // Subir archivo a Supabase Storage
                        const fileExt = file.name.split('.').pop().toLowerCase();
                        const filePath = `planchas/${Date.now()}_${file.name}`;
                        
                        const { data: storageData, error: storageError } = await supabase
                          .storage
                          .from('documentos')
                          .upload(filePath, fileContent, {
                            contentType: file.mimeType,
                            upsert: false
                          });

                        if (storageError) throw storageError;

                        // Obtener URL pública
                        const { data: urlData } = supabase
                          .storage
                          .from('documentos')
                          .getPublicUrl(filePath);

                        // Preparar datos del documento
                        const documento = {
                          nombre: file.name,
                          tipo: 'PDF',
                          tamano: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                          descripcion: descripcion || 'Sin descripción',
                          url: urlData.publicUrl,
                          categoria: selectedCategory,
                          subcategoria: 'plancha',
                          autor: global.userId,
                          subido_por: global.userId
                        };
                        
                        // Preparar datos de la plancha
                        const plancha = {
                          titulo: titulo,
                          autor_id: global.userId || '00000000-0000-0000-0000-000000000001',
                          fecha_presentacion: new Date().toISOString().split('T')[0],
                          grado: selectedCategory,
                          contenido: descripcion || 'Sin descripción',
                          estado: 'pendiente',
                          comentarios: ''
                        };
                        
                        await documentosService.crearPlancha(plancha, documento);
                        Alert.alert('Éxito', 'Plancha subida correctamente');
                        loadData();
                      } catch (error) {
                        console.error('Error al subir la plancha:', error);
                        Alert.alert('Error', 'No se pudo subir la plancha');
                      } finally {
                        setLoading(false);
                      }
                    }
                  }
                ],
                'plain-text'
              );
            }
          }
        ],
        'plain-text'
      );
    } catch (error) {
      console.error('Error al seleccionar el archivo:', error);
      Alert.alert('Error', 'No se pudo seleccionar el archivo');
    }
  };

  // Ver detalles de una plancha
  const handleViewPlancha = async (plancha) => {
    try {
      setLoading(true);
      // Obtener detalles completos de la plancha
      const planchaCompleta = await documentosService.obtenerPlanchaPorId(plancha.id);
      setSelectedPlancha(planchaCompleta);
      setShowPlanchaModal(true);
    } catch (error) {
      console.error('Error al obtener detalles de la plancha:', error);
      Alert.alert('Error', 'No se pudieron obtener los detalles de la plancha');
    } finally {
      setLoading(false);
    }
  };

  // Aprobar una plancha
  const handleAprovePlancha = async (id) => {
    try {
      await documentosService.actualizarPlancha(id, { estado: 'aprobada' });
      Alert.alert('Éxito', 'Plancha aprobada correctamente');
      setShowPlanchaModal(false);
      loadData();
    } catch (error) {
      console.error('Error al aprobar la plancha:', error);
      Alert.alert('Error', 'No se pudo aprobar la plancha');
    }
  };

  // Rechazar una plancha
  const handleRejectPlancha = async (id) => {
    Alert.prompt(
      'Rechazar Plancha',
      'Ingrese un comentario sobre el rechazo',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async (comentario) => {
            try {
              await documentosService.actualizarPlancha(id, { 
                estado: 'rechazada',
                comentarios: comentario || 'Rechazada sin comentarios'
              });
              Alert.alert('Éxito', 'Plancha rechazada correctamente');
              setShowPlanchaModal(false);
              loadData();
            } catch (error) {
              console.error('Error al rechazar la plancha:', error);
              Alert.alert('Error', 'No se pudo rechazar la plancha');
            }
          }
        }
      ],
      'plain-text'
    );
  };

  // Renderizar un ítem de documento
  const renderDocumentItem = ({ item }) => (
    <View style={styles.documentCard}>
      <View style={styles.documentIcon}>
        <Ionicons 
          name={
            item.tipo === 'PDF' ? 'document-text' : 
            item.tipo === 'XLS' || item.tipo === 'XLSX' ? 'grid' : 
            item.tipo === 'DOC' || item.tipo === 'DOCX' ? 'document' : 
            item.tipo === 'PPT' || item.tipo === 'PPTX' ? 'easel' : 
            item.tipo === 'ZIP' ? 'archive' : 
            item.tipo === 'JPG' || item.tipo === 'JPEG' || item.tipo === 'PNG' ? 'image' :
            'document'
          } 
          size={24} 
          color="#007AFF" 
        />
      </View>
      
      <View style={styles.documentInfo}>
        <Text style={styles.documentName}>{item.name || item.nombre}</Text>
        <Text style={styles.documentDescription} numberOfLines={2}>
          {item.description || item.descripcion}
        </Text>
        <View style={styles.documentDetails}>
          <Text style={styles.documentDetailsText}>
            {item.tipo} • {item.tamano} • {new Date(item.created_at).toLocaleDateString()}
          </Text>
          {item.autor && (
            <Text style={styles.documentAuthor}>Autor: {item.autor.nombres} {item.autor.apellidos || "No especificado"}</Text>
          )}
        </View>
        <Text style={styles.uploadedBy}>Subido por: {item.subido_por?.username || "No especificado"}</Text>
      </View>

      <View style={styles.documentActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePreviewDocument(item)}
        >
          <Ionicons name="eye-outline" size={22} color="#007AFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDownload(item)}
        >
          <Ionicons name="download-outline" size={22} color="#007AFF" />
        </TouchableOpacity>

        {(isAdmin || isOficialidad) && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteDocument(item)}
          >
            <Ionicons name="trash-outline" size={22} color="#ff4d4f" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Renderizar un ítem de plancha
  const renderPlanchaItem = ({ item }) => {
    // Obtener el nombre del autor si está disponible
    const autorNombre = item.autor?.nombres && item.autor?.apellidos
      ? `${item.autor.nombres} ${item.autor.apellidos}`
      : 'Autor desconocido';
    
    return (
      <TouchableOpacity 
        style={[
          styles.planchaCard,
          item.estado === 'aprobada' && styles.planchaAprobada,
          item.estado === 'rechazada' && styles.planchaRechazada
        ]}
        onPress={() => handleViewPlancha(item)}
      >
        <View style={styles.planchaHeader}>
          <View style={styles.planchaInfo}>
            <Text style={styles.planchaTitle}>{item.titulo}</Text>
            <Text style={styles.planchaAuthor}>Autor: {autorNombre}</Text>
          </View>
          <View style={styles.planchaStatus}>
            <Text style={[
              styles.planchaStatusText,
              item.estado === 'aprobada' ? styles.statusAprobada : 
              item.estado === 'rechazada' ? styles.statusRechazada : 
              styles.statusPendiente
            ]}>
              {item.estado === 'aprobada' ? 'Aprobada' : 
               item.estado === 'rechazada' ? 'Rechazada' : 
               'Pendiente'}
            </Text>
          </View>
        </View>
        
        <View style={styles.planchaDateContainer}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.planchaDate}>
            Presentada el {new Date(item.fecha_presentacion).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Renderizar selector de categorías principales (Documentos/Planchas)
  const renderMainCategorySelector = () => (
    <View style={styles.mainCategoryContainer}>
      <View style={styles.mainCategoryButtons}>
        {mainCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.mainCategoryButton,
              selectedMainCategory === category.id && styles.selectedMainCategory
            ]}
            onPress={() => {
              setSelectedMainCategory(category.id);
              
              // Al cambiar entre documentos y planchas, restablecer la categoría seleccionada
              if (category.id === 'documentos') {
                setSelectedCategory('general');
              } else {
                setSelectedCategory('aprendiz');
              }
              
              setSelectedSubcategory(null);
            }}
          >
            <Text style={[
              styles.mainCategoryText,
              selectedMainCategory === category.id && styles.selectedMainCategoryText
            ]}>
              {category.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Renderizar selector de subcategorías
  const renderCategorySelector = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryContainer}
    >
      {visibleCategories.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryButton,
            selectedCategory === category.id && styles.selectedCategory,
          ]}
          onPress={() => {
            setSelectedCategory(category.id);
            setSelectedSubcategory(null);
          }}
        >
          <Text style={[
            styles.categoryButtonText,
            selectedCategory === category.id && styles.selectedCategoryText,
          ]}>
            {category.title}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Renderizar barra de búsqueda (solo para documentos)
  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <Ionicons name="search-outline" size={20} color="#666" />
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar documentos..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        returnKeyType="search"
        onSubmitEditing={searchDocuments}
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

  // Renderizar encabezado de lista
  const renderListHeader = () => {
    if (selectedMainCategory === 'documentos') {
      return (
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderTitle}>
            Documentos - {documentCategories.find(c => c.id === selectedCategory)?.title || selectedCategory}
          </Text>
          <Text style={styles.listHeaderDescription}>
            {selectedSubcategory 
              ? `Subcategoría: ${selectedSubcategory}`
              : 'Todos los documentos disponibles de esta categoría'}
          </Text>
        </View>
      );
    } else {
      return (
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderTitle}>
            Planchas - {planchasCategories.find(c => c.id === selectedCategory)?.title || selectedCategory}
          </Text>
          <Text style={styles.listHeaderDescription}>
            Trabajos de investigación presentados por los miembros
          </Text>
        </View>
      );
    }
  };

  // Modal para ver detalles de plancha
  const renderPlanchaModal = () => (
    <Modal
      visible={showPlanchaModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowPlanchaModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalles de la Plancha</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowPlanchaModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {selectedPlancha ? (
            <ScrollView>
              <Text style={styles.planchaModalTitle}>{selectedPlancha.titulo}</Text>
              
              <View style={styles.planchaModalInfoRow}>
                <Text style={styles.planchaModalLabel}>Estado:</Text>
                <Text style={[
                  styles.planchaModalStatus,
                  selectedPlancha.estado === 'aprobada' ? styles.statusAprobada : 
                  selectedPlancha.estado === 'rechazada' ? styles.statusRechazada : 
                  styles.statusPendiente
                ]}>
                  {selectedPlancha.estado === 'aprobada' ? 'Aprobada' : 
                   selectedPlancha.estado === 'rechazada' ? 'Rechazada' : 
                   'Pendiente'}
                </Text>
              </View>
              
              <View style={styles.planchaModalInfoRow}>
                <Text style={styles.planchaModalLabel}>Autor:</Text>
                <Text style={styles.planchaModalValue}>
                  {selectedPlancha.autor?.nombres && selectedPlancha.autor?.apellidos
                    ? `${selectedPlancha.autor.nombres} ${selectedPlancha.autor.apellidos}`
                    : 'Autor desconocido'
                  }
                </Text>
              </View>
              
              <View style={styles.planchaModalInfoRow}>
                <Text style={styles.planchaModalLabel}>Presentada:</Text>
                <Text style={styles.planchaModalValue}>
                  {new Date(selectedPlancha.fecha_presentacion).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.planchaModalInfoRow}>
                <Text style={styles.planchaModalLabel}>Grado:</Text>
                <Text style={styles.planchaModalValue}>
                  {selectedPlancha.grado.charAt(0).toUpperCase() + selectedPlancha.grado.slice(1)}
                </Text>
              </View>
              
              <View style={styles.planchaModalSection}>
                <Text style={styles.planchaModalSectionTitle}>Contenido:</Text>
                <Text style={styles.planchaModalContent}>
                  {selectedPlancha.contenido || 'Sin contenido disponible'}
                </Text>
              </View>
              
              {selectedPlancha.comentarios && (
                <View style={styles.planchaModalSection}>
                  <Text style={styles.planchaModalSectionTitle}>Comentarios:</Text>
                  <Text style={styles.planchaModalComments}>
                    {selectedPlancha.comentarios}
                  </Text>
                </View>
              )}
              
              {/* Documento asociado */}
              {selectedPlancha.documento && (
                <View style={styles.planchaModalSection}>
                  <Text style={styles.planchaModalSectionTitle}>Documento:</Text>
                  <TouchableOpacity 
                    style={styles.documentItem}
                    onPress={() => handleDownload(selectedPlancha.documento)}
                  >
                    <Ionicons name="document-text" size={20} color="#007AFF" />
                    <Text style={styles.documentItemText}>{selectedPlancha.documento.nombre}</Text>
                    <Ionicons name="download-outline" size={20} color="#007AFF" />
                  </TouchableOpacity>
                </View>
              )}

Tienes razón, disculpa por la confusión. Vamos a continuar justo desde donde quedamos, completando el código sin editar nada:

```javascript
              {/* Botones de acción (solo para admins) */}
              {(isAdmin || isOficialidad) && selectedPlancha.estado === 'pendiente' && (
                <View style={styles.planchaModalActions}>
                  <TouchableOpacity
                    style={[styles.planchaModalAction, styles.approveButton]}
                    onPress={() => handleAprovePlancha(selectedPlancha.id)}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.planchaModalActionText}>Aprobar</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.planchaModalAction, styles.rejectButton]}
                    onPress={() => handleRejectPlancha(selectedPlancha.id)}
                  >
                    <Ionicons name="close-circle" size={18} color="#fff" />
                    <Text style={styles.planchaModalActionText}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Cargando detalles...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  // Modal para subir documentos
  const renderUploadModal = () => (
    <Modal
      visible={showUploadModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        setShowUploadModal(false);
        setSelectedFiles([]);
        setUploadDescription('');
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Subir Documentos</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setShowUploadModal(false);
                setSelectedFiles([]);
                setUploadDescription('');
              }}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.uploadModalBody}>
            <Text style={styles.uploadCategoryText}>
              Categoría: {documentCategories.find(c => c.id === selectedCategory)?.title || selectedCategory}
            </Text>

            {/* Lista de archivos seleccionados */}
            <View style={styles.selectedFilesContainer}>
              <Text style={styles.selectedFilesTitle}>
                {selectedFiles.length} {selectedFiles.length === 1 ? 'archivo seleccionado' : 'archivos seleccionados'}
              </Text>

              {selectedFiles.map((file, index) => (
                <View key={index} style={styles.selectedFileItem}>
                  <View style={styles.selectedFileIcon}>
                    <Ionicons 
                      name={
                        file.mimeType?.includes('pdf') ? 'document-text' :
                        file.mimeType?.includes('word') ? 'document' :
                        file.mimeType?.includes('excel') || file.mimeType?.includes('spreadsheet') ? 'grid' :
                        file.mimeType?.includes('presentation') ? 'easel' :
                        file.mimeType?.includes('zip') ? 'archive' :
                        file.mimeType?.includes('image') ? 'image' :
                        'document-outline'
                      } 
                      size={24} 
                      color="#007AFF" 
                    />
                  </View>
                  <View style={styles.selectedFileInfo}>
                    <Text style={styles.selectedFileName} numberOfLines={1}>{file.name}</Text>
                    <Text style={styles.selectedFileSize}>
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Campo de descripción */}
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Descripción:</Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Ingrese una descripción para los documentos..."
                value={uploadDescription}
                onChangeText={setUploadDescription}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Botones de acción */}
            <View style={styles.uploadModalActions}>
              <TouchableOpacity
                style={[styles.uploadModalAction, styles.cancelButton]}
                onPress={() => {
                  setShowUploadModal(false);
                  setSelectedFiles([]);
                  setUploadDescription('');
                }}
                disabled={uploadLoading}
              >
                <Text style={styles.uploadModalActionText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.uploadModalAction, 
                  styles.uploadButton,
                  (uploadLoading || !uploadDescription.trim() || selectedFiles.length === 0) && styles.disabledButton
                ]}
                onPress={handleUpload}
                disabled={uploadLoading || !uploadDescription.trim() || selectedFiles.length === 0}
              >
                {uploadLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.uploadModalActionText}>Subir</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Cabecera con título y botón de subida */}
      <View style={styles.header}>
        <Text style={styles.title}>Biblioteca</Text>
        {isAdmin && selectedMainCategory === 'documentos' && (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickDocuments}
            disabled={uploadLoading}
          >
            <Ionicons name="cloud-upload-outline" size={24} color="#007AFF" />
            <Text style={styles.uploadButtonText}>Subir</Text>
          </TouchableOpacity>
        )}
        {isAdmin && selectedMainCategory === 'planchas' && (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUploadPlancha}
          >
            <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
            <Text style={styles.uploadButtonText}>Nueva Plancha</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Selector de categoría principal */}
      {renderMainCategorySelector()}

      {/* Barra de búsqueda (solo para documentos) */}
      {selectedMainCategory === 'documentos' && renderSearchBar()}
      
      {/* Selector de categoría */}
      <View style={styles.categorySelector}>
        {renderCategorySelector()}
      </View>

      {/* Lista de documentos o planchas */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadData}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={selectedMainCategory === 'documentos' ? documents : planchas}
          renderItem={selectedMainCategory === 'documentos' ? renderDocumentItem : renderPlanchaItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No hay {selectedMainCategory === 'documentos' ? 'documentos' : 'planchas'} en esta categoría
              </Text>
            </View>
          }
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
        />
      )}

      {/* Modales */}
      {renderPlanchaModal()}
      {renderUploadModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  uploadButtonText: {
    marginLeft: 5,
    color: '#007AFF',
  },
  mainCategoryContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  mainCategoryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  mainCategoryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    minWidth: 120,
    alignItems: 'center',
  },
  selectedMainCategory: {
    backgroundColor: '#007AFF',
  },
  mainCategoryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#555',
  },
  selectedMainCategoryText: {
    color: '#fff',
  },
  searchContainer: {
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
  categorySelector: {
    backgroundColor: '#fff',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryContainer: {
    paddingHorizontal: 10,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  selectedCategory: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#fff',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 20,
  },
  listHeader: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  listHeaderDescription: {
    fontSize: 14,
    color: '#666',
  },
  documentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  documentIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  documentInfo: {
    flex: 1,
    marginLeft: 15,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  documentDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  documentDetails: {
    marginTop: 8,
  },
  documentDetailsText: {
    fontSize: 12,
    color: '#888',
  },
  documentAuthor: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  uploadedBy: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  documentActions: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: 90,
    marginLeft: 10,
  },
  actionButton: {
    padding: 8,
  },
  planchaCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107', // Color para pendiente
  },
  planchaAprobada: {
    borderLeftColor: '#4CAF50', // Verde para aprobada
  },
  planchaRechazada: {
    borderLeftColor: '#F44336', // Rojo para rechazada
  },
  planchaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  planchaInfo: {
    flex: 1,
  },
  planchaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  planchaAuthor: {
    fontSize: 14,
    color: '#666',
  },
  planchaStatus: {
    marginLeft: 10,
  },
  planchaStatusText: {
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusPendiente: {
    backgroundColor: '#FFF8E1',
    color: '#FFA000',
  },
  statusAprobada: {
    backgroundColor: '#E8F5E9',
    color: '#388E3C',
  },
  statusRechazada: {
    backgroundColor: '#FFEBEE',
    color: '#D32F2F',
  },
  planchaDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  planchaDate: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  planchaModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  planchaModalInfoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  planchaModalLabel: {
    width: 100,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  planchaModalValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  planchaModalStatus: {
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  planchaModalSection: {
    marginTop: 15,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 6,
  },
  planchaModalSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  planchaModalContent: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  planchaModalComments: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  documentItemText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  planchaModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
  },
  planchaModalAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  planchaModalActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
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
  },
  uploadModalBody: {
    flex: 1,
  },
  uploadCategoryText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  selectedFilesContainer: {
    marginBottom: 20,
  },
  selectedFilesTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  selectedFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedFileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e6f7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedFileInfo: {
    flex: 1,
    marginLeft: 10,
  },
  selectedFileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedFileSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    backgroundColor: '#fff',
  },
  uploadModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
  },
  uploadModalAction: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
  },
  disabledButton: {
    backgroundColor: '#b3d9ff',
    opacity: 0.7,
  },
  uploadModalActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});