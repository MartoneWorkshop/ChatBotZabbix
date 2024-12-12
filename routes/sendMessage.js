const express = require('express');

module.exports = (getAdapterProvider) => {
    const router = express.Router();

    router.post('/', async (req, res) => {
        const { number, message } = req.body;

        if (!number || !message) {
            return res.status(400).json({
                success: false,
                error: 'Número y mensaje son requeridos.',
            });
        }

        try {
            const adapterProvider = getAdapterProvider();
            const messageText = typeof message === 'string' ? message : JSON.stringify(message);

            await adapterProvider.sendMessage(number, messageText);

            return res.json({ success: true, message: 'Mensaje enviado exitosamente.' });
        } catch (error) {
            console.error('Error al enviar el mensaje:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al enviar el mensaje.',
                details: error.message,
            });
        }
    });

    return router;
};
