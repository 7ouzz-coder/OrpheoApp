// src/utils/CheckDatabaseStructure.js
import { supabase } from '../config/database';

export const checkDatabaseStructure = async () => {
  console.log('Verificando estructura de la base de datos...');
  
  // Lista de tablas que deberían existir
  const expectedTables = [
    'usuarios',
    'miembros',
    'oficialidad',
    'cargos_oficialidad',
    'asignacion_cargos',
    'programa_docente',
    'documentos',
    'planchas',
    'jerarquia_organizacional',
    'recuperacion_password',
    'device_tokens',
    'notificaciones',
    'notificacion_destinatarios',
    'asistencia'
  ];
  
  return await checkTablesIndividually(expectedTables);
};

// Método más directo: intentar consultar cada tabla individualmente
async function checkTablesIndividually(expectedTables) {
  console.log('Verificando tablas individualmente...');
  
  let results = {};
  let missingTables = [];
  let existingTables = [];
  
  for (const table of expectedTables) {
    try {
      // Intenta una consulta COUNT que funcionará incluso con permisos limitados
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      // Si no hay error, la tabla existe
      if (!error) {
        console.log(`✓ Tabla '${table}' existe`);
        existingTables.push(table);
        results[table] = { exists: true };
      } else {
        console.warn(`⚠️ Tabla '${table}' no existe o no es accesible: ${error.message}`);
        missingTables.push(table);
        results[table] = { exists: false, error: error.message };
      }
    } catch (error) {
      console.error(`Error verificando tabla '${table}':`, error);
      missingTables.push(table);
      results[table] = { exists: false, error: error.message };
    }
  }
  
  const success = missingTables.length === 0;
  
  console.log(success 
    ? '✅ Todas las tablas verificadas correctamente.' 
    : `❌ Faltan ${missingTables.length} tablas.`);
  
  if (!success) {
    console.log('Tablas faltantes:', missingTables);
  }
  
  return {
    success,
    existingTables,
    missingTables,
    details: results
  };
}