// Importar dependencias necesarias
const express = require('express');
const bodyParser = require('body-parser');
const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');
const { connectDB, closeDB } = require('./db.js'); // Conexión a la base de datos
const { nodosBackupRoute, getNodosBackup } = require('./routes/backupNodes.js'); // Ruta de nodosBackup
const sendMessageRoute = require('./routes/sendMessage.js'); // Ruta de sendMessage
const { nodosCaidosRoute, getNodosCaidos } = require('./routes/fallenNodes.js'); // Importar la ruta y función para nodos caídos

// Configuración de puerto del servidor
const PORT = process.env.PORT || 3008;
// Número al que se enviarán los mensajes
const ALERT_NUMBER = "584121212949@s.whatsapp.net";

// Estado actual de los nodos en backup
let currentBackupNodes = [];
// Estado actual de los nodos caídos
let currentFallenNodes = [];

// Función para detectar cambios en nodos
const detectChanges = (newNodes) => {
    const previousNodes = currentBackupNodes;
    const addedNodes = newNodes.filter(node => !previousNodes.some(pn => pn.monitored_host_name === node.monitored_host_name));
    const removedNodes = previousNodes.filter(node => !newNodes.some(nn => nn.monitored_host_name === node.monitored_host_name));

    return { addedNodes, removedNodes };
};
// Detectar cambios en nodos caídos
const detectFallenNodeChanges = (newFNodes) => {
    const previousFNodes = currentFallenNodes;
    const addedFNodes = newFNodes.filter(node => !previousFNodes.some(pn => pn.mapa_nombre === node.mapa_nombre));
    const removedFNodes = previousFNodes.filter(node => !newFNodes.some(nn => nn.mapa_nombre === node.mapa_nombre));

    return { addedFNodes, removedFNodes };
};
// Flujo de mensajes: Bienvenida
const welcomeFlow = addKeyword(EVENTS.WELCOME)
    .addAction(async (ctx, ctxFn) => {
        const isFromGroup = ctx.from.endsWith("@g.us"); // Verificar si el mensaje proviene de un grupo
        try {
            if (isFromGroup) {
                await ctxFn.flowDynamic([
                    { body: `Hola grupo, soy un bot y he recibido tu mensaje en el grupo ${ctx.from}.` },
                ]);
            } else {
                await ctxFn.flowDynamic([
                    { body: "Hola usuario, mensaje recibido correctamente." },
                ]);
            }
        } catch (error) {
            console.error("Error al procesar el mensaje:", error);
        }
    });

// Configuración de Express para manejar la API
const app = express();
app.use(bodyParser.json());
app.use('/nodos-backup', nodosBackupRoute); // Ruta para nodosBackup
app.use('/nodos-caidos', nodosCaidosRoute); // Ruta para nodosCaidos

// Exportar una función para acceder a adapterProvider
let adapterProvider;
const getAdapterProvider = () => {
    if (!adapterProvider) {
        throw new Error("El adapterProvider no está inicializado aún.");
    }
    return adapterProvider;
};

const sendMessage = async (number, message) => {
    try {
        if (!adapterProvider) {
            throw new Error("El adapterProvider no está inicializado.");
        }
        await adapterProvider.sendMessage(number, message);
    } catch (error) {
        console.error("Error al enviar el mensaje:", error.message);
    }
};
// Función para enviar un mensaje con un retraso
const sendMessageWithDelay = async (number, message, delay) => {
    return new Promise((resolve) => {
        setTimeout(async () => {
            await sendMessage(number, message);
            resolve();
        }, delay);
    });
};

// Modificar el ciclo de envío de mensajes para agregar un retraso de 2 segundos
const sendNodeUpdates = async (nodes, messagePrefix, delay) => {
    for (const node of nodes) {
        const formattedStart = `${node.problem_start_date} ${node.problem_start_time}`;
        const message = `${messagePrefix}\n📍 *Nodo:* ${node.monitored_host_name || node.mapa_nombre}\n🕒 *Hora de Inicio:* ${formattedStart || node.momento_caida}\n⏳ *Duracion:* ${node.problem_duration || node.duracion_caida  }`;
        await sendMessageWithDelay(ALERT_NUMBER, message, delay);
    }
};

// Función principal para configurar el bot y el servidor
const main = async () => {
    try {
        await connectDB();

        const adapterFlow = createFlow([welcomeFlow]);
        adapterProvider = createProvider(BaileysProvider);
        const adapterDB = new MockAdapter();

        adapterProvider.on('connection.update', async (update) => {
            if (update.connection === 'open') {
                console.log("Proveedor conectado y listo.");
                try {
                    // Obtener nodos caídos
                    currentFallenNodes = await getNodosCaidos();
                    for (const node of currentFallenNodes) {
                        await sendMessage(ALERT_NUMBER,
                            `⚠️ *Nodo Caído* ⚠️\n📍 *Nodo:* ${node.mapa_nombre}\n🕒 *Caido a las:* ${node.momento_caida}\n⏳ *Duración:* ${node.duracion_caida}`);
                    }

                    // Obtener nodos en backup
                    currentBackupNodes = await getNodosBackup();
                    for (const node of currentBackupNodes) {
                        const formattedStart = `${node.problem_start_date} ${node.problem_start_time}`;
                        await sendMessage(ALERT_NUMBER,
                            `🌐 *Nodo en Backup* 🌐\n📍 *Nodo:* ${node.monitored_host_name}\n🕒 *Inicio:* ${formattedStart}\n⏳ *Duracion:* ${node.problem_duration}`);
                    }
                    
                } catch (error) {
                    console.error("Error al enviar nodos iniciales:", error.message);
                }
            } 
        });

        createBot({
            flow: adapterFlow,
            provider: adapterProvider,
            database: adapterDB,
        });

        QRPortalWeb();

        // Cargar la ruta para enviar mensajes
        app.use('/send-message', sendMessageRoute(getAdapterProvider));

        // Monitorizar cambios en nodos de backup
        setInterval(async () => {
            try {
                const newNodes = await getNodosBackup();
                const { addedNodes, removedNodes } = detectChanges(newNodes);
            
                if (addedNodes.length > 0 || removedNodes.length > 0) {
                    currentBackupNodes = newNodes; // Actualizar el estado actual
                
                    // Notificar nodos agregados
                    for (const node of addedNodes) {
                        const formattedStart = `${node.problem_start_date} ${node.problem_start_time}`;
                        await sendMessageWithDelay(ALERT_NUMBER,
                            `🌐 *Nodo en Backup* 🌐\n📌 *Nodo:* ${node.monitored_host_name}\n⏰ *Inicio:* ${formattedStart}\n⏳ *Duracion:* ${node.problem_duration}`);
                    }
                
                    // Notificar nodos removidos
                    for (const node of removedNodes) {
                        await sendMessageWithDelay(ALERT_NUMBER,
                            `🌐 *Nodo en Backup Recuperado* 🌐\n📌 *Nodo:* ${node.monitored_host_name}\n⏳ *Duración en Backup:* ${node.problem_duration}`);
                    }
                }
            } catch (error) {
                console.error("Error al monitorizar nodos de backup:", error.message);
            }
        }, 30000); // Verificar cada 30 segundos

        // Enviar actualizaciones de nodos en backup cada 2 minutos
        setInterval(async () => {
            try {
                if (currentBackupNodes.length > 0) {
                    await sendNodeUpdates(currentBackupNodes, "🌐 *Actualización Nodo en Backup* 🌐", 4000);
                } else {
                    await sendMessageWithDelay(ALERT_NUMBER, "🌐 *Actualización* 🌐\n✅ No hay nodos en backup actualmente.", 4100);
                }
            } catch (error) {
                console.error("Error al enviar actualización de nodos en backup:", error.message);
            }
        }, 120000); // Cada 2 minutos

        // Monitorizar cambios en nodos caídos
        setInterval(async () => {
            try {
                const newFallenNodes = await getNodosCaidos();
                const { addedFNodes, removedFNodes } = detectFallenNodeChanges(newFallenNodes);
            
                if (addedFNodes.length > 0 || removedFNodes.length > 0) {
                    currentFallenNodes = newFallenNodes; // Actualizar el estado actual
                
                    // Notificar nodos caídos agregados
                    for (const node of addedFNodes) {
                        await sendMessageWithDelay(ALERT_NUMBER,
                            `⚠️ *Nodo Caído* ⚠️\n📍 *Nodo:* ${node.mapa_nombre}\n🕒 *Caido a las:* ${node.momento_caida}\n⏳ *Duración:* ${node.duracion_caida}`);
                    }
                
                    // Notificar nodos caídos recuperados
                    for (const node of removedFNodes) {
                        await sendMessageWithDelay(ALERT_NUMBER,
                            `✅ *Nodo Caído Recuperado* ✅\n📍 *Nodo:* ${node.mapa_nombre}\n⏳ *Duración:* ${node.duracion_caida}`);
                    }
                }
            } catch (error) {
                console.error("Error al monitorizar nodos caídos:", error.message);
            }
        }, 29000); // Verificar cada 30 segundos

        // Para los nodos caídos
        setInterval(async () => {
            try {
                if (currentFallenNodes.length > 0) {
                    await sendNodeUpdates(currentFallenNodes, "🔄 *Actualización Nodo Caído* 🔄", 3800);
                } else {
                    await sendMessageWithDelay(ALERT_NUMBER, "🔄 *Actualización* 🔄\n✅ No hay nodos caídos actualmente.", 3900);
                }
            } catch (error) {
                console.error("Error al enviar actualización de nodos caídos:", error.message);
            }
        }, 120000); // Cada 2 minutos



        app.listen(PORT, () => {
            console.log(`Servidor API corriendo en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Error al iniciar la aplicación:", error.message);
        process.exit(1);
    }
};

// Ejecutar la aplicación principal
main();

process.on('SIGINT', async () => {
    console.log("Cerrando la aplicación...");
    await closeDB();
    process.exit();
});
