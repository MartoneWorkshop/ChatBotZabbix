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
    const { body, from, participant } = message;
    const userId = participant || from; 

    // Verificar si ya hay una sesión activa global
    const activeSession = await getSession('global'); // Obtener sesión global
    // Ignorar mensajes que no sean el comando !start_config
    if (message.body !== '!start_config') {
        return;
    }
    // Si hay una sesión activa y el usuario no es el iniciador, mostrar advertencia
    if (activeSession && activeSession.isActive) {
        // Extraer el número de teléfono del initiator quitando @s.whatsapp.net
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
        // Si ya existe una sesión activa, notificar al usuario
        if (activeSession && activeSession.isActive) {
            await bot.sendMessage(from, "⚠️ *Ya hay una sesión activa.*");
            return;
        }

        // Crear una nueva sesión para el usuario
        const newSession = {
            isActive: true,
            initiator: userId,
            tempRecipient: null,
            selectedGroups: []
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
    /// Eliminar destinatarios o grupos
    if (body.startsWith('!remove ')) {
        const recipients = getRecipients(); // Obtener lista actual.

        // Verificar si el comando !remove es válido
        if (!body.includes('!show_list')) {
            await bot.sendMessage(from, "⚠️ *Para eliminar destinatarios, primero usa `!show_list`.*");
            return;
        }

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
    // Configurar modo para agregar número de teléfono
    if (body.trim() === '!phone') {
        session.mode = 'phone'; // Establecer el modo de la sesión
        await setSession(userId, session); // Guardar sesión
        await bot.sendMessage(
            from,
            "📞 *Modo agregar números activado.*\n" +
            "Escribe `!add_number <número>` para agregarlo.\nEjemplo:\n" +
            "`!add_number +58412XXXXXXX` o `!add_number 0412XXXXXXX`.\n" +
            "Usa `!cancel` para salir."
        );
        return;
    }
    // Modo de agregar un teléfono
    if (session.mode === 'phone') {
        if (body.trim() === '!cancel') {
            session.tempRecipient = null; // Limpiar el número temporal
            await setSession(userId, session); // Guardar la sesión actualizada
            await bot.sendMessage(from, "❌ *Operación cancelada.*\nLa operación de agregar teléfono ha sido cancelada.");
            return;
        }

        // Aquí el usuario debe enviar el número para agregar
        if (body.trim().startsWith('!add_number')) {
            const phoneNumber = body.trim().split(' ')[1]; // Obtener el número
            if (phoneNumber) {
                session.tempRecipient = phoneNumber; // Guardar el número temporal
                await setSession(userId, session); // Guardar la sesión con el número
                await bot.sendMessage(from, `✅ *Número ${phoneNumber} agregado temporalmente.*\nEscribe !save_list para guardar la lista o !cancel para cancelar.`);
            } else {
                await bot.sendMessage(from, "⚠️ *Por favor, proporciona un número válido con el formato adecuado.*");
            }
            return;
        }

        // Comando para guardar la lista de números
        if (body.trim() === '!save_list') {
            if (session.tempRecipient) {
                // Guardar el número en la lista final
                session.selectedRecipients = session.selectedRecipients || [];
                session.selectedRecipients.push(session.tempRecipient);
                session.tempRecipient = null; // Limpiar el número temporal
                await setSession(userId, session); // Guardar la sesión con la lista actualizada
                await bot.sendMessage(from, "✅ *Número guardado en la lista.*");
            } else {
                await bot.sendMessage(from, "⚠️ *No hay un número para guardar. Usa `!add_number` para agregar un número.*");
            }
            return;
        }
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
                await setSession(userId, session); // Guardar sesión
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
        // Verificar si hay una sesión activa
        if (!session.isActive) {
            await bot.sendMessage(
                from,
                "⚠️ *No hay una sesión activa para finalizar.* Usa `!start_config` para iniciar una configuración."
            );
            return;
        }
    
        // Verificar si el usuario que intenta finalizar la sesión es el iniciador
        if (session.initiator !== userId) {
            await bot.sendMessage(
                from,
                "⚠️ *Solo la persona que inició la sesión puede finalizarla.*"
            );
            return;
        }
    
        // Limpiar la sesión y actualizar la base de datos o almacenamiento
        session.isActive = false;  // Desactivar sesión
        session.initiator = null;  // Limpiar el iniciador
        session.tempRecipient = null;  // Limpiar el destinatario temporal
        session.selectedGroups = [];  // Limpiar los grupos seleccionados
        await setSession(userId, session); // Guardar sesión actualizada
    
        // Confirmar que la configuración se ha finalizado
        await bot.sendMessage(
            from,
            "🛠️ *Configuración finalizada.* La sesión ha sido cerrada."
        );
    
        return;
    }
    // Comando no reconocido
    await bot.sendMessage(from, "❓ *Comando no reconocido.*");
};

module.exports = { configRecipientsFlow };