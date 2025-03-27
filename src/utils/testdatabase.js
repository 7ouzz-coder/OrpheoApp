// src/utils/testdatabase.js
import pool from '../config/database.js';

// Verificar la conexión a PostgreSQL de manera directa
export async function testDatabaseConnection() {
  try {
    // Intentar obtener una conexión del pool
    const client = await pool.connect();
    
    // Ejecutar una consulta simple para verificar la conexión
    const result = await client.query('SELECT NOW() as now');
    
    // Liberar la conexión de vuelta al pool
    client.release();
    
    // Si llegamos hasta aquí, la conexión fue exitosa
    return { 
      success: true, 
      message: 'Conexión exitosa a PostgreSQL', 
      timestamp: result.rows[0].now 
    };
  } catch (error) {
    console.error('Error al conectar con PostgreSQL:', error);
    
    // Proporcionar un mensaje de error más descriptivo según el tipo de error
    let errorMessage = 'Error de conexión desconocido';
    
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'No se pudo conectar al servidor PostgreSQL. Verifique que el servidor esté en ejecución y los datos de conexión sean correctos.';
    } else if (error.code === '28P01') {
      errorMessage = 'Autenticación fallida. Usuario o contraseña incorrectos.';
    } else if (error.code === '3D000') {
      errorMessage = 'Base de datos no existe.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { 
      success: false, 
      error: errorMessage,
      code: error.code 
    };
  }
}

export default testDatabaseConnection;