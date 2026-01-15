// services/auth.service.js — Logique métier pour l'authentification

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'otre_cle_secrete_super_longue_48h_projet_2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

class AuthService {
    // Inscription d'un nouvel utilisateur
    async register(username, email, password) {
        // Vérifier si l'utilisateur existe déjà
        const existingUser = db.prepare(
            'SELECT id FROM users WHERE username = ? OR email = ?'
        ).get(username, email);

        if (existingUser) {
            throw new Error('Nom d\'utilisateur ou email déjà utilisé');
        }

        // Hasher le mot de passe
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Quota par défaut (100 MB pour basic)
        const defaultQuota = parseInt(process.env.QUOTA_BASIC) || 104857600;

        // Insérer l'utilisateur
        const result = db.prepare(`
            INSERT INTO users (username, email, password_hash, storage_quota)
            VALUES (?, ?, ?, ?)
        `).run(username, email, passwordHash, defaultQuota);

        return {
            id: result.lastInsertRowid,
            username,
            email,
            role: 'basic',
            subscription: 'free'
        };
    }

    // Connexion
    async login(identifier, password) {
        // Chercher par username ou email
        const user = db.prepare(`
            SELECT * FROM users 
            WHERE username = ? OR email = ?
        `).get(identifier, identifier);

        if (!user) {
            throw new Error('Identifiants incorrects');
        }

        // Vérifier le mot de passe
        const isValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isValid) {
            throw new Error('Identifiants incorrects');
        }

        // Générer le token JWT
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                subscription: user.subscription,
                storage_quota: user.storage_quota,
                storage_used: user.storage_used
            }
        };
    }

    // Demande de réinitialisation de mot de passe
    async requestPasswordReset(email) {
        const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        
        if (!user) {
            // Ne pas révéler si l'email existe ou non
            return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé' };
        }

        // Générer un token de réinitialisation
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpires = Date.now() + 3600000; // 1 heure

        db.prepare(`
            UPDATE users 
            SET reset_token = ?, reset_token_expires = ?
            WHERE id = ?
        `).run(resetToken, resetTokenExpires, user.id);

        // En production: envoyer un email avec le token
        // Pour le projet 48h: on retourne le token directement
        return { 
            message: 'Token de réinitialisation généré',
            resetToken, // En prod, ne pas renvoyer ceci!
            expiresIn: '1 heure'
        };
    }

    // Réinitialisation du mot de passe
    async resetPassword(token, newPassword) {
        const user = db.prepare(`
            SELECT id FROM users 
            WHERE reset_token = ? AND reset_token_expires > ?
        `).get(token, Date.now());

        if (!user) {
            throw new Error('Token invalide ou expiré');
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        db.prepare(`
            UPDATE users 
            SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(passwordHash, user.id);

        return { message: 'Mot de passe réinitialisé avec succès' };
    }

    // Changer le mot de passe (utilisateur connecté)
    async changePassword(userId, currentPassword, newPassword) {
        const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);

        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        
        if (!isValid) {
            throw new Error('Mot de passe actuel incorrect');
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        db.prepare(`
            UPDATE users 
            SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(passwordHash, userId);

        return { message: 'Mot de passe modifié avec succès' };
    }
}

module.exports = new AuthService();