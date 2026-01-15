// server.js – Point d'entrée principal du serveur Express

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import de la config DB (crée les tables au démarrage)
require('./config/db');
const db = require('./config/db'); 

// ✅ Import du service d'activité
const activityService = require('./services/activity.service');

// Import des routes
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const filesRoutes = require('./routes/files.routes');
const shareRoutes = require('./routes/share.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const jwt = require('jsonwebtoken'); 

const app = express();
const PORT = process.env.PORT || 3000;

// Créer le dossier storage s'il n'existe pas
const storagePath = path.join(__dirname, 'storage');
if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
}

// ========================================
// MIDDLEWARES D'AUTHENTIFICATION
// ========================================

// 1. Middleware authentification JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Accès refusé - Token manquant' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nebula_drive_secret_2026');
        
        const user = db.prepare(`
            SELECT id, username, email, role, subscription, storage_quota, storage_used
            FROM users WHERE id = ?
        `).get(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'Utilisateur non trouvé' });
        }
        
        req.user = user;
        next();
        
    } catch (err) {
        console.error('❌ Erreur authentification:', err);
        
        if (err.name === 'JsonWebTokenError') {
            return res.status(403).json({ error: 'Token invalide' });
        }
        if (err.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Token expiré' });
        }
        
        return res.status(403).json({ error: 'Token invalide' });
    }
}

// 2. Middleware admin uniquement
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès admin requis' });
    }
    next();
}

// ========================================
// MIDDLEWARES GLOBAUX
// ========================================

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques du dossier client
app.use(express.static(path.join(__dirname, '..', 'client')));

// ========================================
// ROUTES API PRINCIPALES
// ========================================

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/notifications', notificationsRoutes);

// Route de test / santé
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Nebula-Drive API fonctionne!',
        timestamp: new Date().toISOString()
    });
});


// route pour le partage en masse :

app.post('/api/shares/bulk', authenticateToken, async (req, res) => {
    try {
        const { fileIds, usernames, permission } = req.body;

        // Validation
        if (!Array.isArray(fileIds) || fileIds.length === 0) {
            return res.status(400).json({ error: 'fileIds requis (tableau)' });
        }

        if (!Array.isArray(usernames) || usernames.length === 0) {
            return res.status(400).json({ error: 'usernames requis (tableau)' });
        }

        if (!['read', 'write'].includes(permission)) {
            return res.status(400).json({ error: 'Permission invalide' });
        }

        const results = {
            success: [],
            failed: [],
            totalShares: 0
        };

        // Pour chaque fichier
        for (const fileId of fileIds) {
            // Vérifier que le fichier appartient à l'utilisateur
            const file = db.prepare('SELECT * FROM files WHERE id = ? AND owner_id = ?')
                .get(fileId, req.user.id);

            if (!file) {
                results.failed.push({ fileId, error: 'Fichier non trouvé ou non autorisé' });
                continue;
            }

            // Pour chaque utilisateur
            for (const username of usernames) {
                // Trouver l'utilisateur
                const targetUser = db.prepare('SELECT id, username FROM users WHERE username = ?')
                    .get(username);

                if (!targetUser) {
                    results.failed.push({ fileId, username, error: 'Utilisateur non trouvé' });
                    continue;
                }

                if (targetUser.id === req.user.id) {
                    results.failed.push({ fileId, username, error: 'Impossible de partager avec soi-même' });
                    continue;
                }

                try {
                    // Vérifier si le partage existe déjà
                    const existingShare = db.prepare(
                        'SELECT id FROM shares WHERE file_id = ? AND shared_with_id = ?'
                    ).get(fileId, targetUser.id);

                    if (existingShare) {
                        // Mettre à jour la permission
                        db.prepare('UPDATE shares SET permission = ? WHERE id = ?')
                            .run(permission, existingShare.id);
                    } else {
                        // Créer le partage
                        db.prepare(`
                            INSERT INTO shares (file_id, owner_id, shared_with_id, permission)
                            VALUES (?, ?, ?, ?)
                        `).run(fileId, req.user.id, targetUser.id, permission);
                    }

                    // Notification
                    db.prepare(`
                        INSERT INTO notifications (user_id, type, title, message, is_read)
                        VALUES (?, ?, ?, ?, 0)
                    `).run(
                        targetUser.id,
                        'file_shared',
                        'Nouveau fichier partagé',
                        `${req.user.username} a partagé "${file.original_name}" avec vous (${permission === 'write' ? 'lecture/écriture' : 'lecture seule'}).`
                    );

                    results.success.push({ fileId, username, fileName: file.original_name });
                    results.totalShares++;

                } catch (error) {
                    results.failed.push({ fileId, username, error: error.message });
                }
            }
        }

        // Logger l'activité
        activityService.log(
            req.user.id,
            'share_bulk',
            `Partage en masse : ${results.totalShares} partage(s) créé(s) pour ${fileIds.length} fichier(s)`,
            req.ip
        );

        res.json({
            success: true,
            message: `${results.totalShares} partage(s) créé(s)`,
            results
        });

    } catch (error) {
        console.error('❌ Erreur partage en masse:', error);
        res.status(500).json({ error: error.message });
    }
});
// ========================================
// ROUTES ADMIN - ANNONCES
// ========================================

app.post('/api/admin/announcements', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, message, type, targetUsers = 'all' } = req.body;
  
        // Validation des champs obligatoires
        if (!title || !message || !type) {
            return res.status(400).json({ 
                error: 'Les champs title, message et type sont requis' 
            });
        }

        const validTypes = ['info', 'warning', 'success', 'maintenance'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ 
                error: 'Type d\'annonce invalide. Types valides: ' + validTypes.join(', ')
            });
        }

         console.log('📢 Envoi annonce:', { title, type, targetUsers }); // Debug

        // 1. Créer l'annonce dans la base de données
        const insertAnnouncement = db.prepare(`
            INSERT INTO announcements (admin_id, title, message, type)
            VALUES (?, ?, ?, ?)
        `);
        
        const result = insertAnnouncement.run(req.user.id, title, message, type);
        const announcementId = result.lastInsertRowid;

            //déterminer les utilisateurs cibles
         let targetedUsers = [];
        
        if (!targetUsers || targetUsers === 'all') {
            // cas1 : Tous les utilisateurs sauf l'admin qui envoie
            console.log('👥 Envoi à tous les utilisateurs');

            const getUsers = db.prepare(`
                SELECT id FROM users WHERE id != ?
            `);
            targetedUsers = getUsers.all(req.user.id);

        } else if (Array.isArray(targetUsers) && targetUsers.length > 0) {
            // cas 2 : Utilisateurs spécifiques
     console.log('🎯 Envoi à des utilisateurs spécifiques:', targetUsers);
            
            // Convertir les IDs en entiers et valider
            targetedUsers = targetUsers
                .map(id => {
                    const userId = parseInt(id);
                    if (isNaN(userId)) {
                        console.warn('⚠️ ID utilisateur invalide ignoré:', id);
                        return null;
                    }
                    return { id: userId };
                })
                .filter(Boolean); // Retirer les nulls
                
        } else {
            // ✅ Cas 3 : Format invalide
            console.error('❌ Format targetUsers invalide:', targetUsers);
            return res.status(400).json({ 
                error: 'Format de targetUsers invalide. Attendu: "all" ou [1, 2, 3]' 
            });
        }

        console.log('📨 Nombre d\'utilisateurs ciblés:', targetedUsers.length);

        // 3. Créer une notification pour chaque utilisateur ciblé
        let notificationCount = 0;
        
        if (targetedUsers.length > 0) {
            const insertNotif = db.prepare(`
                INSERT INTO notifications (user_id, type, title, message, is_read)
                VALUES (?, ?, ?, ?, 0)
            `);

            for (const user of targetedUsers) {
                try {
                    insertNotif.run(user.id, 'announcement', title, message);
                    notificationCount++;
                } catch (notifError) {
                    console.warn(`⚠️ Échec notification pour user ${user.id}:`, notifError.message);
                }
            }
        }

        console.log('✅ Notifications créées:', notificationCount);

        // 4. Mettre à jour le compteur dans l'annonce
        const updateCount = db.prepare(`
            UPDATE announcements 
            SET notification_count = ? 
            WHERE id = ?
        `);
        
        updateCount.run(notificationCount, announcementId);

        // ✅ Logger l'activité
        try {
            activityService.log(
                req.user.id, 
                'admin_announcement', 
                `Annonce "${title}" envoyée à ${notificationCount} utilisateur(s)`,
                req.ip
            );
        } catch (logError) {
            console.warn('⚠️ Échec du logging:', logError.message);
        }

        // 6. Réponse de succès
        res.json({
            success: true,
            message: 'Annonce envoyée avec succès',
            notificationCount: notificationCount,
            announcement: {
                id: announcementId,
                title,
                message,
                type,
                targetUsers: targetUsers === 'all' ? 'Tous les utilisateurs' : `${targetedUsers.length} utilisateur(s)`,
                created_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Erreur envoi annonce:', error);
        console.error('Stack trace:', error.stack);
        
        res.status(500).json({ 
            error: 'Erreur lors de l\'envoi de l\'annonce',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Erreur serveur'
        });
    }
});

app.get('/api/admin/announcements', authenticateToken, requireAdmin, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const getAnnouncements = db.prepare(`
            SELECT * FROM announcements 
            ORDER BY created_at DESC 
            LIMIT ?
        `);
        
        const announcements = getAnnouncements.all(limit);

        res.json({ announcements });

    } catch (error) {
        console.error('❌ Erreur récupération annonces:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des annonces',
            details: error.message 
        });
    }
});

app.delete('/api/admin/announcements/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const announcementId = parseInt(req.params.id);

        const deleteAnnouncement = db.prepare(`
            DELETE FROM announcements WHERE id = ?
        `);
        
        const result = deleteAnnouncement.run(announcementId);

        if (result.changes === 0) {
            return res.status(404).json({ 
                error: 'Annonce non trouvée' 
            });
        }

        // ✅ Logger l'activité
        activityService.log(
            req.user.id, 
            'admin_announcement_delete', 
            `Annonce #${announcementId} supprimée`,
            req.ip
        );

        res.json({ 
            success: true, 
            message: 'Annonce supprimée' 
        });

    } catch (error) {
        console.error('❌ Erreur suppression annonce:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la suppression',
            details: error.message 
        });
    }
});

// ========================================
// ROUTES ADMIN - JOURNAL D'ACTIVITÉ
// ========================================

app.get('/api/admin/activities', authenticateToken, requireAdmin, (req, res) => {
    try {
        const filter = req.query.filter || 'all';
        const limit = parseInt(req.query.limit) || 50;

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
        const activities = getActivities.all(...params);

        res.json({ activities });

    } catch (error) {
        console.error('❌ Erreur récupération activités:', error);
        res.status(500).json({ 
            error: 'Erreur lors de la récupération des activités',
            details: error.message 
        });
    }
});

// ========================================
// ROUTE CATCH-ALL (DOIT ÊTRE EN DERNIER)
// ========================================

app.get('*', (req, res) => {
    // Si c'est une route API qui n'existe pas, renvoyer 404
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Route API non trouvée' });
    }
    // Sinon, servir login.html comme page par défaut
    res.sendFile(path.join(__dirname, '..', 'client', 'login.html'));
});

// ========================================
// GESTION GLOBALE DES ERREURS
// ========================================

app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
});

// ========================================
// DÉMARRAGE DU SERVEUR
// ========================================

app.listen(PORT, '0.0.0.0', () => {
   console.log(`
╔═══════════════════════════════════════════════════╗
║         🌩️  Nebula-Drive BACKEND DÉMARRÉ           ║
╠═══════════════════════════════════════════════════╣
║  Local:    http://localhost:${PORT}                       ║
║  Réseau:   http://[VOTRE_IP]:${PORT}                      ║
║  API:      http://localhost:${PORT}/api                   ║
║  Santé:    http://localhost:${PORT}/api/health            ║
╚═══════════════════════════════════════════════════╝
    `);
});

module.exports = app;