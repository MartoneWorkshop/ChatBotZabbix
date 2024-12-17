const sessions = {}; // Objeto global para almacenar sesiones por usuario

const setSession = async (userId, sessionData) => {
    console.log(`Setting session for ${userId}:`, sessionData);
    sessions[userId] = sessionData; // Guarda la sesión en el objeto
};

const getSession = async (userId) => {
    console.log(`Getting session for ${userId}:`, sessions[userId]);
    return sessions[userId] || null;
};

const clearSession = async (userId) => {
    delete sessions[userId]; // Elimina la sesión del usuario
};

module.exports = { getSession, setSession, clearSession };