const { getSession, setSession, clearSession } = require('../utils/sessionManager');
const { getRecipients, updateRecipients, saveRecipients } = require('../utils/updateRecipients');

// Función para formatear números
const formatPhoneNumber = (input) => {
    // Eliminar caracteres no numéricos
    let formatted = input.replace(/[^0-9]/g, '');

    // Validar y corregir formato
    if (formatted.startsWith('58') && formatted.length === 12) {
        // Correcto: ya tiene prefijo 58 y 10 dígitos
        return formatted;
    } else if (formatted.startsWith('0') && formatted.length === 11) {
        // Cambiar prefijo 0 por 58
        return `58${formatted.slice(1)}`;
    } else if (formatted.length === 10) {
        // Asumir que es un número nacional sin prefijo (04121212949)
        return `58${formatted}`;
    } else {
        // Número inválido
        return null;
    }
};

const configRecipientsFlow = async (bot, message) => {
    const { body, from } = message;
    let session = await getSession(from) || {}; // Obtener o inicializar la sesión.

    // Mostrar lista de destinatarios
    if (body.trim() === '!show_list') {
        const recipients = getRecipients(); // Obtener la lista actual.
        if (recipients.length > 0) {
            const formattedList = recipients
                .map((recipient, index) => `${index + 1}. ${recipient.split('@')[0]}`) // Mostrar sin el sufijo.
                .join('\n');
            await bot.sendMessage(
                from,
                "📋 *Lista de destinatarios actuales:*\n" +
                formattedList +
                "\n\nUsa:\n" +
                "- `!remove <n de lista>` para eliminar destinatarios.\n" +
                "- `!phone` para agregar un número de teléfono.\n" +
                "- `!group` para agregar un grupo."
            );
        } else {
            await bot.sendMessage(
                from,
                "ℹ️ *La lista de destinatarios está vacía.* Usa `!phone` o `!group` para agregar destinatarios."
            );
        }
        return;
    }

    // Cancelar operación
    if (body.trim() === '!cancel') {
        session.tempRecipient = null; // Limpiar temporal.
        await setSession(from, session); // Guardar sesión.
        await bot.sendMessage(from, "❌ *Operación cancelada.*");
        return;
    }

    // Eliminar destinatarios
    if (body.startsWith('!remove ')) {
        const recipients = getRecipients(); // Obtener la lista actual.
        const indices = body.split(' ')[1]
            .split(',')
            .map((num) => parseInt(num.trim()) - 1) // Convertir a índices del array.
            .filter((index) => index >= 0 && index < recipients.length); // Validar índices.

        if (indices.length > 0) {
            const removed = indices.map((index) => recipients[index].split('@')[0]); // Quitar sufijo.
            const updatedRecipients = recipients.filter((_, index) => !indices.includes(index));
            updateRecipients(updatedRecipients); // Actualizar la lista global.
            saveRecipients(); // Guardar lista actualizada.
            await bot.sendMessage(
                from,
                "🗑️ *Destinatarios eliminados:*\n" +
                removed.join('\n')
            );
        } else {
            await bot.sendMessage(
                from,
                "⚠️ *Índices inválidos.* Asegúrate de usar números válidos. Usa `!show_list` para ver los números de la lista."
            );
        }
        return;
    }

    // Iniciar configuración
    if (body.trim() === '!start_config') {
        session = { mode: null }; // Inicializar sesión sin modo.
        await setSession(from, session); // Guardar sesión.
        await bot.sendMessage(
            from,
            "🛠️ *Configuración de destinatarios iniciada* 🛠️\n\n" +
            "Escribe `!phone` para agregar un número de teléfono o `!group` para agregar un grupo.\n" +
            "Usa `!show_list` para mostrar la lista actual de destinatarios.\n" +
            "Usa `!end_config` para finalizar."
        );
        return;
    }

    // Agregar número de teléfono
    if (session.mode === 'phone' && body.startsWith('!add_number ')) {
        const number = body.split(' ')[1];
        const formattedNumber = formatPhoneNumber(number);

        if (formattedNumber) {
            session.tempRecipient = formattedNumber; // Guardar temporalmente el número formateado.
            await setSession(from, session); // Guardar sesión.
            await bot.sendMessage(
                from,
                `📞 Has introducido este número: ${formattedNumber}\n` +
                "Confirma agregarlo enviando `!save` o cancela con `!cancel`."
            );
        } else {
            await bot.sendMessage(
                from,
                "⚠️ *Número inválido.* Asegúrate de usar un formato válido, ejemplo: +584121212949 o 04121212949."
            );
        }
        return;
    }

    // Confirmar guardar número
    if (body.trim() === '!save' && session.tempRecipient) {
        const recipient = `${session.tempRecipient}@s.whatsapp.net`; // Internamente se agrega el sufijo.
        const recipients = getRecipients(); // Obtener lista actual.
        if (!recipients.includes(recipient)) {
            recipients.push(recipient);
            updateRecipients(recipients); // Actualizar lista global.
            saveRecipients(); // Guardar lista actualizada.
            session.tempRecipient = null; // Limpiar temporal.
            await setSession(from, session); // Guardar sesión.
            await bot.sendMessage(
                from,
                `✅ *Número agregado:* ${recipient.split('@')[0]}\n` +
                "Escribe `!show_list` para ver la lista actual."
            );
        } else {
            await bot.sendMessage(from, "ℹ️ *El número ya está en la lista de destinatarios.*");
        }
        return;
    }

    // Finalizar configuración
    if (body.trim() === '!end_config') {
        await clearSession(from); // Limpiar sesión.
        await bot.sendMessage(
            from,
            "🛠️ *Configuración finalizada.* Usa `!show_list` para ver la lista de destinatarios actual."
        );
        return;
    }

    // Comando no reconocido
    await bot.sendMessage(from, "❓ *Comando no reconocido.* Usa `!start_config` para comenzar.");
};

module.exports = { configRecipientsFlow };