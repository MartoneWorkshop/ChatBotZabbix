const sessions = {}; // Objeto global para almacenar sesiones por usuario

const setSession = async (userId, sessionData) => {
    sessions[userId] = sessionData; // Guarda la sesión en el objeto
};

const getSession = async (userId) => {
    return sessions[userId] || null;
};

const clearSession = async (userId) => {
    delete sessions[userId]; // Elimina la sesión del usuario
};

module.exports = { getSession, setSession, clearSession };