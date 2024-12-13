const sessions = new Map();

const getSession = async (key) => sessions.get(key);
const setSession = async (key, session) => sessions.set(key, session);
const clearSession = async (key) => sessions.delete(key);

module.exports = { getSession, setSession, clearSession };
