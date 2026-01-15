// routes/auth.routes.js — Routes d'authentification

const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { authenticate } = require('../middleware/auth');
const activityService = require('../services/activity.service');

// POST /api/auth/register — Inscription
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validations basiques
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Tous les champs sont requis' });
        }

        if (username.length < 3) {
            return res.status(400).json({ error: 'Le nom d\'utilisateur doit contenir au moins 3 caractères' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Email invalide' });
        }

        const user = await authService.register(username, email, password);
        
        // ✅ Enregistrer l'activité
        activityService.log(user.id, 'user_register', `Nouvel utilisateur : ${username}`, req.ip);

        res.status(201).json({ message: 'Inscription réussie', user });

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/auth/login — Connexion
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ error: 'Identifiant et mot de passe requis' });
        }

        const result = await authService.login(identifier, password);
        // ✅ Enregistrer l'activité
activityService.log(result.user.id, 'user_login', `Connexion réussie`, req.ip);
        res.json(result);

    } catch (err) {
        res.status(401).json({ error: err.message });
    }
});

// POST /api/auth/forgot-password — Demande de réinitialisation
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email requis' });
        }

        const result = await authService.requestPasswordReset(email);
        res.json(result);

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/auth/reset-password — Réinitialisation du mot de passe
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token et nouveau mot de passe requis' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
        }

        const result = await authService.resetPassword(token, newPassword);
        res.json(result);

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/auth/change-password — Changer son mot de passe (connecté)
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
        }

        const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
        res.json(result);

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/auth/me — Obtenir le profil de l'utilisateur connecté
router.get('/me', authenticate, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;