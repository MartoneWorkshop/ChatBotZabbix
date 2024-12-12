const { sendMessageWithDelay } = require('../services/messageService');
const detectChanges = require('../utils/detectChanges');

const handleBackupUpdates = async (provider, currentBackupNodes, getBackupNodes, ALERT_NUMBER) => {
    const newNodes = await getBackupNodes();
    const { addedNodes, removedNodes } = detectChanges(newNodes, currentBackupNodes, 'monitored_host_name');

    if (addedNodes.length || removedNodes.length) {
        currentBackupNodes.splice(0, currentBackupNodes.length, ...newNodes);

        for (const node of addedNodes) {
            const formattedStart = `${node.problem_start_date} ${node.problem_start_time}`;
            await sendMessageWithDelay(provider, ALERT_NUMBER,
                `🌐 *Nodo en Backup* 🌐\n📌 *Nodo:* ${node.monitored_host_name}\n⏰ *Inicio:* ${formattedStart}\n⏳ *Duración:* ${node.problem_duration}`,
                1500
            );
        }

        for (const node of removedNodes) {
            await sendMessageWithDelay(provider, ALERT_NUMBER,
                `✅ *Nodo en Backup Recuperado* 🌐\n📌 *Nodo:* ${node.monitored_host_name}\n⏳ *Duración:* ${node.problem_duration}`,
                2000
            );
        }
    }
};

const sendBackupUpdates = async (provider, currentBackupNodes, ALERT_NUMBER) => {
    try {
        if (currentBackupNodes.length > 0) {
            for (const node of currentBackupNodes) {
                await sendMessageWithDelay(
                    provider,
                    ALERT_NUMBER,
                    `🌐 *Actualización Nodo en Backup* 🌐\n📌 *Nodo:* ${node.monitored_host_name}\n⏰ *Inicio:* ${node.problem_start_date} ${node.problem_start_time}\n⏳ *Duración:* ${node.problem_duration}`,
                    2000
                );
            }
        } else {
            await sendMessageWithDelay(provider, ALERT_NUMBER, "🌐 *Actualización* 🌐\n✅ No hay nodos en backup actualmente.", 4100);
        }
    } catch (error) {
        console.error("Error al enviar actualización de nodos en backup:", error.message);
    }
};

module.exports = { handleBackupUpdates, sendBackupUpdates };