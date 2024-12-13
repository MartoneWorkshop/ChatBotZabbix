const fs = require('fs'); // Importar el módulo fs
const path = require('path'); // Importar el módulo path

// Ruta del archivo para almacenar los destinatarios
const RECIPIENTS_FILE = path.join(__dirname, '../data/recipients.json');
// recipients.js
let recipients = [];  // Inicializar la variable global de destinatarios

// Obtener la lista de destinatarios
// Obtener la lista de destinatarios directamente desde el archivo
const getRecipients = () => {
    try {
        if (fs.existsSync(RECIPIENTS_FILE)) {
            const data = fs.readFileSync(RECIPIENTS_FILE, 'utf-8');
            if (data.trim() === '') {
                console.warn("⚠️ El archivo de destinatarios está vacío. Lista inicializada como vacía.");
                return [];
            }
            const parsedData = JSON.parse(data);
            if (!Array.isArray(parsedData)) {
                console.warn("⚠️ El archivo de destinatarios no contiene un arreglo válido. Retornando lista vacía.");
                return [];
            }
            return parsedData;
        } else {
            console.warn("⚠️ El archivo de destinatarios no existe. Retornando lista vacía.");
            return [];
        }
    } catch (error) {
        console.error("⚠️ Error al leer el archivo de destinatarios:", error.message);
        return [];
    }
};
// Actualizar la lista de destinatarios
const updateRecipients = (newRecipients) => {
    recipients = newRecipients; // Actualizar la lista global de destinatarios
    saveRecipients(); // Guardar inmediatamente los cambios en el archivo
};

// Guardar la lista de destinatarios
const saveRecipients = () => {
    const fs = require('fs');
    const path = require('path');
    const RECIPIENTS_FILE = path.join(__dirname, '../data/recipients.json');

    try {
        fs.writeFileSync(RECIPIENTS_FILE, JSON.stringify(recipients, null, 2));
        console.log("✅ Lista de destinatarios guardada.");
    } catch (error) {
        console.error("⚠️ Error al guardar destinatarios:", error);
    }
};

// Cargar la lista de destinatarios desde el archivo al iniciar
const loadRecipients = () => {
    recipients = getRecipients(); // Leer del archivo y actualizar la lista global
    console.log("✅ Lista de destinatarios cargada al inicio:", recipients);
};

module.exports = { getRecipients, updateRecipients, saveRecipients, loadRecipients };