// services/activity.service.js – Service de journalisation des activités (CORRIGÉ)

const db = require('../config/db');

class ActivityService {
    /**
     * Enregistrer une activité
     * @param {number} userId - ID de l'utilisateur (null pour système)
     * @param {string} action - Type d'action (ex: 'user_login', 'file_upload')
     * @param {string} details - Détails de l'action
     * @param {string} ipAddress - Adresse IP de l'utilisateur
     */
    log(userId, action, details = null, ipAddress = null) {
        try {
            // ✅ CORRECTION : Utiliser un timestamp ISO 8601 standard
            const now = new Date().toISOString();
            
            const insertLog = db.prepare(`
                INSERT INTO activity_log (user_id, action, details, ip_address, created_at)
                VALUES (?, ?, ?, ?, ?)
            `);
            
            insertLog.run(userId || null, action, details, ipAddress, now);
            
            console.log(`📝 Activité enregistrée: ${action} par user ${userId || 'système'}`);
            
        } catch (error) {
            console.error('❌ Erreur log activité:', error);
        }
    }

    /**
     * Récupérer les activités avec filtre
     */
    getActivities(filter = 'all', limit = 50) {
        try {
            let query = `
                SELECT a.*, u.username 
                FROM activity_log a
                LEFT JOIN users u ON a.user_id = u.id
            `;
            
            const params = [];

            // Filtres
            if (filter !== 'all') {
                if (filter === 'auth') {
                    query += ` WHERE a.action LIKE 'user_%'`;
                } else if (filter === 'file') {
                    query += ` WHERE a.action LIKE 'file_%'`;
                } else if (filter === 'share') {
                    query += ` WHERE a.action LIKE 'share_%'`;
                } else if (filter === 'admin') {
                    query += ` WHERE a.action LIKE 'admin_%'`;
                }
            }

            query += ` ORDER BY a.created_at DESC LIMIT ?`;
            params.push(limit);

            const getActivities = db.prepare(query);
            return getActivities.all(...params);
            
        } catch (error) {
            console.error('❌ Erreur récupération activités:', error);
            return [];
        }
    }
    
    /**
     * Nettoyer les anciennes activités (+ de X jours)
     */
    cleanup(daysOld = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            const cutoffISO = cutoffDate.toISOString();
            
            const result = db.prepare(`
                DELETE FROM activity_log 
                WHERE created_at < ?
            `).run(cutoffISO);
            
            console.log(`🗑️ ${result.changes} anciennes activités supprimées`);
            return result.changes;
        } catch (error) {
            console.error('❌ Erreur nettoyage activités:', error);
            return 0;
        }
    }
}

module.exports = new ActivityService();