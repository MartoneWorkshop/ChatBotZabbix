const sendMessage = async (provider, number, message) => {
    try {
        await provider.sendMessage(number, message);
    } catch (error) {
        console.error("Error al enviar el mensaje:", error.message);
    }
};

const sendMessageWithDelay = async (provider, number, message, delay) => {
    return new Promise(resolve => {
        setTimeout(async () => {
            await sendMessage(provider, number, message);
            resolve();
        }, delay);
    });
};

module.exports = { sendMessage, sendMessageWithDelay };