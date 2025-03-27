// src/config/database.js
import pkg from 'pg';
const { Pool } = pkg;

// Configuración de conexión a PostgreSQL
const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'OrpheoApp',
  password: process.env.PGPASSWORD || 'postgresql',
  port: process.env.PGPORT || 5432,
  // Configuraciones opcionales para mejorar la robustez de la conexión
  max: 20, // tamaño máximo del pool de conexiones
  idleTimeoutMillis: 30000, // tiempo máximo que una conexión puede estar inactiva en ms
  connectionTimeoutMillis: 2000, // tiempo máximo para establecer una conexión en ms
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false
});

// Capturar errores críticos del pool para evitar que la aplicación se cierre 
// ante problemas de conexión transitorios
pool.on('error', (err, client) => {
  console.error('Error inesperado en el cliente PostgreSQL:', err);
  // No detener la aplicación por errores de conexión
});

// Función para probar la conexión
export const testDatabaseConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    return { 
      success: true, 
      message: 'Conexión exitosa a PostgreSQL', 
      timestamp: result.rows[0].now 
    };
  } catch (error) {
    console.error('Error al conectar con PostgreSQL:', error);
    return { 
      success: false, 
      error: error.message || 'Error de conexión desconocido' 
    };
  }
};

export default pool;