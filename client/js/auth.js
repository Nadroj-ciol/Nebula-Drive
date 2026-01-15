// auth.js — Gestion de l'authentification

class Auth {
    constructor() {
        // CORRECTION: Utiliser sessionStorage pour persister la session
        this.loadSession();
    }

    // Charger la session depuis sessionStorage
    loadSession() {
        try {
            const token = sessionStorage.getItem('nebula_token');
            const userJson = sessionStorage.getItem('nebula_user');
            
            if (token && userJson) {
                this.token = token;
                this.user = JSON.parse(userJson);
                api.setToken(token);
            } else {
                this.token = null;
                this.user = null;
            }
        } catch (error) {
            console.error('Erreur chargement session:', error);
            this.token = null;
            this.user = null;
        }
    }
    // Vérifier si connecté
    isLoggedIn() {
        return !!this.token && !!this.user;
    }

    // Sauvegarder la session
    saveSession(token, user) {
        this.token = token;
        this.user = user;
        api.setToken(token);
        // Sauvegarder dans sessionStorage
         try {
            sessionStorage.setItem('nebula_token', token);
            sessionStorage.setItem('nebula_user', JSON.stringify(user));
        } catch (error) {
            console.error('Erreur sauvegarde session:', error);
        }
    }
    

    // Effacer la session
    clearSession() {
        this.token = null;
        this.user = null;
        api.setToken(null);

        // CORRECTION: Effacer de sessionStorage
        try {
            sessionStorage.removeItem('nebula_token');
            sessionStorage.removeItem('nebula_user');
        } catch (error) {
            console.error('Erreur effacement session:', error);
        }
    }

    // Obtenir l'utilisateur courant
    getUser() {
        return this.user;
    }

    // Obtenir le token
    getToken() {
        return this.token;
    }

    // Mettre à jour les infos utilisateur
    updateUser(userData) {
        this.user = { ...this.user, ...userData };
    }

    // Vérifier si admin
    isAdmin() {
        return this.user && this.user.role === 'admin';
    }

    // Vérifier si premium
    isPremium() {
        return this.user && (this.user.role === 'admin' || this.user.role === 'premium');
    }

    // Inscription
    async register(username, email, password) {
        const result = await api.register(username, email, password);
        return result;
    }

    // Connexion
    async login(identifier, password) {
        const result = await api.login(identifier, password);
        
        if (result.token && result.user) {
            this.saveSession(result.token, result.user);
        }
        
        return result;
    }

    // Déconnexion
    logout() {
        this.clearSession();
        window.location.href = 'login.html';
    }

    // Vérifier la session
    async checkSession() {
        if (!this.token) {
            return false;
        }

        try {
            const result = await api.getMe();
            if (result.user) {
                this.user = result.user;
                return true;
            }
        } catch (error) {
            this.clearSession();
        }
        
        return false;
    }
}

// Instance globale
const auth = new Auth();