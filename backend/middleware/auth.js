// middleware/auth.js — Middlewares d'authentification

const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_super_securise_a_changer';

// Middleware pour vérifier le token JWT
function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' });
        }

        const token = authHeader.substring(7); // Enlever "Bearer "
        
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Récupérer l'utilisateur complet depuis la DB
        const user = db.prepare(`
            SELECT id, username, email, role, subscription, storage_quota, storage_used
            FROM users WHERE id = ?
        `).get(decoded.userId);
        
        if (!user) {
            return res.status(401).json({ error: 'Utilisateur non trouvé' });
        }
        
        // Attacher l'utilisateur à la requête
        req.user = user;
        next();
        
    } catch (error) {
        console.error('Erreur authentification:', error); // Debug
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token invalide' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expiré' });
        }
        return res.status(401).json({ error: 'Authentification échouée' });
    }
}

// Middleware pour vérifier le rôle admin
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Non authentifié' });
    }
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès refusé - Admin requis' });
    }
    
    next();
}

module.exports = {
    authenticate,
    requireAdmin
};