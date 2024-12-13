const express = require('express');
const bodyParser = require('body-parser');
const { connectDB, closeDB } = require('./db');
const botController = require('./controllers/botController');
const { getRecipients, updateRecipients, loadRecipients } = require('./utils/updateRecipients');
require('dotenv').config(); // Cargar variables del archivo .env
const { SEND_MESSAGE_INTERVAL, SEND_UPDATE_INTERVAL } = require('./config/constants');
const { createBotService } = require('./services/botService');
const { handleBackupUpdates, sendBackupUpdates } = require('./controllers/backupController');
const { handleFallenUpdates, sendFallenUpdates } = require('./controllers/fallenController');
const QRPortalWeb = require('@bot-whatsapp/portal'); // Importar librería para QR
const { getBackupNodes } = require('./routes/backupNodes');
const { getFallenNodes } = require('./routes/fallenNodes');
const { sendCustomMessage } = require('./controllers/messageController');

const app = express();
app.use(bodyParser.json()); // Configurar middleware para parsear cuerpos JSON en las solicitudes.
// Variables para los nodos actuales
let currentBackupNodes = [];
let currentFallenNodes = [];
recipients = getRecipients(); // Obtener directamente la lista de destinatarios al iniciar

// Función autoejecutable para inicializar el servidor y sus componentes.
(async () => {
    try {
        await connectDB(); //Base de Datos
        const provider = await createBotService(); // Crear el bot
        // Controlador para manejar los mensajes del bot.
        provider.on('message', async (message) => {
            await botController(provider, message);
        }); 
        QRPortalWeb(); // Inicializar el portal para el QR
        console.log("antes",recipients);
        // Manejo de actualizaciones por cambios
        setInterval(async () => {
            recipients = getRecipients(); // Reemplazar con la lista actualizada
            await handleFallenUpdates(provider, currentFallenNodes, getFallenNodes, recipients); //Nodos Caidos
            await handleBackupUpdates(provider, currentBackupNodes, getBackupNodes, recipients); //Nodos en Backup
        }, SEND_MESSAGE_INTERVAL);
        
        // Enviar actualizaciones periódicas (primero nodos caídos, luego backup)
        setInterval(async () => {
            recipients = getRecipients(); // Reemplazar con la lista actualizada
            await sendFallenUpdates(provider, currentFallenNodes, recipients);
            await sendBackupUpdates(provider, currentBackupNodes, recipients);
        }, SEND_UPDATE_INTERVAL); // Cada 2 minutos

        // Endpoint para enviar mensajes.
        app.post('/api/sendMessage', (req, res) => sendCustomMessage(req, res, provider));

        // Iniciar servidor
        app.listen(process.env.PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${process.env.PORT}`);
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