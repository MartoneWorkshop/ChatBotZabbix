const express = require('express');
const { queryDB } = require('../db'); // Importa el módulo de la base de datos
const router = express.Router();

// Función para obtener nodos en respaldo
const getBackupNodes = async () => {
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
    WHERE h.host NOT LIKE '%PtP%' AND h.host NOT LIKE '%PtMP%'
),
device_unreachable_data AS (
    SELECT 
        e.clock AS event_time,
        COALESCE(resolution.clock, EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::BIGINT) AS resolution_time,
        h.host AS connected_host_name
    FROM public.events e
    LEFT JOIN public.triggers t ON e.objectid = t.triggerid
    LEFT JOIN public.functions f ON t.triggerid = f.triggerid
    LEFT JOIN public.items i ON f.itemid = i.itemid
    LEFT JOIN public.hosts h ON i.hostid = h.hostid
    LEFT JOIN public.event_recovery er ON e.eventid = er.eventid
    LEFT JOIN public.events resolution ON er.r_eventid = resolution.eventid
    WHERE 
        e.source = 0
        AND e.object = 0
        AND e.value = 1 
        AND e.name ILIKE '%Device is unreacheable%'
),
problems AS (
    SELECT h.host, p.clock,p.name AS problem_name,t.triggerid,
        h.hostid, p.eventid, p.r_eventid 
    FROM public.problem p
    JOIN public.triggers t ON p.objectid = t.triggerid
    JOIN public.functions f ON t.triggerid = f.triggerid
    JOIN public.items i ON f.itemid = i.itemid
    JOIN public.hosts h ON i.hostid = h.hostid
    WHERE 
        p.source = 0 AND p.object = 0 AND p.severity = 5 AND h.status = 0
        AND NOT EXISTS (SELECT NULL FROM public.event_suppress es WHERE es.eventid = p.eventid) 
        AND p.r_eventid IS NULL AND p.name LIKE 'Monitor%' 
    UNION ALL
    SELECT h.host, p.clock, p.name AS problem_name, 
        t.triggerid, h.hostid, p.eventid, p.r_eventid
    FROM public.problem p 
    LEFT JOIN public.triggers t ON p.objectid = t.triggerid
    LEFT JOIN public.functions f ON t.triggerid = f.triggerid
    LEFT JOIN public.items i ON f.itemid = i.itemid
    LEFT JOIN public.hosts h ON i.hostid = h.hostid
    LEFT JOIN public.events e ON e.objectid = t.triggerid
    WHERE 
        p.source = 0 AND p.object = 0 AND p.severity = 4 
        AND h.status = 0 AND NOT EXISTS (
            SELECT 1 
            FROM public.event_suppress es 
            WHERE es.eventid = p.eventid
        ) 
        AND p.r_eventid IS NULL AND p.name ILIKE '%unreacheable%'
        AND t.description ILIKE '%unreacheable%' AND e.value = 1  
),
problem_durations AS (
    SELECT
        COALESCE(p.clock, p2.clock) AS problem_start_time,
        CASE
            WHEN p.problem_name = 'Monitor Offline' AND p.r_eventid IS NULL 
            THEN EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) - p.clock
            WHEN p2.problem_name = 'Monitor Offline' AND p2.r_eventid IS NULL 
            THEN EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) - p2.clock
            ELSE NULL
        END AS element_problem_duration_seconds,
        CASE
            WHEN hd2.host_name LIKE 'MON-%' 
            THEN (SELECT 
                EXTRACT(EPOCH FROM AGE(TO_TIMESTAMP(du.resolution_time), TO_TIMESTAMP(du.event_time)))
                FROM device_unreachable_data du
                WHERE du.connected_host_name = hd.host_name
                LIMIT 1)
            ELSE
                (SELECT 
                    EXTRACT(EPOCH FROM AGE(TO_TIMESTAMP(du.resolution_time), TO_TIMESTAMP(du.event_time)))
                FROM device_unreachable_data du
                WHERE du.connected_host_name = hd2.host_name
                LIMIT 1)
        END AS connected_element_problem_duration_seconds,
        hd.host_name AS element_host_name,
        hd2.host_name AS connected_host_name,
        p.problem_name AS element_problem_name,
        p2.problem_name AS connected_problem_name
    FROM extracted_elements ee
    LEFT JOIN element_connections ec ON ee.element_id = ec.element_id
    LEFT JOIN public.sysmaps_elements e2 ON ec.connected_element_id = e2.selementid
    LEFT JOIN host_details hd ON ee.related_hostid = hd.hostid
    LEFT JOIN host_details hd2 ON e2.elementid = hd2.hostid
    LEFT JOIN problems p ON hd.hostid = p.hostid
    LEFT JOIN problems p2 ON hd2.hostid = p2.hostid
    WHERE 
        (hd.hostid IS NOT NULL OR hd2.hostid IS NOT NULL)
        AND hd.host_name IS NOT NULL
        AND (hd2.host_name IS NOT NULL AND hd2.host_name <> '')
        AND (p.r_eventid IS NULL OR p2.r_eventid IS NULL)
)
SELECT 
    REPLACE(CASE
        WHEN element_host_name LIKE 'MON-%' THEN element_host_name
        WHEN connected_host_name LIKE 'MON-%' THEN connected_host_name
        ELSE NULL
    END, 'MON-', '') AS monitored_host_name,
    TO_CHAR(TO_TIMESTAMP(problem_start_time), 'FMHH12:MI:SS AM') AS problem_start_time,  -- Formato 12h AM/PM
    TO_CHAR(TO_TIMESTAMP(problem_start_time), 'DD/MM/YY') AS problem_start_date,
    CASE
        WHEN element_problem_duration_seconds IS NOT NULL AND connected_element_problem_duration_seconds IS NOT NULL THEN
            CASE 
                WHEN element_problem_duration_seconds >= connected_element_problem_duration_seconds THEN
                    FLOOR((element_problem_duration_seconds - connected_element_problem_duration_seconds) / 86400) || 'd ' || 
                    LPAD(FLOOR(((element_problem_duration_seconds - connected_element_problem_duration_seconds) % 86400) / 3600)::TEXT, 2, '0') || 'h ' ||
                    LPAD(FLOOR(((element_problem_duration_seconds - connected_element_problem_duration_seconds) % 3600) / 60)::TEXT, 2, '0') || 'm ' ||
                    LPAD(FLOOR((element_problem_duration_seconds - connected_element_problem_duration_seconds) % 60)::TEXT, 2, '0') || 's'
                ELSE
                    FLOOR((connected_element_problem_duration_seconds - element_problem_duration_seconds) / 86400) || 'd ' || 
                    LPAD(FLOOR(((connected_element_problem_duration_seconds - element_problem_duration_seconds) % 86400) / 3600)::TEXT, 2, '0') || 'h ' ||
                    LPAD(FLOOR(((connected_element_problem_duration_seconds - element_problem_duration_seconds) % 3600) / 60)::TEXT, 2, '0') || 'm ' ||
                    LPAD(FLOOR((connected_element_problem_duration_seconds - element_problem_duration_seconds) % 60)::TEXT, 2, '0') || 's'
            END
        WHEN element_problem_duration_seconds IS NOT NULL THEN
            FLOOR(element_problem_duration_seconds / 86400) || 'd ' || 
            LPAD(FLOOR((element_problem_duration_seconds % 86400) / 3600)::TEXT, 2, '0') || 'h ' ||
            LPAD(FLOOR((element_problem_duration_seconds % 3600) / 60)::TEXT, 2, '0') || 'm ' ||
            LPAD(FLOOR(element_problem_duration_seconds % 60)::TEXT, 2, '0') || 's'
        WHEN connected_element_problem_duration_seconds IS NOT NULL THEN
            FLOOR(connected_element_problem_duration_seconds / 86400) || 'd ' || 
            LPAD(FLOOR((connected_element_problem_duration_seconds % 86400) / 3600)::TEXT, 2, '0') || 'h ' ||
            LPAD(FLOOR((connected_element_problem_duration_seconds % 3600) / 60)::TEXT, 2, '0') || 'm ' ||
            LPAD(FLOOR(connected_element_problem_duration_seconds % 60)::TEXT, 2, '0') || 's'
        ELSE NULL
    END AS problem_duration
FROM problem_durations
WHERE (element_host_name ILIKE 'MON-%' OR connected_host_name LIKE 'MON-%')
  AND ((element_problem_name ILIKE '%Monitor Offline%' AND connected_problem_name IS NULL)
    OR (connected_problem_name ILIKE '%Monitor Offline%' AND element_problem_name IS NULL))
ORDER BY monitored_host_name;
    `;
    try {
        const result = await queryDB(query);
        return result;
    } catch (error) {
        console.error('Error al obtener nodos en respaldo:', error);
        throw error;
    }
};

// Ruta para manejar solicitudes POST
router.post('/', async (req, res) => {
    try {
        const result = await getBackupNodes();
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Exporta el router y la función
module.exports = {getBackupNodes};