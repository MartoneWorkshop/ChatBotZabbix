const BACKUP_CHECK_INTERVAL = 30000; // 30s Intervalo de verificacion para nodos en respaldo
const FALLEN_NODES_CHECK_INTERVAL = 25000; // 25s Intervalo de verificacion para nodos caidos
const SEND_MESSAGE_INTERVAL = 15000; /// Intervalo entre mensajes
const SEND_UPDATE_INTERVAL = 1000000000; // 2m Intervalo de actualizaciones de estado

module.exports = { BACKUP_CHECK_INTERVAL, FALLEN_NODES_CHECK_INTERVAL, SEND_UPDATE_INTERVAL, SEND_MESSAGE_INTERVAL};