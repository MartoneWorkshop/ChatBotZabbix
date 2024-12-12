const { Client } = require('pg');

// Configuración de la conexión a la base de datos
const client = new Client({
    host: 'localhost',     // Dirección del servidor de base de datos
    port: 5432,           // Puerto (por defecto es 5432)
    database: 'zabbix',   // Nombre de la base de datos
    user: 'zabbix',       // Usuario
    password: 'zabbix'    // Contraseña
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
