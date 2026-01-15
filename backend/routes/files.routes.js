// routes/files.routes.js — Routes de gestion des fichiers

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const { checkFileAccess, requireOwner } = require('../middleware/permissions');
const upload = require('../middleware/upload');
const fileService = require('../services/file.service');

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// GET /api/files — Liste des fichiers (avec option ?folder=id)
router.get('/', (req, res) => {
    try {
        const folderId = req.query.folder ? parseInt(req.query.folder) : null;
        const files = fileService.listFiles(req.user.id, folderId);
        
        // Obtenir le chemin (breadcrumb) si on est dans un dossier
        let breadcrumb = [];
        if (folderId) {
            breadcrumb = fileService.getFilePath(folderId);
        }

        res.json({ files, breadcrumb, currentFolder: folderId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/files/shared — Fichiers partagés avec moi
router.get('/shared', (req, res) => {
    try {
        const files = fileService.listSharedWithMe(req.user.id);
        res.json({ files });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/files/search?q=query — Recherche de fichiers
router.get('/search', (req, res) => {
    try {
        const query = req.query.q;
        if (!query || query.length < 2) {
            return res.status(400).json({ error: 'Minimum 2 caractères pour la recherche' });
        }

        const files = fileService.searchFiles(req.user.id, query);
        res.json({ files });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/files/upload — Upload de fichier(s)
router.post('/upload', upload.array('files', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        const parentId = req.body.folder ? parseInt(req.body.folder) : null;
        const uploadedFiles = [];

        for (const file of req.files) {
            const savedFile = fileService.createFile(req.user.id, file, parentId);
            uploadedFiles.push(savedFile);
        }

        res.status(201).json({ 
            message: `${uploadedFiles.length} fichier(s) uploadé(s)`,
            files: uploadedFiles 
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/files/folder — Créer un dossier
router.post('/folder', (req, res) => {
    try {
        const { name, parentId } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Nom du dossier requis' });
        }

        const folder = fileService.createFolder(
            req.user.id, 
            name.trim(), 
            parentId ? parseInt(parentId) : null
        );

        res.status(201).json({ message: 'Dossier créé', folder });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/files/:id — Métadonnées d'un fichier
router.get('/:id', checkFileAccess('read'), (req, res) => {
    try {
        const file = req.file;
        const breadcrumb = fileService.getFilePath(file.id);
        
        res.json({ 
            file,
            breadcrumb,
            accessType: req.accessType,
            permission: req.sharePermission || 'owner'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/files/:id/download — Télécharger un fichier
router.get('/:id/download', checkFileAccess('read'), (req, res) => {
    try {
        const file = req.file;

        if (file.is_folder) {
            return res.status(400).json({ error: 'Impossible de télécharger un dossier' });
        }

        if (!fs.existsSync(file.path)) {
            return res.status(404).json({ error: 'Fichier non trouvé sur le disque' });
        }

        res.download(file.path, file.original_name);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/files/:id — Renommer un fichier/dossier
router.put('/:id', checkFileAccess('write'), (req, res) => {
    try {
        const { name } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Nouveau nom requis' });
        }

        // Si l'utilisateur n'est pas propriétaire mais a une permission write via partage
        const userId = req.accessType === 'owner' ? req.user.id : req.file.owner_id;
        
        // Seul le propriétaire peut renommer
        if (req.accessType !== 'owner' && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Seul le propriétaire peut renommer' });
        }

        const result = fileService.renameFile(req.file.id, name.trim(), req.user.id);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/files/:id/move — Déplacer un fichier/dossier
router.put('/:id/move', requireOwner, (req, res) => {
    try {
        const { targetFolderId } = req.body;
        const newParentId = targetFolderId === null || targetFolderId === 'root' 
            ? null 
            : parseInt(targetFolderId);

        const result = fileService.moveFile(req.file.id, newParentId, req.user.id);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/files/:id — Supprimer un fichier/dossier
router.delete('/:id', requireOwner, (req, res) => {
    try {
        const result = fileService.deleteFile(req.file.id, req.user.id);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;