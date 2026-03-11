const { query } = require('../config/database');

/**
 * Log an activity against any entity.
 */
async function log({ entityType, entityId, userId, action, details }) {
    try {
        const result = await query(
            `INSERT INTO activity_logs (entity_type, entity_id, user_id, action, details)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [entityType, entityId || null, userId || null, action, details || null]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Activity log error:', error.message);
        return null;
    }
}

/**
 * Get recent activity logs.
 */
async function getRecent({ entityType, entityId, limit = 20, offset = 0 } = {}) {
    let sql = `
        SELECT al.*, u.name as user_name
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
    `;
    const params = [];
    let p = 1;

    if (entityType) { sql += ` AND al.entity_type = $${p++}`; params.push(entityType); }
    if (entityId) { sql += ` AND al.entity_id = $${p++}`; params.push(entityId); }

    sql += ` ORDER BY al.created_at DESC LIMIT $${p++} OFFSET $${p}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    return result.rows;
}

module.exports = { log, getRecent };
