const express = require('express');
const { queryDB } = require('../db'); // Importa el módulo de la base de datos
const router = express.Router();

// Función para obtener nodos en respaldo
const getFallenNodes = async () => {
    const query = `
    WITH element_connections AS (
    SELECT 
        l.sysmapid,
        l.selementid1 AS element_id,
        l.selementid2 AS connected_element_id
    FROM public.sysmaps_links l
),
extracted_elements AS (
    SELECT 
        e.sysmapid,
        e.selementid AS element_id,
        e.elementid AS related_hostid  
    FROM public.sysmaps_elements e
),
host_details AS (
    SELECT h.hostid, h.host AS host_name
    FROM public.hosts h
    WHERE 
        h.host NOT LIKE '%PtP%' 
        AND h.host NOT LIKE '%PtMP%'
        AND h.host NOT LIKE '%CLIENTE%' 
),
problems AS (
    SELECT 
        p.clock,
        p.name AS problem_name,
        t.triggerid,
        h.hostid
    FROM public.problem p
    JOIN public.triggers t ON p.objectid = t.triggerid
    JOIN public.functions f ON t.triggerid = f.triggerid
    JOIN public.items i ON f.itemid = i.itemid
    JOIN public.hosts h ON i.hostid = h.hostid
    WHERE 
        p.source = 0 
        AND p.object = 0 
        AND p.severity = 4
        AND h.status = 0
        AND NOT EXISTS (SELECT NULL FROM public.event_suppress es WHERE es.eventid = p.eventid) 
        AND p.r_eventid IS NULL
        AND p.name ILIKE '%unreacheable%'
        AND t.description ILIKE '%unreacheable%' 
        AND p.clock IS NOT NULL 
),
map_details AS (
    SELECT  s.sysmapid, s.name AS map_name
    FROM public.sysmaps s
)
SELECT md.map_name AS mapa_nombre,
    TO_CHAR(MIN(TO_TIMESTAMP(p.clock) AT TIME ZONE 'GMT 04:00'), 'FMHH12:MI:SS AM') AS momento_caida,
    CONCAT(
        FLOOR(EXTRACT(EPOCH FROM MAX(NOW() - TO_TIMESTAMP(p.clock))) / 86400), 'd ',
        LPAD(FLOOR(MOD(EXTRACT(EPOCH FROM MAX(NOW() - TO_TIMESTAMP(p.clock))), 86400) / 3600)::TEXT, 2, '0'), 'h ',
        LPAD(FLOOR(MOD(EXTRACT(EPOCH FROM MAX(NOW() - TO_TIMESTAMP(p.clock))), 3600) / 60)::TEXT, 2, '0'), 'm ',
        LPAD(FLOOR(MOD(EXTRACT(EPOCH FROM MAX(NOW() - TO_TIMESTAMP(p.clock))), 60))::TEXT, 2, '0'), 's'
    ) AS duracion_caida
FROM extracted_elements ee
LEFT JOIN element_connections ec ON ee.element_id = ec.element_id
LEFT JOIN public.sysmaps_elements e2 ON ec.connected_element_id = e2.selementid
LEFT JOIN host_details hd ON ee.related_hostid = hd.hostid 
LEFT JOIN host_details hd2 ON e2.elementid = hd2.hostid
LEFT JOIN problems p ON hd.hostid = p.hostid   
LEFT JOIN problems p2 ON hd2.hostid = p2.hostid   
LEFT JOIN map_details md ON ee.sysmapid = md.sysmapid 
WHERE (hd.hostid IS NOT NULL OR hd2.hostid IS NOT NULL)
    AND (p.problem_name ILIKE '%unreacheable%' OR p2.problem_name ILIKE '%unreacheable%') 
    AND md.map_name NOT LIKE 'RED%'
GROUP BY md.map_name 
ORDER BY md.map_name;
    `;
    try {
        const result = await queryDB(query);
        return result;
    } catch (error) {
        console.error('Error al obtener nodos caidos:', error);
        throw error;
    }
};

// Ruta para manejar solicitudes POST
router.post('/', async (req, res) => {
    try {
        const result = await getFallenNodes();
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Exporta el router y la función
module.exports = {getFallenNodes};