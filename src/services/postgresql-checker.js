// src/utils/postgresql-checker.js
import pool from '../config/database.js';

/**
 * Verifica la conexión a PostgreSQL de manera extendida,
 * diagnosticando posibles problemas y proporcionando información detallada.
 * @returns {Promise<Object>} Resultado de la verificación
 */
export async function verificarPostgreSQL() {
  let client = null;
  try {
    console.log('Iniciando verificación de conexión a PostgreSQL...');
    
    // 1. Verificar si el pool está definido correctamente
    if (!pool) {
      throw new Error('El pool de conexiones no está configurado correctamente');
    }
    
    // 2. Intentar obtener una conexión del pool
    console.log('Intentando obtener una conexión del pool...');
    client = await pool.connect();
    console.log('Conexión obtenida del pool exitosamente');
    
    // 3. Verificar la versión de PostgreSQL
    console.log('Consultando versión de PostgreSQL...');
    const versionResult = await client.query('SELECT version()');
    const pgVersion = versionResult.rows[0].version;
    
    // 4. Verificar la hora del servidor
    console.log('Consultando hora del servidor...');
    const timeResult = await client.query('SELECT NOW() as now');
    const serverTime = timeResult.rows[0].now;
    
    // 5. Verificar la base de datos actual
    console.log('Consultando nombre de la base de datos actual...');
    const dbNameResult = await client.query('SELECT current_database() as dbname');
    const dbName = dbNameResult.rows[0].dbname;
    
    // 6. Verificar el usuario actual
    console.log('Consultando usuario actual...');
    const userResult = await client.query('SELECT current_user as username');
    const username = userResult.rows[0].username;
    
    // 7. Verificar el esquema de búsqueda actual
    console.log('Consultando esquema de búsqueda actual...');
    const schemaResult = await client.query('SHOW search_path');
    const searchPath = schemaResult.rows[0].search_path;
    
    // 8. Verificar las tablas existentes en el esquema público
    console.log('Consultando tablas existentes...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    const tables = tablesResult.rows.map(row => row.table_name);
    
    // Devolver resultado exitoso
    return {
      success: true,
      message: 'Conexión exitosa a PostgreSQL',
      timestamp: serverTime,
      details: {
        version: pgVersion,
        database: dbName,
        user: username,
        schema: searchPath,
        tables: tables,
        tablesCount: tables.length,
        connectionPoolSize: pool.totalCount,
        activeConnections: pool.idleCount,
        waitingClients: pool.waitingCount || 0
      }
    };
  } catch (error) {
    console.error('Error en la verificación de PostgreSQL:', error);
    
    // Analizar el tipo de error para proporcionar información más útil
    let errorType = 'unknown';
    let errorSuggestion = 'Verifique la configuración de conexión y que el servidor PostgreSQL esté en ejecución.';
    
    if (error.code) {
      switch (error.code) {
        case 'ECONNREFUSED':
          errorType = 'connection_refused';
          errorSuggestion = 'El servidor PostgreSQL no está en ejecución o no es accesible en el host y puerto especificados.';
          break;
        case '28P01':
          errorType = 'authentication_failed';
          errorSuggestion = 'Las credenciales de autenticación (usuario/contraseña) son incorrectas.';
          break;
        case '3D000':
          errorType = 'database_not_found';
          errorSuggestion = 'La base de datos especificada no existe en el servidor PostgreSQL.';
          break;
        case '42P01':
          errorType = 'table_not_found';
          errorSuggestion = 'Una tabla referenciada no existe. La estructura de la base de datos puede estar incompleta.';
          break;
        case '28000':
          errorType = 'invalid_authorization';
          errorSuggestion = 'El usuario no tiene permisos suficientes para acceder a la base de datos.';
          break;
        case '57P03':
          errorType = 'connection_failure';
          errorSuggestion = 'El servidor PostgreSQL no pudo iniciar una nueva conexión. El número máximo de conexiones puede haberse alcanzado.';
          break;
        case 'ETIMEDOUT':
          errorType = 'connection_timeout';
          errorSuggestion = 'La conexión al servidor PostgreSQL ha agotado el tiempo de espera. Verifique la red y la configuración del firewall.';
          break;
        default:
          errorType = 'postgres_error';
          errorSuggestion = `Error de PostgreSQL con código ${error.code}. Consulte la documentación de PostgreSQL para más detalles.`;
          break;
      }
    } else if (error.message.includes('password')) {
      errorType = 'authentication_issue';
      errorSuggestion = 'Parece haber un problema con la autenticación. Verifique el usuario y contraseña.';
    } else if (error.message.includes('connect')) {
      errorType = 'connection_issue';
      errorSuggestion = 'No se pudo establecer la conexión. Verifique que el servidor PostgreSQL esté en ejecución y sea accesible.';
    }
    
    return {
      success: false,
      error: error.message || 'Error desconocido al conectar con PostgreSQL',
      errorType: errorType,
      suggestion: errorSuggestion,
      details: {
        code: error.code,
        database: process.env.PGDATABASE || 'OrpheoApp',
        host: process.env.PGHOST || 'localhost',
        port: process.env.PGPORT || 5432,
        user: process.env.PGUSER || 'postgres',
        ssl: process.env.PGSSL === 'true',
        connectionTimeout: process.env.CONNECTION_TIMEOUT || '2000ms'
      }
    };
  } finally {
    // Asegurarse de liberar la conexión si se obtuvo una
    if (client) {
      console.log('Liberando conexión de vuelta al pool...');
      client.release();
    }
  }
}

/**
 * Verifica la estructura de la base de datos para asegurar que todas las tablas necesarias existen
 * @returns {Promise<Object>} Resultado de la verificación de estructura
 */
export async function verificarEstructuraBaseDatos() {
  try {
    // Lista de tablas esperadas en la aplicación
    const tablasEsperadas = [
      'usuarios',
      'miembros',
      'programa_docente',
      'documentos',
      'planchas',
      'oficialidad',
      'cargos_oficialidad',
      'asignacion_cargos',
      'asistencia',
      'jerarquia_organizacional',
      'recuperacion_password',
      'notificaciones',
      'notificacion_destinatarios',
      'device_tokens'
    ];
    
    // Verificar existencia de cada tabla
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tablasExistentes = tablesResult.rows.map(row => row.table_name);
    const tablasFaltantes = tablasEsperadas.filter(tabla => 
      !tablasExistentes.includes(tabla)
    );
    
    // Para cada tabla existente, verificar columnas principales
    const informacionTablas = [];
    for (const tabla of tablasExistentes) {
      const columnResult = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tabla]);
      
      informacionTablas.push({
        nombre: tabla,
        columnas: columnResult.rows.map(row => ({
          nombre: row.column_name,
          tipo: row.data_type
        })),
        columnasCount: columnResult.rows.length
      });
    }
    
    return {
      success: tablasFaltantes.length === 0,
      message: tablasFaltantes.length === 0 
        ? 'Estructura de base de datos correcta'
        : `Faltan ${tablasFaltantes.length} tablas en la base de datos`,
      tablasFaltantes,
      tablasExistentes,
      detalleTablas: informacionTablas,
      tablasEsperadas
    };
  } catch (error) {
    console.error('Error verificando estructura de base de datos:', error);
    return {
      success: false,
      error: error.message,
      errorCode: error.code
    };
  }
}

export default { verificarPostgreSQL, verificarEstructuraBaseDatos };