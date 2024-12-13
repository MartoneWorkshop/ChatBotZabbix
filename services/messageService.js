const sendMessage = async (provider, number, message) => {
    try {
        // Envía el mensaje al número especificado utilizando el proveedor.
        await provider.sendMessage(number, message);
    } catch (error) {
        console.error("Error al enviar el mensaje:", error.message);
    }
};

const sendMessageWithDelay = async (provider, recipients, message, delay) => {
    return new Promise(resolve => {
        setTimeout(async () => {
            if (Array.isArray(recipients)) {
                await sendToMultipleRecipients(provider, recipients, message);
            } else {
                await sendMessage(provider, recipients, message);
            }
            resolve();
        }, delay);
    });
};

const sendToMultipleRecipients = async (provider, recipients, message) => {
    for (let recipient of recipients) {
        await sendMessage(provider, recipient, message);
    }
};

module.exports = { sendMessage, sendMessageWithDelay, sendToMultipleRecipients};