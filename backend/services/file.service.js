// services/file.service.js — Logique métier pour la gestion des fichiers

const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const notificationService = require('./notification.service');

class FileService {
    // Lister les fichiers d'un utilisateur
    listFiles(userId, folderId = null) {
        const query = folderId 
            ? 'SELECT * FROM files WHERE owner_id = ? AND parent_id = ? ORDER BY is_folder DESC, original_name ASC'
            : 'SELECT * FROM files WHERE owner_id = ? AND parent_id IS NULL ORDER BY is_folder DESC, original_name ASC';
        
        const params = folderId ? [userId, folderId] : [userId];
        return db.prepare(query).all(...params);
    }

    // Lister les fichiers partagés avec l'utilisateur
    listSharedWithMe(userId) {
        return db.prepare(`
            SELECT f.*, s.permission, u.username as owner_name
            FROM shares s
            JOIN files f ON s.file_id = f.id
            JOIN users u ON f.owner_id = u.id
            WHERE s.shared_with_id = ?
            ORDER BY f.original_name ASC
        `).all(userId);
    }

    // Obtenir un fichier par ID
    getFileById(fileId) {
        return db.prepare('SELECT * FROM files WHERE id = ?').get(fileId);
    }

    // Créer un enregistrement de fichier après upload
    createFile(userId, fileData, parentId = null) {
        const { filename, originalname, path: filePath, size, mimetype } = fileData;

        // Vérifier le quota
        const user = db.prepare('SELECT storage_quota, storage_used FROM users WHERE id = ?').get(userId);
        
        if (user.storage_used + size > user.storage_quota) {
            // Supprimer le fichier uploadé
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            throw new Error('Quota de stockage dépassé');
        }

        // Insérer le fichier en DB
        const result = db.prepare(`
            INSERT INTO files (owner_id, filename, original_name, path, size, mime_type, parent_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(userId, filename, originalname, filePath, size, mimetype, parentId);

        // Mettre à jour l'espace utilisé
        db.prepare('UPDATE users SET storage_used = storage_used + ? WHERE id = ?').run(size, userId);

        // Notification
        notificationService.create(userId, 'upload_complete', 'Upload terminé', `Le fichier "${originalname}" a été uploadé avec succès.`);

        return {
            id: result.lastInsertRowid,
            filename,
            original_name: originalname,
            size,
            mime_type: mimetype
        };
    }

    // Créer un dossier
    createFolder(userId, folderName, parentId = null) {
        // Vérifier si un dossier avec ce nom existe déjà au même niveau
        const existing = db.prepare(`
            SELECT id FROM files 
            WHERE owner_id = ? AND original_name = ? AND is_folder = 1 
            AND (parent_id = ? OR (parent_id IS NULL AND ? IS NULL))
        `).get(userId, folderName, parentId, parentId);

        if (existing) {
            throw new Error('Un dossier avec ce nom existe déjà');
        }

        const result = db.prepare(`
            INSERT INTO files (owner_id, filename, original_name, path, is_folder, parent_id)
            VALUES (?, ?, ?, '', 1, ?)
        `).run(userId, folderName, folderName, parentId);

        return {
            id: result.lastInsertRowid,
            name: folderName,
            is_folder: true
        };
    }

    // Renommer un fichier/dossier
    renameFile(fileId, newName, userId) {
        const file = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId);
        
        if (!file) {
            throw new Error('Fichier non trouvé');
        }

        if (file.owner_id !== userId) {
            throw new Error('Permission refusée');
        }

        db.prepare(`
            UPDATE files 
            SET original_name = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(newName, fileId);

        return { message: 'Fichier renommé avec succès', newName };
    }

    // Déplacer un fichier/dossier
    moveFile(fileId, newParentId, userId) {
        const file = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId);
        
        if (!file) {
            throw new Error('Fichier non trouvé');
        }

        if (file.owner_id !== userId) {
            throw new Error('Permission refusée');
        }

        // Vérifier que le nouveau parent existe et est un dossier
        if (newParentId !== null) {
            const parent = db.prepare('SELECT * FROM files WHERE id = ? AND is_folder = 1').get(newParentId);
            if (!parent) {
                throw new Error('Dossier de destination non trouvé');
            }
            if (parent.owner_id !== userId) {
                throw new Error('Permission refusée sur le dossier de destination');
            }
            // Empêcher de déplacer un dossier dans lui-même ou ses enfants
            if (file.is_folder && this.isDescendant(fileId, newParentId)) {
                throw new Error('Impossible de déplacer un dossier dans lui-même');
            }
        }

        db.prepare(`
            UPDATE files 
            SET parent_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(newParentId, fileId);

        return { message: 'Fichier déplacé avec succès' };
    }

    // Vérifier si targetId est un descendant de folderId
    isDescendant(folderId, targetId) {
        let current = db.prepare('SELECT parent_id FROM files WHERE id = ?').get(targetId);
        while (current && current.parent_id !== null) {
            if (current.parent_id === folderId) {
                return true;
            }
            current = db.prepare('SELECT parent_id FROM files WHERE id = ?').get(current.parent_id);
        }
        return false;
    }

    // Supprimer un fichier/dossier
    deleteFile(fileId, userId) {
        const file = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId);
        
        if (!file) {
            throw new Error('Fichier non trouvé');
        }

        if (file.owner_id !== userId) {
            throw new Error('Permission refusée');
        }

        // Si c'est un dossier, supprimer récursivement le contenu
        if (file.is_folder) {
            this.deleteFolderContents(fileId, userId);
        } else {
            // Supprimer le fichier physique
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
            // Mettre à jour l'espace utilisé
            db.prepare('UPDATE users SET storage_used = storage_used - ? WHERE id = ?').run(file.size, userId);
        }

        // Supprimer l'entrée de la DB (les partages seront supprimés en cascade)
        db.prepare('DELETE FROM files WHERE id = ?').run(fileId);

        return { message: 'Fichier supprimé avec succès' };
    }

    // Supprimer le contenu d'un dossier récursivement
    deleteFolderContents(folderId, userId) {
        const children = db.prepare('SELECT * FROM files WHERE parent_id = ?').all(folderId);
        
        for (const child of children) {
            if (child.is_folder) {
                this.deleteFolderContents(child.id, userId);
            } else {
                if (fs.existsSync(child.path)) {
                    fs.unlinkSync(child.path);
                }
                db.prepare('UPDATE users SET storage_used = storage_used - ? WHERE id = ?').run(child.size, userId);
            }
            db.prepare('DELETE FROM files WHERE id = ?').run(child.id);
        }
    }

    // Obtenir le chemin complet d'un fichier (breadcrumb)
    getFilePath(fileId) {
        const path = [];
        let current = db.prepare('SELECT id, original_name, parent_id FROM files WHERE id = ?').get(fileId);
        
        while (current) {
            path.unshift({ id: current.id, name: current.original_name });
            if (current.parent_id) {
                current = db.prepare('SELECT id, original_name, parent_id FROM files WHERE id = ?').get(current.parent_id);
            } else {
                break;
            }
        }
        
        return path;
    }

    // Rechercher des fichiers
    searchFiles(userId, query) {
        return db.prepare(`
            SELECT * FROM files 
            WHERE owner_id = ? AND original_name LIKE ?
            ORDER BY is_folder DESC, original_name ASC
        `).all(userId, `%${query}%`);
    }
}

module.exports = new FileService();