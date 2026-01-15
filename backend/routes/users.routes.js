// routes/users.routes.js — Routes de gestion des utilisateurs (Admin)

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const activityService = require('../services/activity.service');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// GET /api/users — Liste tous les utilisateurs (Admin only)
router.get('/', requireAdmin, (req, res) => {
    try {
        const users = db.prepare(`
            SELECT id, username, email, role, subscription, storage_quota, storage_used, created_at
            FROM users
            ORDER BY created_at DESC
        `).all();

        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/users/:id — Détails d'un utilisateur (Admin only)
router.get('/:id', requireAdmin, (req, res) => {
    try {
        const user = db.prepare(`
            SELECT id, username, email, role, subscription, storage_quota, storage_used, created_at, updated_at
            FROM users WHERE id = ?
        `).get(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Compter les fichiers
        const fileStats = db.prepare(`
            SELECT COUNT(*) as total_files, SUM(CASE WHEN is_folder = 1 THEN 1 ELSE 0 END) as total_folders
            FROM files WHERE owner_id = ?
        `).get(req.params.id);

        res.json({ user, stats: fileStats });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/users/:id — Modifier un utilisateur (Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { role, subscription, storage_quota, password } = req.body;
        const userId = req.params.id;

        // Vérifier que l'utilisateur existe
        const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Construire la requête de mise à jour dynamiquement
        const updates = [];
        const params = [];

        if (role && ['admin', 'premium', 'basic'].includes(role)) {
            updates.push('role = ?');
            params.push(role);
        }

        if (subscription && ['free', 'premium', 'enterprise'].includes(subscription)) {
            updates.push('subscription = ?');
            params.push(subscription);
        }

        if (storage_quota && typeof storage_quota === 'number' && storage_quota > 0) {
            updates.push('storage_quota = ?');
            params.push(storage_quota);
        }

        if (password && password.length >= 6) {
            const hash = await bcrypt.hash(password, 10);
            updates.push('password_hash = ?');
            params.push(hash);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Aucune modification valide fournie' });
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(userId);

        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        // ✅ Enregistrer l'activité
        activityService.log(
        req.user.id, 
        'user_update', 
        `Modification utilisateur #${userId}`, 
        req.ip
        );
        res.json({ message: 'Utilisateur mis à jour' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/users/:id — Supprimer un utilisateur (Admin only)
router.delete('/:id', requireAdmin, (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // Empêcher de se supprimer soi-même
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
        }

        const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Supprimer les fichiers physiques de l'utilisateur
        const fs = require('fs');
        const path = require('path');
        const userStoragePath = path.join(__dirname, '..', 'storage', `user_${userId}`);
        
        if (fs.existsSync(userStoragePath)) {
            fs.rmSync(userStoragePath, { recursive: true, force: true });
        }

        // La suppression en cascade dans SQLite s'occupe des fichiers, partages, notifications
        db.prepare('DELETE FROM users WHERE id = ?').run(userId);


        // ✅ Enregistrer l'activité
        activityService.log(
        req.user.id, 
        'user_delete', 
        `Suppression utilisateur #${userId}`, 
        req.ip
        );

        res.json({ message: 'Utilisateur et toutes ses données supprimés' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/users/search/:query — Rechercher un utilisateur par username (pour le partage)
router.get('/search/:query', (req, res) => {
    try {
        const query = req.params.query;
        
        if (query.length < 2) {
            return res.status(400).json({ error: 'Minimum 2 caractères pour la recherche' });
        }

        const users = db.prepare(`
            SELECT id, username, email 
            FROM users 
            WHERE username LIKE ? AND id != ?
            LIMIT 10
        `).all(`%${query}%`, req.user.id);

        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;