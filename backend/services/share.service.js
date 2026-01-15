// services/share.service.js — Logique métier pour le partage de fichiers

const db = require('../config/db');
const notificationService = require('./notification.service');

class ShareService {
    // Partager un fichier avec un autre utilisateur
    shareFile(fileId, ownerId, sharedWithUsername, permission = 'read') {
        // Vérifier que le fichier appartient à l'utilisateur
        const file = db.prepare('SELECT * FROM files WHERE id = ? AND owner_id = ?').get(fileId, ownerId);
        
        if (!file) {
            throw new Error('Fichier non trouvé ou vous n\'êtes pas le propriétaire');
        }

        // Trouver l'utilisateur cible
        const targetUser = db.prepare('SELECT id, username FROM users WHERE username = ?').get(sharedWithUsername);
        
        if (!targetUser) {
            throw new Error('Utilisateur non trouvé');
        }

        if (targetUser.id === ownerId) {
            throw new Error('Vous ne pouvez pas partager un fichier avec vous-même');
        }

        // Vérifier si le partage existe déjà
        const existingShare = db.prepare(`
            SELECT id FROM shares WHERE file_id = ? AND shared_with_id = ?
        `).get(fileId, targetUser.id);

        if (existingShare) {
            // Mettre à jour la permission
            db.prepare('UPDATE shares SET permission = ? WHERE id = ?').run(permission, existingShare.id);
            return { message: 'Permission mise à jour', shareId: existingShare.id };
        }

        // Créer le partage
        const result = db.prepare(`
            INSERT INTO shares (file_id, owner_id, shared_with_id, permission)
            VALUES (?, ?, ?, ?)
        `).run(fileId, ownerId, targetUser.id, permission);

        // Notification à l'utilisateur cible
        const owner = db.prepare('SELECT username FROM users WHERE id = ?').get(ownerId);
        notificationService.create(
            targetUser.id, 
            'file_shared', 
            'Nouveau fichier partagé',
            `${owner.username} a partagé "${file.original_name}" avec vous (${permission === 'write' ? 'lecture/écriture' : 'lecture seule'}).`,
            JSON.stringify({ fileId, permission })
        );

        return { 
            message: 'Fichier partagé avec succès',
            shareId: result.lastInsertRowid
        };
    }

    // Lister les partages d'un fichier (pour le propriétaire)
    getFileShares(fileId, ownerId) {
        // Vérifier que l'utilisateur est propriétaire
        const file = db.prepare('SELECT id FROM files WHERE id = ? AND owner_id = ?').get(fileId, ownerId);
        
        if (!file) {
            throw new Error('Fichier non trouvé ou vous n\'êtes pas le propriétaire');
        }

        return db.prepare(`
            SELECT s.id, s.permission, s.created_at, u.id as user_id, u.username, u.email
            FROM shares s
            JOIN users u ON s.shared_with_id = u.id
            WHERE s.file_id = ?
        `).all(fileId);
    }

    // Modifier la permission d'un partage
    updateSharePermission(shareId, ownerId, newPermission) {
        const share = db.prepare(`
            SELECT s.*, f.original_name 
            FROM shares s 
            JOIN files f ON s.file_id = f.id
            WHERE s.id = ? AND s.owner_id = ?
        `).get(shareId, ownerId);
        
        if (!share) {
            throw new Error('Partage non trouvé ou vous n\'êtes pas le propriétaire');
        }

        db.prepare('UPDATE shares SET permission = ? WHERE id = ?').run(newPermission, shareId);

        // Notifier l'utilisateur
        const owner = db.prepare('SELECT username FROM users WHERE id = ?').get(ownerId);
        notificationService.create(
            share.shared_with_id,
            'permission_changed',
            'Permission modifiée',
            `${owner.username} a modifié vos droits sur "${share.original_name}" (${newPermission === 'write' ? 'lecture/écriture' : 'lecture seule'}).`
        );

        return { message: 'Permission mise à jour' };
    }

    // Révoquer un partage
    revokeShare(shareId, ownerId) {
        const share = db.prepare(`
            SELECT s.*, f.original_name 
            FROM shares s 
            JOIN files f ON s.file_id = f.id
            WHERE s.id = ? AND s.owner_id = ?
        `).get(shareId, ownerId);
        
        if (!share) {
            throw new Error('Partage non trouvé ou vous n\'êtes pas le propriétaire');
        }

        db.prepare('DELETE FROM shares WHERE id = ?').run(shareId);

        // Notifier l'utilisateur
        const owner = db.prepare('SELECT username FROM users WHERE id = ?').get(ownerId);
        notificationService.create(
            share.shared_with_id,
            'share_revoked',
            'Accès révoqué',
            `${owner.username} a révoqué votre accès à "${share.original_name}".`
        );

        return { message: 'Partage révoqué' };
    }

    // Lister les fichiers partagés par l'utilisateur
    getMyShares(ownerId) {
        return db.prepare(`
            SELECT s.id, s.permission, s.created_at, 
                   f.id as file_id, f.original_name, f.is_folder,
                   u.id as shared_with_id, u.username as shared_with
            FROM shares s
            JOIN files f ON s.file_id = f.id
            JOIN users u ON s.shared_with_id = u.id
            WHERE s.owner_id = ?
            ORDER BY s.created_at DESC
        `).all(ownerId);
    }
}

module.exports = new ShareService();