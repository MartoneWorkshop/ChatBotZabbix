const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');

let adapterProvider;
const createBotService = () => {
    const adapterFlow = createFlow([]);
    adapterProvider = createProvider(BaileysProvider);
    const adapterDB = new MockAdapter();

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    return adapterProvider;
};

const getAdapterProvider = () => {
    if (!adapterProvider) throw new Error("El adapterProvider no está inicializado.");
    return adapterProvider;
};

module.exports = { createBotService, getAdapterProvider };