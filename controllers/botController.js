const { configRecipientsFlow } = require('../chatflows/configRecipientsFlow');

const botController = async (bot, message) => {
    const context = {}; // Inicializa un objeto vacío para el contexto.

    try {
        await configRecipientsFlow(bot, message, context);
    } catch (error) {
        console.error('Error en el flujo del bot:', error);
    }
};

module.exports = botController;