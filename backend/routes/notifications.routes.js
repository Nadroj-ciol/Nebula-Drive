// routes/notifications.routes.js – Routes des notifications

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../config/db');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// GET /api/notifications – Liste des notifications
router.get('/', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const unreadOnly = req.query.unread === 'true';

        let query = `
            SELECT * FROM notifications 
            WHERE user_id = ?
        `;
        
        if (unreadOnly) {
            query += ` AND is_read = 0`;
        }
        
        query += ` ORDER BY created_at DESC LIMIT ?`;

        const getNotifications = db.prepare(query);
        const notifications = getNotifications.all(req.user.id, limit);

        // Compter les non lues
        const countUnread = db.prepare(`
            SELECT COUNT(*) as count FROM notifications 
            WHERE user_id = ? AND is_read = 0
        `);
        const unreadCount = countUnread.get(req.user.id).count;

        res.json({ 
            notifications, 
            unreadCount 
        });
        
    } catch (err) {
        console.error('❌ Erreur chargement notifications:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/notifications/count – Nombre de notifications non lues
router.get('/count', (req, res) => {
    try {
        const countUnread = db.prepare(`
            SELECT COUNT(*) as count FROM notifications 
            WHERE user_id = ? AND is_read = 0
        `);
        
        const count = countUnread.get(req.user.id).count;

        res.json({ unreadCount: count });
        
    } catch (err) {
        console.error('❌ Erreur comptage notifications:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/notifications/:id/read – Marquer une notification comme lue
router.put('/:id/read', (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);

        // Vérifier que la notification appartient à l'utilisateur
        const checkNotif = db.prepare(`
            SELECT id FROM notifications 
            WHERE id = ? AND user_id = ?
        `);
        
        const notif = checkNotif.get(notificationId, req.user.id);
        
        if (!notif) {
            return res.status(404).json({ error: 'Notification non trouvée' });
        }

        // Marquer comme lue
        const markRead = db.prepare(`
            UPDATE notifications 
            SET is_read = 1 
            WHERE id = ?
        `);
        
        markRead.run(notificationId);

        res.json({ 
            success: true, 
            message: 'Notification marquée comme lue' 
        });
        
    } catch (err) {
        console.error('❌ Erreur marquage notification:', err);
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/notifications/read-all – Marquer toutes les notifications comme lues
router.put('/read-all', (req, res) => {
    try {
        const markAllRead = db.prepare(`
            UPDATE notifications 
            SET is_read = 1 
            WHERE user_id = ? AND is_read = 0
        `);
        
        const result = markAllRead.run(req.user.id);

        res.json({ 
            success: true, 
            message: 'Toutes les notifications marquées comme lues',
            count: result.changes 
        });
        
    } catch (err) {
        console.error('❌ Erreur marquage toutes notifications:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/notifications/:id – Supprimer une notification
router.delete('/:id', (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);

        // Vérifier que la notification appartient à l'utilisateur
        const checkNotif = db.prepare(`
            SELECT id FROM notifications 
            WHERE id = ? AND user_id = ?
        `);
        
        const notif = checkNotif.get(notificationId, req.user.id);
        
        if (!notif) {
            return res.status(404).json({ error: 'Notification non trouvée' });
        }

        // Supprimer
        const deleteNotif = db.prepare(`
            DELETE FROM notifications WHERE id = ?
        `);
        
        deleteNotif.run(notificationId);

        res.json({ 
            success: true, 
            message: 'Notification supprimée' 
        });
        
    } catch (err) {
        console.error('❌ Erreur suppression notification:', err);
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;