const { sendMessageWithDelay } = require('../services/messageService');

const sendCustomMessage = async (req, res, provider) => {
    try {
        const { number, message } = req.body;

        if (!number || !message) {
            return res.status(400).json({ error: 'Número y mensaje son requeridos.' });
        }

        // Formato del número (e.g., asegurarse de incluir código de país).
        const formattedNumber = `${number}@s.whatsapp.net`;

        await sendMessageWithDelay(provider, [formattedNumber], message, 1000);

        res.status(200).json({ success: true, message: 'Mensaje enviado correctamente.' });
    } catch (error) {
        console.error('Error al enviar mensaje personalizado:', error.message);
        res.status(500).json({ success: false, error: 'Error al enviar el mensaje.' });
    }
};

module.exports = { sendCustomMessage };