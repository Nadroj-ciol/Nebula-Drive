// middleware/permissions.js — Middlewares de permissions sur les fichiers

const db = require('../config/db');

// Vérifier l'accès à un fichier (propriétaire ou partagé)
function checkFileAccess(requiredPermission = 'read') {
    return (req, res, next) => {
        try {
            const fileId = parseInt(req.params.id);
            const userId = req.user.id;

            // Récupérer le fichier
            const file = db.prepare(`
                SELECT * FROM files WHERE id = ?
            `).get(fileId);

            if (!file) {
                return res.status(404).json({ error: 'Fichier non trouvé' });
            }

            // Vérifier si l'utilisateur est le propriétaire
            if (file.owner_id === userId || req.user.role === 'admin') {
                req.file = file;
                req.accessType = 'owner';
                return next();
            }

            // Vérifier si le fichier est partagé avec l'utilisateur
            const share = db.prepare(`
                SELECT permission FROM shares 
                WHERE file_id = ? AND shared_with_id = ?
            `).get(fileId, userId);

            if (!share) {
                return res.status(403).json({ error: 'Accès refusé' });
            }

            // Vérifier la permission requise
            if (requiredPermission === 'write' && share.permission !== 'write') {
                return res.status(403).json({ error: 'Permission d\'écriture requise' });
            }

            req.file = file;
            req.accessType = 'shared';
            req.sharePermission = share.permission;
            next();

        } catch (error) {
            console.error('Erreur vérification accès:', error);
            res.status(500).json({ error: 'Erreur serveur' });
        }
    };
}

function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            error: 'Accès refusé. Droits administrateur requis.' 
        });
    }
    next();
}

// Middleware pour vérifier que l'utilisateur est propriétaire
function requireOwner(req, res, next) {
    try {
        const fileId = parseInt(req.params.id);
        const userId = req.user.id;

        const file = db.prepare(`
            SELECT * FROM files WHERE id = ?
        `).get(fileId);

        if (!file) {
            return res.status(404).json({ error: 'Fichier non trouvé' });
        }

        // Seul le propriétaire ou un admin peut effectuer cette action
        if (file.owner_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Seul le propriétaire peut effectuer cette action' });
        }

        req.file = file;
        next();

    } catch (error) {
        console.error('Erreur vérification propriétaire:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
}

module.exports = {
    checkFileAccess,
    requireOwner
};