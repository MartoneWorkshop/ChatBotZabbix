const { createBot, createProvider, createFlow } = require('@bot-whatsapp/bot');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');

let adapterProvider;

const createBotService = () => {
    // Crea un flujo vacío (sin palabras clave ni lógica inicial).
    const adapterFlow = createFlow([]);
    // Inicializa el proveedor Baileys para manejar la conexión con WhatsApp.
    adapterProvider = createProvider(BaileysProvider);
     // Crea una base de datos simulada para almacenar datos relacionados con el bot.
    const adapterDB = new MockAdapter();

    // Crea y configura el bot con el flujo, proveedor y base de datos especificados.
    createBot({
        flow: adapterFlow, //Flujo de mensajes
        provider: adapterProvider, //Proveedor
        database: adapterDB, //Base de datos
    });

    return adapterProvider;
};

const getAdapterProvider = () => {
    if (!adapterProvider) throw new Error("El adapterProvider no está inicializado.");
    return adapterProvider;
};

module.exports = { createBotService, getAdapterProvider };