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
        // Obtener la información de los grupos disponibles
        const allChats = await bot.store.chats.all();
        const groups = allChats.filter(chat => chat.id.endsWith('@g.us'));

        // Formatear lista
        const formattedList = recipients
            .map((recipient, index) => {
                if (recipient.endsWith('@g.us')) {
                    // Buscar el nombre del grupo correspondiente
                    const group = groups.find(group => group.id === recipient);
                    const groupName = group ? group.name || group.subject || 'Grupo desconocido' : 'Grupo no encontrado';
                    return `${index + 1}. ${groupName}`;
                } else {
                    // Mostrar el número sin sufijo
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

    // Cancelar operación
    if (body.trim() === '!cancel') {
        session.tempRecipient = null; // Limpiar temporal.
        await setSession(from, session); // Guardar sesión.
        await bot.sendMessage(from, "❌ *Operación cancelada.*\nUsa `!show_list` para ver la lista o `!end_config` para finalizar.");
        return;
    }

    // Eliminar destinatarios o grupos
if (body.startsWith('!remove ')) {
    const recipients = getRecipients(); // Obtener lista actual.
    const indices = body.split(' ')[1]
        .split(',')
        .map((num) => parseInt(num.trim()) - 1) // Convertir a índices del array.
        .filter((index) => index >= 0 && index < recipients.length); // Validar índices.

    if (indices.length > 0) {
        const removed = indices.map((index) => recipients[index].split('@')[0]); // Quitar sufijo.
        const updatedRecipients = recipients.filter((_, index) => !indices.includes(index));
        updateRecipients(updatedRecipients); // Actualizar lista global.
        saveRecipients(); // Guardar lista actualizada.
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


    // Iniciar configuración
    if (body.trim() === '!start_config') {
        session = { mode: null }; // Inicializar sesión sin modo.
        await setSession(from, session); // Guardar sesión.
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

    // Configurar modo para agregar número de teléfono
    if (body.trim() === '!phone') {
        session.mode = 'phone'; // Establecer el modo de la sesión
        await setSession(from, session); // Guardar sesión
        await bot.sendMessage(
            from,
            "📞 *Modo agregar números activado.*\n" +
            "Escribe `!add_number <número>` para agregarlo. Ejemplo:\n" +
            "`!add_number +58412XXXXXXX` o `!add_number 0412XXXXXXX`.\n" +
            "Usa `!cancel` para salir."
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
                `📞 *Número detectado:* ${formattedNumber}\n` +
                "Confirma con `!save_list` o cancela con `!cancel`."
            );
        } else {
            await bot.sendMessage(
                from,
                "⚠️ *Número inválido.* Asegúrate de usar un formato válido, ejemplo: +58412XXXXXXX o 0412XXXXXXX."
            );
        }
        return;
    }

    // Confirmar guardar número o grupo
    if (body.trim() === '!save_list') {
    // Guardar número de teléfono
    if (session.tempRecipient) {
        const recipient = `${session.tempRecipient}@s.whatsapp.net`; // Internamente se agrega el sufijo
        const recipients = getRecipients(); // Obtener lista actual
        if (!recipients.includes(recipient)) {
            recipients.push(recipient);
            updateRecipients(recipients); // Actualizar lista global
            saveRecipients(); // Guardar lista actualizada
            session.tempRecipient = null; // Limpiar temporal
            await setSession(from, session); // Guardar sesión
            await bot.sendMessage(
                from,
                `✅ *Número guardado:* ${recipient.split('@')[0]}\n` +
                    "Usa `!show_list` para verificar."
            );
        } else {
            await bot.sendMessage(from, "ℹ️ *El número ya está en la lista de destinatarios.*");
        }
    }

    // Guardar grupo
    if (session.selectedGroups && session.selectedGroups.length > 0) {
        const recipients = getRecipients(); // Obtener lista actual
        session.selectedGroups.forEach(groupId => {
            if (!recipients.includes(groupId)) {
                recipients.push(groupId); // Agregar el grupo a la lista
            }
        });

        updateRecipients(recipients); // Actualizar lista global
        saveRecipients(); // Guardar lista actualizada
        session.selectedGroups = []; // Limpiar la lista de grupos seleccionados
        await setSession(from, session); // Guardar sesión

        await bot.sendMessage(
            from,
            "✅ *Grupos guardados como destinatarios.*\n" +
                "Usa `!show_list` para verificar."
        );
    }else {
        await bot.sendMessage(from, "⚠️ *No hay elementos pendientes por guardar.*");
    }
    return;
}

    // Mostrar lista de grupos
    if (body.trim() === '!group') {
        try {
            const allChats = await bot.store.chats.all(); // Obtener todos los chats
            const groups = allChats.filter(chat => chat.id.endsWith('@g.us')); // Filtrar solo grupos

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
                    "\n\nEscribe `!add_group <número>` para agregar un grupo a la lista de destinatarios."
                );
            } else {
                await bot.sendMessage(
                    from,
                    "ℹ️ *No se encontraron grupos disponibles.* Asegúrate de que el bot esté en algún grupo."
                );
            }
        } catch (error) {
            console.error("Error obteniendo grupos:", error);
            await bot.sendMessage(
                from,
                "⚠️ *Error al intentar obtener la lista de grupos.* Revisa los logs para más detalles."
            );
        }
        return;
    }

    // Agregar grupo a la lista
    if (body.startsWith('!add_group ')) {
        const groupIndex = parseInt(body.split(' ')[1]) - 1; // Obtener el índice del grupo

        const allChats = await bot.store.chats.all();
        const groups = allChats.filter(chat => chat.id.endsWith('@g.us'));

        if (groupIndex >= 0 && groupIndex < groups.length) {
            const groupId = groups[groupIndex].id;
            session.selectedGroups = session.selectedGroups || [];
            
            // Agregar el grupo a la lista de grupos seleccionados
            if (!session.selectedGroups.includes(groupId)) {
                session.selectedGroups.push(groupId);
                await setSession(from, session); // Guardar sesión
                await bot.sendMessage(
                    from,
                    `✅ *Grupo agregado:* ${groups[groupIndex].name} (ID: ${groupId})\n` +
                    "Escribe `!save_list` para guardar los cambios."
                );
            } else {
                await bot.sendMessage(
                    from,
                    "ℹ️ *Este grupo ya está en la lista de destinatarios.*"
                );
            }
        } else {
            await bot.sendMessage(
                from,
                "⚠️ *Índice inválido.* Asegúrate de usar un número válido del listado de grupos."
            );
        }
        return;
    }

    

    // Finalizar configuración
    if (body.trim() === '!end_config') {
        await clearSession(from); // Limpiar sesión.
        await bot.sendMessage(
            from,
            "🛠️ *Configuración finalizada.*"
        );
        return;
    }

    // Comando no reconocido
    await bot.sendMessage(from, "❓ *Comando no reconocido.*");
};

module.exports = { configRecipientsFlow };