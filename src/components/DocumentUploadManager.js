import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  FlatList,
  Image
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';

export default function DocumentUploadManager({ 
  visible, 
  category, 
  subcategory = null,
  onClose,
  onSuccess = () => {},
  allowMultiple = false
}) {
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [isUploading, setIsUploading] = useState(false);

  // Limpiar estado al cerrar
  useEffect(() => {
    if (!visible) {
      setSelectedFiles([]);
      setUploadProgress({});
    }
  }, [visible]);

  // Configuración de tipos de documentos aceptados
  const documentTypes = [
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
  ];

  // Función para seleccionar documentos
  const pickDocuments = async () => {
    try {
      setLoading(true);
      
      // Opciones para el selector de documentos
      const options = {
        type: documentTypes,
        copyToCacheDirectory: true,
        multiple: allowMultiple
      };
      
      // Seleccionar documentos
      const result = await DocumentPicker.getDocumentAsync(options);
      
      // Procesar resultados
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Añadir archivos a la lista
        const filesInfo = result.assets.map(file => ({
          uri: file.uri,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          description: ''
        }));
        
        setSelectedFiles(prev => [...prev, ...filesInfo]);
      }
    } catch (err) {
      console.error('Error al seleccionar documentos:', err);
      Alert.alert('Error', 'No se pudo seleccionar los documentos');
    } finally {
      setLoading(false);
    }
  };

  // Función para subir documentos
  const uploadDocuments = async () => {
    try {
      if (selectedFiles.length === 0) {
        Alert.alert('Error', 'Por favor seleccione al menos un documento');
        return;
      }

      // Validar que todos los archivos tengan descripción
      const missingDescriptions = selectedFiles.filter(file => !file.description.trim());
      if (missingDescriptions.length > 0) {
        Alert.alert('Error', 'Por favor agregue una descripción para todos los documentos');
        return;
      }

      setIsUploading(true);

      // Subir documentos uno por uno
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Inicializar progreso
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { progress: 0, status: 'uploading' }
        }));

        try {
          // 1. Subir archivo a Supabase Storage
          const fileExt = file.name.split('.').pop();
          const filePath = `${category}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          
          // Leer archivo
          const fileContent = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.Base64
          });

          // Subir a Supabase Storage
          const { data: storageData, error: storageError } = await supabase
            .storage
            .from('documentos')
            .upload(filePath, decode(fileContent), {
              contentType: file.mimeType,
              upsert: false
            });

          if (storageError) throw storageError;

          // 2. Crear registro en la tabla documentos
          const { data: publicURL } = supabase
            .storage
            .from('documentos')
            .getPublicUrl(filePath);

          const documentoData = {
            nombre: file.name,
            tipo: fileExt.toUpperCase(),
            tamano: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            descripcion: file.description,
            url: publicURL.publicUrl,
            categoria: category,
            subcategoria: subcategory || 'general',
            palabras_clave: file.description,
            autor: global.userId,
            subido_por: global.userId,
          };

          const { data: documentoResult, error: documentoError } = await supabase
            .from('documentos')
            .insert([documentoData])
            .select();

          if (documentoError) throw documentoError;

          // Actualizar progreso
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: { progress: 100, status: 'success' }
          }));
        } catch (error) {
          console.error(`Error al subir el documento ${file.name}:`, error);
          
          // Actualizar progreso con error
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: { progress: 0, status: 'error', message: error.message }
          }));
        }
      }

      // Verificar si todos se subieron correctamente
      setTimeout(() => {
        const hasErrors = Object.values(uploadProgress).some(item => item.status === 'error');
        
        if (!hasErrors) {
          Alert.alert('Éxito', 'Todos los documentos se han subido correctamente');
          onSuccess();
          onClose();
        } else {
          Alert.alert('Advertencia', 'Algunos documentos no pudieron subirse');
        }
        
        setIsUploading(false);
      }, 500);
      
    } catch (error) {
      console.error('Error en el proceso de subida:', error);
      Alert.alert('Error', 'Ocurrió un error al subir los documentos');
      setIsUploading(false);
    }
  };

  // Decodificar Base64
  const decode = (base64String) => {
    // Esta función debe ser implementada correctamente según el entorno
    // En este ejemplo usando FileSystem de Expo para convertir de Base64 a Blob/File
    return base64String;
  };

  // Eliminar un archivo de la lista
  const removeFile = (index) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });
    
    // Limpiar progreso si existe
    const fileName = selectedFiles[index]?.name;
    if (fileName && uploadProgress[fileName]) {
      setUploadProgress(prev => {
        const newProgress = {...prev};
        delete newProgress[fileName];
        return newProgress;
      });
    }
  };

  // Actualizar descripción de un archivo
  const updateFileDescription = (index, description) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = {...newFiles[index], description};
      return newFiles;
    });
  };

  // Renderizar un ítem de archivo
  const renderFileItem = ({ item, index }) => {
    const fileProgress = uploadProgress[item.name] || { progress: 0, status: 'pending' };
    
    return (
      <View style={styles.fileItem}>
        <View style={styles.fileIconContainer}>
          <Ionicons 
            name={getFileIcon(item.name)} 
            size={24} 
            color="#007AFF" 
          />
        </View>
        
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.fileSize}>
            {(item.size / (1024 * 1024)).toFixed(2)} MB
          </Text>
          
          {/* Input para descripción */}
          <TextInput
            style={styles.descriptionInput}
            placeholder="Ingrese una descripción del documento..."
            value={item.description}
            onChangeText={(text) => updateFileDescription(index, text)}
            multiline={true}
            numberOfLines={2}
            editable={!isUploading}
          />
          
          {/* Indicador de progreso */}
          {fileProgress.status === 'uploading' && (
            <View style={styles.progressContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${fileProgress.progress}%` }
                ]} 
              />
              <Text style={styles.progressText}>{fileProgress.progress}%</Text>
            </View>
          )}
          
          {/* Status icons */}
          {fileProgress.status === 'success' && (
            <View style={styles.statusContainer}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={[styles.statusText, { color: '#4CAF50' }]}>Subido correctamente</Text>
            </View>
          )}
          
          {fileProgress.status === 'error' && (
            <View style={styles.statusContainer}>
              <Ionicons name="alert-circle" size={16} color="#F44336" />
              <Text style={[styles.statusText, { color: '#F44336' }]}>Error: {fileProgress.message}</Text>
            </View>
          )}
        </View>
        
        {!isUploading && (
          <TouchableOpacity style={styles.removeButton} onPress={() => removeFile(index)}>
            <Ionicons name="close-circle" size={24} color="#ff4d4f" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Determinar el ícono según la extensión del archivo
  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'document-text';
      case 'doc':
      case 'docx':
        return 'document';
      case 'xls':
      case 'xlsx':
        return 'grid';
      case 'ppt':
      case 'pptx':
        return 'easel';
      case 'zip':
      case 'rar':
        return 'archive';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return 'image';
      default:
        return 'document-outline';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Subir Documentos</Text>
        <Text style={styles.subtitle}>
          Categoría: {category} {subcategory ? `/ ${subcategory}` : ''}
        </Text>
      </View>
      
      {/* Sección de selección de archivos */}
      <TouchableOpacity 
        style={[styles.uploadArea, loading && styles.uploadAreaDisabled]}
        onPress={pickDocuments}
        disabled={loading || isUploading}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={48} color="#007AFF" />
            <Text style={styles.uploadText}>
              {allowMultiple ? 'Seleccionar Documentos' : 'Seleccionar Documento'}
            </Text>
            <Text style={styles.uploadHint}>
              PDF, Word, Excel, PowerPoint, ZIP y más
            </Text>
          </>
        )}
      </TouchableOpacity>
      
      {/* Lista de archivos seleccionados */}
      {selectedFiles.length > 0 && (
        <View style={styles.filesContainer}>
          <Text style={styles.filesTitle}>
            {selectedFiles.length} {selectedFiles.length === 1 ? 'documento seleccionado' : 'documentos seleccionados'}
          </Text>
          
          <FlatList
            data={selectedFiles}
            renderItem={renderFileItem}
            keyExtractor={(item, index) => `${item.name}-${index}`}
            style={styles.filesList}
          />
        </View>
      )}
      
      {/* Botones de acción */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onClose}
          disabled={isUploading}
        >
          <Text style={styles.buttonText}>Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.button, 
            styles.uploadButton,
            (selectedFiles.length === 0 || isUploading) && styles.disabledButton
          ]}
          onPress={uploadDocuments}
          disabled={selectedFiles.length === 0 || isUploading}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Subir</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
  },
  uploadAreaDisabled: {
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  uploadText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  uploadHint: {
    marginTop: 5,
    fontSize: 12,
    color: '#666',
  },
  filesContainer: {
    marginTop: 20,
    flex: 1,
  },
  filesTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  filesList: {
    flex: 1,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e6f7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  descriptionInput: {
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 6,
    fontSize: 12,
    backgroundColor: '#fff',
  },
  removeButton: {
    padding: 5,
  },
  progressContainer: {
    marginTop: 8,
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  progressText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
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
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  }
});