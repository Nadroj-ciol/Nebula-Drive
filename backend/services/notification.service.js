// services/notification.service.js — Logique métier pour les notifications

const db = require('../config/db');

class NotificationService {
    // Créer une notification
    create(userId, type, title, message, metadata = null) {
        const result = db.prepare(`
            INSERT INTO notifications (user_id, type, title, message, metadata)
            VALUES (?, ?, ?, ?, ?)
        `).run(userId, type, title, message, metadata);

        return result.lastInsertRowid;
    }

    // Lister les notifications d'un utilisateur
    getUserNotifications(userId, limit = 50, unreadOnly = false) {
        const query = unreadOnly
            ? 'SELECT * FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC LIMIT ?'
            : 'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?';
        
        return db.prepare(query).all(userId, limit);
    }

    // Compter les notifications non lues
    countUnread(userId) {
        const result = db.prepare(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0'
        ).get(userId);
        return result.count;
    }

    // Marquer une notification comme lue
    markAsRead(notificationId, userId) {
        const result = db.prepare(`
            UPDATE notifications 
            SET is_read = 1 
            WHERE id = ? AND user_id = ?
        `).run(notificationId, userId);

        if (result.changes === 0) {
            throw new Error('Notification non trouvée');
        }

        return { message: 'Notification marquée comme lue' };
    }

    // Marquer toutes les notifications comme lues
    markAllAsRead(userId) {
        db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
        return { message: 'Toutes les notifications marquées comme lues' };
    }

    // Supprimer une notification
    delete(notificationId, userId) {
        const result = db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(notificationId, userId);
        
        if (result.changes === 0) {
            throw new Error('Notification non trouvée');
        }

        return { message: 'Notification supprimée' };
    }

    // Supprimer les anciennes notifications (nettoyage)
    deleteOld(daysOld = 30) {
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
        const result = db.prepare('DELETE FROM notifications WHERE created_at < ?').run(cutoffDate);
        return { deletedCount: result.changes };
    }

    // Types de notifications prédéfinis
    static TYPES = {
        UPLOAD_COMPLETE: 'upload_complete',
        FILE_SHARED: 'file_shared',
        PERMISSION_CHANGED: 'permission_changed',
        SHARE_REVOKED: 'share_revoked',
        QUOTA_WARNING: 'quota_warning',
        SYSTEM: 'system'
    };
}

module.exports = new NotificationService();