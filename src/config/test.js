import pool from './database.js';

async function obtenerUsuarios() {
  try {
    const res = await pool.query('SELECT * FROM usuarios');
    console.log('Usuarios:', res.rows);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
  } finally {
    pool.end(); // Cierra la conexión
  }
}

obtenerUsuarios();