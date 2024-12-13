const { sendMessageWithDelay } = require('../services/messageService');
const detectChanges = require('../utils/detectChanges');
const { SEND_UPDATE_INTERVAL } = require('../config/constants');

let lastFallenMessageSent = 0; // Almacena la última vez que se envió una actualización.

const handleFallenUpdates = async (provider, currentFallenNodes, getFallenNodes, recipients) => {
    const newFallenNodes = await getFallenNodes();
    const { addedNodes, removedNodes } = detectChanges(newFallenNodes, currentFallenNodes, 'mapa_nombre');
    const now = Date.now();

    if (addedNodes.length || removedNodes.length) {
        currentFallenNodes.splice(0, currentFallenNodes.length, ...newFallenNodes);

        for (const node of addedNodes) {
            const message = `⚠️ *Nodo Caído* ⚠️\n📍 *Nodo:* ${node.mapa_nombre}\n🕒 *Caído a las:* ${node.momento_caida}\n⏳ *Duración:* ${node.duracion_caida}`;
            await sendMessageWithDelay(provider, recipients, message, 1400);
        }

        for (const node of removedNodes) {
            const message = `✅ *Nodo Caído Recuperado* ✅\n📍 *Nodo:* ${node.mapa_nombre}\n⏳ *Duración:* ${node.duracion_caida}`;
            await sendMessageWithDelay(provider, recipients, message, 1400);
        }

        lastFallenMessageSent = now; // Actualizar el último envío
    } else if (now - lastFallenMessageSent >= SEND_UPDATE_INTERVAL) {
        await sendFallenUpdates(provider, currentFallenNodes, recipients);
        lastFallenMessageSent = now; // Actualizar el último envío
    }
};

const sendFallenUpdates = async (provider, currentFallenNodes, recipients) => {
    try {
        if (currentFallenNodes.length > 0) {
            for (const node of currentFallenNodes) {
                const message = `🔄 *Actualización Nodo Caído* 🔄\n📍 *Nodo:* ${node.mapa_nombre}\n🕒 *Caído a las:* ${node.momento_caida}\n⏳ *Duración:* ${node.duracion_caida}`;
                await sendMessageWithDelay(provider, recipients, message, 5000);
            }
        } else {
            const message = "🔄 *Actualización* 🔄\n✅ No hay nodos caídos actualmente.";
            await sendMessageWithDelay(provider, recipients, message, 5000);
        }
    } catch (error) {
        console.error("Error al enviar actualización de nodos caídos:", error.message);
    }
};

module.exports = { handleFallenUpdates, sendFallenUpdates };