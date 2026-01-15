// routes/share.routes.js — Routes de partage de fichiers

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const shareService = require('../services/share.service');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// GET /api/shares —Liste les fichiers que j'ai partagés
router.get('/', (req, res) => {
    try {
        const shares = shareService.getMyShares(req.user.id);
        res.json({ shares });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/shares/file/:fileId — Liste des partages d'un fichier spécifique
router.get('/file/:fileId', (req, res) => {
    try {
        const shares = shareService.getFileShares(parseInt(req.params.fileId), req.user.id);
        res.json({ shares });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/shares — Partager un fichier
router.post('/', (req, res) => {
    try {
        const { fileId, username, permission } = req.body;

        if (!fileId || !username) {
            return res.status(400).json({ error: 'fileId et username requis' });
        }
        const validPermissions = ['read', 'write'];
        const perm = validPermissions.includes(permission) ? permission : 'read';

        const result = shareService.shareFile(
            parseInt(fileId),
            req.user.id,
            username.trim(),
            perm
        );

        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/shares/: Modifier la permission d'un partage
router.put('/:id', (req, res) => {
    try {
        const { permission } = req.body;

        if (!permission || !['read', 'write'].includes(permission)) {
            return res.status(400).json ({ error: 'Permission invalide (read ou write)' });
        }

        const result = shareService.updateSharePermission(
            parseInt(req.params.id),
            req.user.id,
            permission
        );

        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/shares/:id —Revoquer un partage
router.delete('/:id', (req, res) => {
    try {
        const result = shareService.revokeShare(parseInt(req.params.id), req.user.id);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;