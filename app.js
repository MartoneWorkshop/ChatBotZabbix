const express = require('express');
const bodyParser = require('body-parser');
const { connectDB, closeDB } = require('./db');
const { PORT, ALERT_NUMBER, BACKUP_CHECK_INTERVAL, FALLEN_NODES_CHECK_INTERVAL } = require('./config/constants');
const { createBotService } = require('./services/botService');
const { handleBackupUpdates, sendBackupUpdates } = require('./controllers/backupController');
const { handleFallenUpdates, sendFallenUpdates } = require('./controllers/fallenController');
const QRPortalWeb = require('@bot-whatsapp/portal'); // Importar librería para QR
const { getBackupNodes } = require('./routes/backupNodes');
const { getFallenNodes } = require('./routes/fallenNodes');

const app = express();
app.use(bodyParser.json());

// Variables para los nodos actuales
let currentBackupNodes = [];
let currentFallenNodes = [];

(async () => {
    try {
        await connectDB();
        const provider = await createBotService(); // Crear el bot

        // Inicializar el portal para el QR
        QRPortalWeb();

        // Manejo de actualizaciones por cambios
        setInterval(async () => {
            await handleFallenUpdates(provider, currentFallenNodes, getFallenNodes, ALERT_NUMBER);
            await handleBackupUpdates(provider, currentBackupNodes, getBackupNodes, ALERT_NUMBER);
        }, FALLEN_NODES_CHECK_INTERVAL);

        // Enviar actualizaciones periódicas (primero nodos caídos, luego backup)
        setInterval(async () => {
            await sendFallenUpdates(provider, currentFallenNodes, ALERT_NUMBER);
            await sendBackupUpdates(provider, currentBackupNodes, ALERT_NUMBER);
        }, 120000); // Cada 2 minutos

        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Error al iniciar la aplicación:", error);
        process.exit(1);
    }
})();

// Cerrar conexión a la base de datos al finalizar el proceso
process.on('SIGINT', async () => {
    await closeDB();
    console.log("Conexión a la base de datos cerrada. Saliendo...");
    process.exit();
});