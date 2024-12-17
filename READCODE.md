**LINEA 477 HASTA LAS 515 '/node_modules/@bot-whatsapp/provider/lib/baileys/index.cjs'**
**Este fragmento de codigo permite la escucha de los mensajes grupales**
`
if (!baileyIsValidNumber(payload.from)) {
    const isFromGroup = payload.key?.remoteJid?.endsWith("@g.us");
    if (isFromGroup) {
        payload.from = payload.key.remoteJid;
        payload.participant = payload.key.participant || "N/A";
        } else {
            payload.from = baileyCleanNumber(payload.key.remoteJid);
            payload.participant = null;
        }
        payload.from = baileyCleanNumber(payload.from, true);
    }
                
// Respuestas con botones
const btnCtx = payload?.message?.buttonsResponseMessage?.selectedDisplayText;
if (btnCtx) {
    payload.body = btnCtx;
}

// Respuestas con listas
const listRowId = payload?.message?.listResponseMessage?.title;
if (listRowId) {
    payload.body = listRowId;
}

// Validar que payload.body sea una cadena
if (typeof payload.body !== 'string') {
    console.warn('El campo payload.body no es una cadena:', payload.body);
    payload.body = JSON.stringify(payload.body) || 'Mensaje no procesable'; // Convertir a texto si es un objeto
}

// Emitir el evento de mensaje con el cuerpo procesado
this.emit('message', {
    from: payload.from,
    participant: payload.participant,
    body: payload.body,
    messageTimestamp: payload.messageTimestamp,
    pushName: payload.pushName,
});
`

**LINEA 737 HASTA LAS 764 '/node_modules/@bot-whatsapp/provider/lib/baileys/index.cjs'**
**Este fragmento de codigo permite el envio a mensajes grupales**                
` 
sendMessage = async (numberIn, message, options = {}) => {
        try {
            // Determinar si es grupo o usuario y mantener el número según corresponda
            const isGroup = numberIn.endsWith('@g.us');
            const number = isGroup ? numberIn : baileyCleanNumber(numberIn);
    
            // Verificar si el número está correctamente definido antes de enviar
            if (!number) {
                throw new Error("Número inválido o no definido.");
            }
    
            // Verificar si se envían botones
            if (options?.buttons?.length) {
                return this.sendButtons(number, message, options.buttons);
            }
    
            // Verificar si se envían medios
            if (options?.media) {
                return this.sendMedia(number, options.media, message);
            }
    
            // Enviar mensaje de texto plano
            return this.sendText(number, message);
        } catch (error) {
            console.error("Error in sendMessage:", error.message);
            throw error; // Propagar el error para manejo superior
        }
    };
`