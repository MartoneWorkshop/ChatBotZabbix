const { configRecipientsFlow } = require('../chatflows/configRecipientsFlow');

const botController = async (bot, message) => {
    const context = {}; // Inicializa un objeto vacío para el contexto.

    try {
        // Detectar cuando `body` está vacío y registrar el mensaje completo
        if (!message.body || message.body.trim() === '') {        }
        // Verificar si hay contactos dentro de message.contactsArrayMessage
        if (message?.message?.contactsArrayMessage?.contacts) {            
            // Extraemos los contactos del array
            const contacts = [];

            for (const contactObj of message.message.contactsArrayMessage.contacts) {
                if (contactObj?.vcard) {
                    const matches = [...contactObj.vcard.matchAll(/waid=(\d+)/g)];
                    matches.forEach(match => {
                        const waid = match[1];
                        contacts.push(`contact:${waid}`);
                    });
                } else {
                    console.log("Advertencia: Objeto de contacto sin vCard:", contactObj);
                }
            }

            // Si hay contactos válidos, actualizamos el cuerpo del mensaje
            if (contacts.length > 0) {
                message.body = contacts.join(' '); // Unimos los contactos con un espacio
            } else {
                console.log("Error: No se encontraron contactos válidos.");
            }
        }

        // Llamar al flujo de configuración de destinatarios
        await configRecipientsFlow(bot, message, context);
    } catch (error) {
        console.error('Error en el flujo del bot:', error);
    }
};

module.exports = botController;
