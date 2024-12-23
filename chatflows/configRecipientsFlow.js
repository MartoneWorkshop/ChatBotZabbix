const { getSession, setSession, clearSession } = require('../utils/sessionManager');
const { getRecipients, updateRecipients, saveRecipients } = require('../utils/updateRecipients');

// Función para formatear números
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

const configRecipientsFlow = async (bot, message) => {
    const { body, from, participant, contacts } = message;
    const userId = participant || from; 
    // Verificar si ya hay una sesión activa global
    const activeSession = await getSession('global'); // Obtener sesión global
    // Ignorar mensajes que no sean el comando !start_config cuando no hay sesión activa
    if (!activeSession || !activeSession.isActive) {
        if (message.body !== '!start_config') {
            return;
        }
    }

    // Si hay una sesión activa y el usuario no es el iniciador, ignorar mensajes
    if (activeSession && activeSession.isActive) {
        const initiatorNumber = activeSession.initiator.split('@')[0];
    
        if (activeSession.initiator !== userId) {
            await bot.sendMessage(
                from,
                `⚠️ *Ya hay una sesión activa iniciada por el usuario @${initiatorNumber}.*`
            );
            return;
        }
    }

    // Si no hay sesión activa o si el usuario es el iniciador, se permite comenzar una nueva sesión
    if (body.trim() === '!start_config') {
        if (activeSession && activeSession.isActive) {
            await bot.sendMessage(from, "⚠️ *Ya hay una sesión activa.*");
            return;
        }

        const newSession = {
            isActive: true,
            initiator: userId,
            tempRecipient: null,
            selectedGroups: [],
            mode: null // Agregar modo a la sesión
        };
        await setSession('global', newSession); // Crear sesión global
        await setSession(userId, newSession); // Crear sesión específica para el usuario
        await bot.sendMessage(
            from,
            "🛠️ *Configuración iniciada.*\n\n" +
            "Comandos disponibles:\n" +
            "- `!phone` para agregar un número de teléfono.\n" +
            "- `!group` para agregar un grupo.\n" +
            "- `!show_list` para mostrar destinatarios.\n" +
            "- `!end_config` para finalizar."
        );
        return;
    }

    // Obtener la sesión del usuario
    const session = await getSession(userId);
    // Si no hay sesión activa, retornar sin hacer nada
    if (!session || !session.isActive) {
        await bot.sendMessage(from, "⚠️ *No tienes una sesión activa.*");
        return;
    }

    // Mostrar lista de destinatarios
    if (body.trim() === '!show_list') {
        const recipients = getRecipients(); // Obtener la lista actual.
        if (recipients.length > 0) {
            const allChats = await bot.store.chats.all();
            const groups = allChats.filter(chat => chat.id.endsWith('@g.us'));
            const formattedList = recipients
                .map((recipient, index) => {
                    if (recipient.endsWith('@g.us')) {
                        const group = groups.find(group => group.id === recipient);
                        const groupName = group ? group.name || group.subject || 'Grupo desconocido' : 'Grupo no encontrado';
                        return `${index + 1}. ${groupName}`;
                    } else {
                        return `${index + 1}. ${recipient.split('@')[0]}`;
                    }
                })
                .join('\n');

            await bot.sendMessage(
                from,
                "📋 *Lista de destinatarios actuales:*\n" +
                formattedList +
                "\n\nComandos disponibles:\n" +
                "- `!phone` para agregar un número de teléfono.\n" +
                "- `!group` para agregar un grupo.\n" +
                "- `!remove <índices>` para eliminar destinatarios.\n" +
                "- `!end_config` para finalizar la configuración."
            );
        } else {
            await bot.sendMessage(
                from,
                "ℹ️ *La lista de destinatarios está vacía.* Usa `!phone` o `!group` para agregar destinatarios."
            );
        }
        return;
    }

    // Eliminar destinatarios o grupos
    if (body.startsWith('!remove ')) {
        const recipients = getRecipients(); // Obtener lista actual.
        const indices = body.split(' ')[1]
            .split(',')
            .map((num) => parseInt(num.trim()) - 1)
            .filter((index) => index >= 0 && index < recipients.length);

        if (indices.length > 0) {
            const removed = indices.map((index) => recipients[index].split('@')[0]);
            const updatedRecipients = recipients.filter((_, index) => !indices.includes(index));
            updateRecipients(updatedRecipients);
            saveRecipients();
            await bot.sendMessage(
                from,
                `🗑️ *Eliminado(s):*\n${removed.join('\n')}\n` +
                "Comandos Disponibles:\n" +
                "- Escribe `!phone` para agregar un número de teléfono.\n" +
                "- Escribe `!group` para agregar un grupo.\n" +
                "- Escribe `!show_list` para ver la lista actual.\n" +
                "- Escribe `!end_config` para finalizar la configuración."
            );
        } else {
            await bot.sendMessage(
                from,
                "⚠️ *Índices inválidos.* Asegúrate de usar números válidos. Usa `!show_list` para ver los números de la lista."
            );
        }
        return;
    }



    // Activar modo para agregar número de teléfono
    if (body.trim() === '!phone') {
        session.mode = 'phone';
        await setSession(userId, session);
        await bot.sendMessage(
            from,
            "📞 *Modo agregar números activado.*\n" +
            "Puedes hacer lo siguiente:\n" +
            "1️⃣ Escribe `!add_number <número>` para agregar un número.\n" +
            "   Ejemplo: `!add_number +58412XXXXXXX` o `!add_number 0412XXXXXXX`.\n" +
            "2️⃣ Envía una tarjeta de contacto para agregar el número automáticamente.\n" +
            "Usa `!save_list` para guardar el número en la lista o `!cancel` para salir."
        );
        return;
    }

    // Modo "phone" activado
    if (session.mode === 'phone') {
        if (body.trim() === '!cancel') {
            session.tempRecipient = null;
            session.mode = null;
            await setSession(userId, session);
        await bot.sendMessage(from, "❌ *Operación cancelada.*");
        return;
    }

    if (body.startsWith('contact:')) {
        const contacts = body.split(' '); // Dividir el mensaje en partes separadas por espacio
        let allValid = true;
        const validNumbers = []; // Array para almacenar números válidos

        for (let contact of contacts) {
            if (contact.startsWith('contact:')) {
                const phoneNumber = contact.replace('contact:', '').trim(); // Extraer el número de contacto
                const formattedNumber = formatPhoneNumber(phoneNumber); // Aplicar formato al número

                if (formattedNumber) {
                    validNumbers.push(formattedNumber); // Agregar número al array
                    await bot.sendMessage(
                        from,
                        `✅ *Número ${formattedNumber} agregado temporalmente.*\n` +
                        "Escribe `!save_list` para guardar el número o `!cancel` para cancelar."
                    );
                } else {
                    allValid = false;
                    await bot.sendMessage(from, `⚠️ *El número ${phoneNumber} no es válido o no tiene el formato adecuado.*`);
                }
            }
        }

        // Almacenar todos los números válidos en session.tempRecipient
        if (validNumbers.length > 0) {
            session.tempRecipient = session.tempRecipient || [];
            session.tempRecipient.push(...validNumbers); // Agregar nuevos números válidos
            await setSession(userId, session);
        }

        if (allValid) {
            await bot.sendMessage(from, "Todos los números fueron agregados correctamente.");
        } else {
            await bot.sendMessage(from, "Algunos números no fueron válidos. Revisa los mensajes de advertencia.");
        }
        return;
    }
    // Verificar si el mensaje contiene un número con el comando !add_number
    if (body.trim().startsWith('!add_number')) {
        const phoneNumber = body.trim().split(' ')[1]; // Extraer número
        if (phoneNumber) {
            const formattedNumber = formatPhoneNumber(phoneNumber); // Aplicar formato
            if (formattedNumber) {
                session.tempRecipient = formattedNumber;
                await setSession(userId, session);
                await bot.sendMessage(
                    from,
                    `✅ *Número ${formattedNumber} agregado temporalmente.*\n` +
                    "Escribe `!save_list` para guardar el número o `!cancel` para cancelar."
                );
            } else {
                await bot.sendMessage(from, "⚠️ *Por favor, proporciona un número válido con el formato adecuado.*");
            }
        } else {
            await bot.sendMessage(from, "⚠️ *Por favor, proporciona un número válido con el formato adecuado.*");
        }
        return;
    }

    // Guardar número temporal en la lista
    if (body.trim() === '!save_list') {
        if (session.tempRecipient) {
            const recipients = getRecipients();
            // Verificar si el número es de teléfono y agregarlo con el sufijo correcto
            if (Array.isArray(session.tempRecipient)) {
                session.tempRecipient.forEach(number => {
                    if (number.startsWith('58') && !number.includes('@')) {
                        number = `${number}@s.whatsapp.net`;
                    }
                    recipients.push(number);
                });
            } else {
                if (typeof session.tempRecipient === 'string' && session.tempRecipient.startsWith('58') && !session.tempRecipient.includes('@')) {
                    session.tempRecipient = `${session.tempRecipient}@s.whatsapp.net`;
                }
                recipients.push(session.tempRecipient);
            }
            updateRecipients(recipients);
            saveRecipients();
            session.tempRecipient = null;
            session.mode = null;
            await setSession(userId, session);
            await bot.sendMessage(from, `✅ *Número(s) agregado(s) a la lista.*`);
        } else {
            await bot.sendMessage(from, "⚠️ *No hay números para guardar.*");
        }
        return;
    }
}

    // Mostrar lista de grupos
    if (body.trim() === '!group') {
        session.mode = 'group';
        await setSession(userId, session);
        try {
            const allChats = await bot.store.chats.all();
            const groups = allChats.filter(chat => chat.id.endsWith('@g.us'));

            if (groups.length > 0) {
                const groupList = groups
                    .map((group, index) => {
                        const groupName = group.name || group.subject || 'Nombre no disponible';
                        return `${index + 1}. ${groupName} (ID: ${group.id})`;
                    })
                    .join('\n');

                await bot.sendMessage(
                    from,
                    "👥 *Grupos disponibles:*\n" +
                    groupList +
                    "\n\nEscribe `!add_group <número>` para agregar un grupo a la lista de destinatarios.\n" +
                    "Usa `!cancel` para salir."
                );
            } else {
                await bot.sendMessage(
                    from,
                    "ℹ️ *No se encontraron grupos disponibles.* Asegúrate de que el bot esté en algún grupo."
                );
            }
        } catch (error) {
            await bot.sendMessage(
                from,
                "⚠️ *Error al intentar obtener la lista de grupos.* Revisa los logs para más detalles."
            );
        }
        return;
    }

    // Modo de agregar un grupo
    if (session.mode === 'group') {
        if (body.trim() === '!cancel') {
            session.tempRecipient = null;
            session.mode = null;
            await setSession(userId, session);
            await bot.sendMessage(from, "❌ *Operación cancelada.*\nLa operación de agregar grupo ha sido cancelada.");
            return;
        }

        if (body.startsWith('!add_group ')) {
            const groupIndex = parseInt(body.split(' ')[1]) - 1;
            const allChats = await bot.store.chats.all();
            const groups = allChats.filter(chat => chat.id.endsWith('@g.us'));

            if (groupIndex >= 0 && groupIndex < groups.length) {
                const groupId = groups[groupIndex].id;
                session.tempRecipient = groupId;
                await setSession(userId, session);
                await bot.sendMessage(
                    from,
                    `✅ *Grupo ${groups[groupIndex].name} agregado temporalmente.*\nEscribe !save_list para guardar la lista o !cancel para cancelar.`
                );
            } else {
                await bot.sendMessage(
                    from,
                    "⚠️ *Índice inválido.* Asegúrate de usar un número válido del listado de grupos."
                );
            }
            return;
        }

        if (body.trim() === '!save_list') {
            if (session.tempRecipient) {
                session.selectedGroups = session.selectedGroups || [];
                session.selectedGroups.push(session.tempRecipient);
                session.tempRecipient = null;
                await setSession(userId, session);
                await bot.sendMessage(from, "✅ *Grupo guardado en la lista.*");
            } else {
                await bot.sendMessage(from, "⚠️ *No hay un grupo para guardar. Usa `!add_group` para agregar un grupo.*");
            }
            return;
        }
    }

    // Finalizar configuración
    if (body.trim() === '!end_config') {
        if (!session.isActive) {
            await bot.sendMessage(
                from,
                "⚠️ *No hay una sesión activa para finalizar.* Usa `!start_config` para iniciar una configuración."
            );
            return;
        }
    
        if (session.initiator !== userId) {
            await bot.sendMessage(
                from,
                "⚠️ *Solo la persona que inició la sesión puede finalizarla.*"
            );
            return;
        }
    
        session.isActive = false;
        session.initiator = null;
        session.tempRecipient = null;
        session.selectedGroups = [];
        session.mode = null;
        await setSession(userId, session);
    
        await bot.sendMessage(
            from,
            "🛠️ *Configuración finalizada.* La sesión ha sido cerrada."
        );
    
        return;
    }

    await bot.sendMessage(from, `❓ *Comando no reconocido.* ${body}`);
};

module.exports = { configRecipientsFlow };