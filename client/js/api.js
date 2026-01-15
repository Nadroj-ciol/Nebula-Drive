// api.js — Fonctions d'appel à l'API

class API {
    constructor() {
        this.baseUrl = CONFIG.API_URL;
        this.token = null;
    }

    // Définir le token
    setToken(token) {
        this.token = token;
    }

    // Obtenir les headers
    getHeaders(isFormData = false) {
        const headers = {};
        
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Requête générique
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const isFormData = options.body instanceof FormData;
        
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(isFormData),
                ...options.headers
            }
        };

        try {
            console.log('🔵 Requête:', url, config);
            const response = await fetch(url, config);

            
            console.log('🟢 Status:', response.status); // ✅ AJOUTEZ CECI
        
        const text = await response.text(); // ✅ Récupérer en texte d'abord
        console.log('📄 Réponse brute:', text); // ✅ AJOUTEZ CECI
        
        let data;
        try {
            data = JSON.parse(text); // ✅ Essayer de parser
        } catch (parseError) {
            console.error('❌ Erreur parsing JSON:', parseError);
            console.error('📄 Texte reçu:', text);
            throw new Error('Le serveur n\'a pas renvoyé du JSON valide');
        }
            
            if (!response.ok) {
                throw new Error(data.error || 'Erreur serveur');
            }
            
            return data;
        } catch (error) {
            if (error.message === 'Failed to fetch') {
                throw new Error('Impossible de contacter le serveur');
            }
            throw error;
        }
    }

    // === AUTH ===
    async register(username, email, password) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password })
        });
    }

    async login(identifier, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ identifier, password })
        });
        
        if (data.token) {
            this.setToken(data.token);
        }
        
        return data;
    }

    async getMe() {
        return this.request('/auth/me');
    }

    async changePassword(currentPassword, newPassword) {
        return this.request('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    }

    async forgotPassword(email) {
        return this.request('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    async resetPassword(token, newPassword) {
        return this.request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword })
        });
    }

    // === FILES ===
    async getFiles(folderId = null) {
        const query = folderId ? `?folder=${folderId}` : '';
        return this.request(`/files${query}`);
    }

    async getSharedFiles() {
        return this.request('/files/shared');
    }

    async searchFiles(query) {
        return this.request(`/files/search?q=${encodeURIComponent(query)}`);
    }

    async getFile(fileId) {
        return this.request(`/files/${fileId}`);
    }

    async uploadFiles(files, folderId = null) {
        const formData = new FormData();
        
        for (const file of files) {
            formData.append('files', file);
        }
        
        if (folderId) {
            formData.append('folder', folderId);
        }
        
        return this.request('/files/upload', {
            method: 'POST',
            body: formData
        });
    }

    async createFolder(name, parentId = null) {
        return this.request('/files/folder', {
            method: 'POST',
            body: JSON.stringify({ name, parentId })
        });
    }

    async renameFile(fileId, name) {
        return this.request(`/files/${fileId}`, {
            method: 'PUT',
            body: JSON.stringify({ name })
        });
    }

    async moveFile(fileId, targetFolderId) {
        return this.request(`/files/${fileId}/move`, {
            method: 'PUT',
            body: JSON.stringify({ targetFolderId })
        });
    }

    async deleteFile(fileId) {
        return this.request(`/files/${fileId}`, {
            method: 'DELETE'
        });
    }

    getDownloadUrl(fileId) {
        return `${this.baseUrl}/files/${fileId}/download`;
    }

    // === SHARES ===
    async getMyShares() {
        return this.request('/shares');
    }

    async getFileShares(fileId) {
        return this.request(`/shares/file/${fileId}`);
    }

    async shareFile(fileId, username, permission = 'read') {
        return this.request('/shares', {
            method: 'POST',
            body: JSON.stringify({ fileId, username, permission })
        });
    }
 // methode pour le ârtage en masse

async bulkShareFiles(fileIds, usernames, permission = 'read') {
    return this.request('/shares/bulk', {
        method: 'POST',
        body: JSON.stringify({ fileIds, usernames, permission })
    });
}
    async updateSharePermission(shareId, permission) {
        return this.request(`/shares/${shareId}`, {
            method: 'PUT',
            body: JSON.stringify({ permission })
        });
    }

    async revokeShare(shareId) {
        return this.request(`/shares/${shareId}`, {
            method: 'DELETE'
        });
    }

    // === NOTIFICATIONS ===
    async getNotifications(limit = 50, unreadOnly = false) {
        const query = `?limit=${limit}${unreadOnly ? '&unread=true' : ''}`;
        return this.request(`/notifications${query}`);
    }

    async getUnreadCount() {
        return this.request('/notifications/count');
    }

    async markNotificationRead(notificationId) {
        return this.request(`/notifications/${notificationId}/read`, {
            method: 'PUT'
        });
    }

    async markAllNotificationsRead() {
        return this.request('/notifications/read-all', {
            method: 'PUT'
        });
    }

    async deleteNotification(notificationId) {
        return this.request(`/notifications/${notificationId}`, {
            method: 'DELETE'
        });
    }

    // === USERS (Admin) ===
    async getUsers() {
        return this.request('/users');
    }

    async getUser(userId) {
        return this.request(`/users/${userId}`);
    }

    async searchUsers(query) {
        return this.request(`/users/search/${encodeURIComponent(query)}`);
    }

    async updateUser(userId, data) {
        return this.request(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteUser(userId) {
        return this.request(`/users/${userId}`, {
            method: 'DELETE'
        });
    }

    // === ANNOUNCEMENTS (Admin) ===
async sendAnnouncement(title, message, type = 'info', targetUsers = 'all') {
    return this.request('/admin/announcements', {
        method: 'POST',
        body: JSON.stringify({ title, message, type, targetUsers })
    });
}

async getAnnouncements(limit = 10) {
    return this.request(`/admin/announcements?limit=${limit}`);
}

async deleteAnnouncement(announcementId) {
    return this.request(`/admin/announcements/${announcementId}`, {
        method: 'DELETE'
    });
}

// === ACTIVITY LOG (Admin) ===
async getActivities(filter = 'all', limit = 50) {
    const query = `?filter=${filter}&limit=${limit}`;
    return this.request(`/admin/activities${query}`);
}

}

// Instance globale
const api = new API();