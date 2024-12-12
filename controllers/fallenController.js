const { sendMessageWithDelay } = require('../services/messageService');
const detectChanges = require('../utils/detectChanges');

const handleFallenUpdates = async (provider, currentFallenNodes, getFallenNodes, ALERT_NUMBER) => {
    const newFallenNodes = await getFallenNodes();
    const { addedNodes, removedNodes } = detectChanges(newFallenNodes, currentFallenNodes, 'mapa_nombre');

    if (addedNodes.length || removedNodes.length) {
        currentFallenNodes.splice(0, currentFallenNodes.length, ...newFallenNodes);

        for (const node of addedNodes) {
            await sendMessageWithDelay(provider, ALERT_NUMBER,
                `⚠️ *Nodo Caído* ⚠️\n📍 *Nodo:* ${node.mapa_nombre}\n🕒 *Caído a las:* ${node.momento_caida}\n⏳ *Duración:* ${node.duracion_caida}`,
                1000
            );
        }

        for (const node of removedNodes) {
            await sendMessageWithDelay(provider, ALERT_NUMBER,
                `✅ *Nodo Caído Recuperado* ✅\n📍 *Nodo:* ${node.mapa_nombre}\n⏳ *Duración:* ${node.duracion_caida}`,
                2000
            );
        }
    }
};

const sendFallenUpdates = async (provider, currentFallenNodes, ALERT_NUMBER) => {
    try {
        if (currentFallenNodes.length > 0) {
            for (const node of currentFallenNodes) {
                await sendMessageWithDelay(
                    provider,
                    ALERT_NUMBER,
                    `🔄 *Actualización Nodo Caído* 🔄\n📍 *Nodo:* ${node.mapa_nombre}\n🕒 *Caído a las:* ${node.momento_caida}\n⏳ *Duración:* ${node.duracion_caida}`,
                    2000
                );
            }
        } else {
            await sendMessageWithDelay(provider, ALERT_NUMBER, "🔄 *Actualización* 🔄\n✅ No hay nodos caídos actualmente.", 3900);
        }
    } catch (error) {
        console.error("Error al enviar actualización de nodos caídos:", error.message);
    }
};

module.exports = { handleFallenUpdates, sendFallenUpdates };