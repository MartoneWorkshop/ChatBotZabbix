const { Client } = require('pg');
require('dotenv').config(); // Cargar variables del archivo .env
// Configuración de la conexión a la base de datos
const client = new Client({
    host: process.env.DB_HOST,      // Dirección del servidor
    port: parseInt(process.env.DB_PORT, 10), // Puerto
    database: process.env.DB_NAME,    // Nombre de la base de datos
    user: process.env.DB_USER,        // Usuario
    password: process.env.DB_PASSWORD // Contraseña
});

// Conectar a la base de datos
const connectDB = async () => {
    try {
        await client.connect();
        console.log("✅ Conexión a la base de datos establecida con éxito.");
    } catch (err) {
        console.error("❌ Error al conectar a la base de datos:", err.message);
        throw err; // Lanza el error para manejarlo en otros lugares si es necesario
    }
};

// Función para ejecutar consultas SQL
const queryDB = async (query, params = []) => {
    try {
        const res = await client.query(query, params); // Ejecutar la consulta
        return res.rows;  // Retorna las filas del resultado
    } catch (err) {
        console.error("❌ Error al ejecutar la consulta:", err.message);
        console.error("📄 Consulta:", query);
        if (params.length) console.error("📊 Parámetros:", params);
        throw err; // Lanza el error para que sea manejado donde se llame la función
    }
};

// Cerrar la conexión
const closeDB = async () => {
    try {
        await client.end();
        console.log("✅ Conexión a la base de datos cerrada con éxito.");
    } catch (err) {
        console.error("❌ Error al cerrar la conexión a la base de datos:", err.message);
        throw err;
    }
};

// Exportar las funciones necesarias
module.exports = {
    connectDB,
    queryDB,
    closeDB
};
