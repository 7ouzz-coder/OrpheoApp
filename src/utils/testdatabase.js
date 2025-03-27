import axios from 'axios';

// Verificar la conexión a PostgreSQL a través de la API
export async function testDatabaseConnection() {
  try {
    const response = await axios.get('http://localhost:3000/ping'); // Ruta de prueba en tu API
    return { success: response.data.success, message: response.data.message };
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
    return { success: false, error: error.message };
  }
}
