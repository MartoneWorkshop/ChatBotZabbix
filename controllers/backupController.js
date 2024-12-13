const { sendMessageWithDelay } = require('../services/messageService');
const detectChanges = require('../utils/detectChanges');
const { SEND_UPDATE_INTERVAL } = require('../config/constants');

let lastBackupMessageSent = 0; // Almacena la última vez que se envió una actualización.

const handleBackupUpdates = async (provider, currentBackupNodes, getBackupNodes, recipients) => {
    const newNodes = await getBackupNodes();
    const { addedNodes, removedNodes } = detectChanges(newNodes, currentBackupNodes, 'monitored_host_name');
    const now = Date.now();

    if (addedNodes.length || removedNodes.length) {
        currentBackupNodes.splice(0, currentBackupNodes.length, ...newNodes);

        for (const node of addedNodes) {
            const formattedStart = `${node.problem_start_date} ${node.problem_start_time}`;
            const message = `🌐 *Nodo en Backup* 🌐\n📌 *Nodo:* ${node.monitored_host_name}\n⏰ *Inicio:* ${formattedStart}\n⏳ *Duración:* ${node.problem_duration}`;
            await sendMessageWithDelay(provider, recipients, message, 1500);
        }

        for (const node of removedNodes) {
            const message = `✅ *Nodo en Backup Recuperado* 🌐\n📌 *Nodo:* ${node.monitored_host_name}\n⏳ *Duración:* ${node.problem_duration}`;
            await sendMessageWithDelay(provider, recipients, message, 1500);
        }

        lastBackupMessageSent = now; // Actualizar el último envío
    } else if (now - lastBackupMessageSent >= SEND_UPDATE_INTERVAL) {
        await sendBackupUpdates(provider, currentBackupNodes, recipients);
        lastBackupMessageSent = now; // Actualizar el último envío
    }
};

const sendBackupUpdates = async (provider, currentBackupNodes, recipients) => {
    try {
        if (currentBackupNodes.length > 0) {
            for (const node of currentBackupNodes) {
                const message = `🌐 *Actualización Nodo en Backup* 🌐\n📌 *Nodo:* ${node.monitored_host_name}\n⏰ *Inicio:* ${node.problem_start_date} ${node.problem_start_time}\n⏳ *Duración:* ${node.problem_duration}`;
                await sendMessageWithDelay(provider, recipients, message, 5000);
            }
        } else {
            const message = "🌐 *Actualización* 🌐\n✅ No hay nodos en backup actualmente.";
            await sendMessageWithDelay(provider, recipients, message, 5000);
        }
    } catch (error) {
        console.error("Error al enviar actualización de nodos en backup:", error.message);
    }
};

module.exports = { handleBackupUpdates, sendBackupUpdates };