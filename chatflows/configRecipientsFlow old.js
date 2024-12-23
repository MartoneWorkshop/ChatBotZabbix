const { getSession, setSession, clearSession } = require('../utils/sessionManager');
const { getRecipients, updateRecipients, saveRecipients } = require('../utils/updateRecipients');

const formatPhoneNumber = (input) => {
    let formatted = input.replace(/[^0-9]/g, '');
    if (formatted.startsWith('58') && formatted.length === 12) {
        return formatted;
    } else if (formatted.startsWith('0') && formatted.length === 11) {
        return `58${formatted.slice(1)}`;
    } else if (formatted.length === 10) {
        return `58${formatted}`;
    } else {
        return null;
    }
};

const sendConfigurationMenu = async (bot, from) => {
    const buttons = [
        { text: 'Agregar número' },
        { text: 'Agregar grupo' },
        { text: 'Mostrar destinatarios' },
        { text: 'Finalizar configuración' }
    ];

    const message = "🛠️ *Configuración iniciada.*\n\nSelecciona una opción para continuar:";
    await bot.sendButtons(from, message, buttons);
};

const configRecipientsFlow = async (bot, message) => {
    const { body, from, participant, buttonResponse } = message;
    const userId = participant || from;
    const payload = buttonResponse?.selectedButtonId || body;

    const activeSession = await getSession('global');

if (payload === '!start_config') {
    if (activeSession?.isActive) {
        const initiatorNumber = activeSession.initiator.split('@')[0];
        await bot.sendMessage(
            from,
            `⚠️ *Ya hay una sesión activa iniciada por el usuario @${initiatorNumber}.*`
        );
        return;
    }

    const newSession = {
        isActive: true,
        initiator: userId,
        tempRecipient: null,
        selectedGroups: []
    };

    await setSession('global', newSession);
    await setSession(userId, newSession);
    await sendConfigurationMenu(bot, from);
    return;
}

const session = await getSession(userId);

if (!session || !session.isActive) {
    await bot.sendMessage(from, "⚠️ *No tienes una sesión activa.* Usa `!start_config` para iniciar.");
    return;
}

switch (payload) {
    case 'add_number':
        session.mode = 'phone';
        await setSession(userId, session);
        await bot.sendMessage(
            from,
            "📞 *Modo agregar números activado.*\n" +
                "Escribe `!add_number <número>` para agregarlo.\n" +
                "Ejemplo: `!add_number +58412XXXXXXX`.\n\nUsa el botón para cancelar.",
            { buttons: [{ id: 'cancel', text: 'Cancelar' }] }
        );
        break;

    case 'add_group':
        session.mode = 'group';
        await setSession(userId, session);
        await bot.sendMessage(
            from,
            "🛡️ *Modo agregar grupos activado.*\n" +
                "Envía el nombre del grupo para agregarlo.\n\nUsa el botón para cancelar.",
            { buttons: [{ id: 'cancel', text: 'Cancelar' }] }
        );
        break;

    case 'show_recipients':
        const recipients = getRecipients();
        const formattedList = recipients.length > 0
            ? recipients.map((recipient, i) => `${i + 1}. ${recipient}`).join('\n')
            : "ℹ️ *La lista de destinatarios está vacía.* Usa los botones para agregar destinatarios.";

        await bot.sendMessage(from, `📋 *Lista de destinatarios:*\n${formattedList}`);
        break;

    case 'end_config':
        if (session.initiator !== userId) {
            await bot.sendMessage(from, "⚠️ *Solo el usuario que inició la configuración puede finalizarla.*");
            return;
        }

        await clearSession('global');
        await clearSession(userId);
        await bot.sendMessage(from, "🛠️ *Configuración finalizada.*");
        break;

    case 'cancel':
        session.mode = null;
        session.tempRecipient = null;
        await setSession(userId, session);
        await bot.sendMessage(from, "❌ *Operación cancelada.*");
        break;

    default:
        if (session.mode === 'phone' && payload.startsWith('!add_number')) {
            const phoneNumber = payload.split(' ')[1];
            const formattedNumber = formatPhoneNumber(phoneNumber);

            if (formattedNumber) {
                const recipients = getRecipients();
                recipients.push(formattedNumber);
                updateRecipients(recipients);
                saveRecipients();

                await bot.sendMessage(from, `✅ *Número agregado: ${formattedNumber}.*`);
            } else {
                await bot.sendMessage(from, "⚠️ *Número inválido. Intenta nuevamente.*");
            }
        } else {
            await bot.sendMessage(from, "❓ *Acción no reconocida.*");
        }
        break;
}
};

module.exports = { configRecipientsFlow };