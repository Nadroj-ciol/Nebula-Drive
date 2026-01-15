// share.js — Gestion du partage de fichiers

class ShareManager {
    constructor() {
        this.currentFileId = null;
        this.currentShares = [];
        this.searchTimeout = null;
    }

    // Ouvrir le modal de partage
    async openShareModal(fileId) {
        console.log('Ouverture modal partage pour fichier:', fileId); // Debug
        
        this.currentFileId = fileId;
        
        // Récupérer le fichier
        const file = fileManager.files.find(f => f.id === fileId);
        if (!file) {
            console.error('Fichier non trouvé:', fileId); // Debug
            showToast('error', 'Erreur', 'Fichier non trouvé');
            return;
        }

        console.log('Fichier trouvé:', file); // Debug

        // Mettre à jour le titre
        const modalTitle = document.querySelector('#share-modal .modal-title');
        if (modalTitle) {
            modalTitle.textContent = `Partager "${file.original_name}"`;
        }

        // Réinitialiser le champ de recherche
        const searchInput = document.getElementById('share-user-input');
        if (searchInput) {
            searchInput.value = '';
        }

        // Masquer les résultats
        const results = document.getElementById('share-user-results');
        if (results) {
            results.style.display = 'none';
            results.innerHTML = '';
        }

        // Charger les partages existants
        await this.loadCurrentShares(fileId);

        // Ouvrir le modal
        openModal('share-modal');
    }

    // Charger les partages existants
    async loadCurrentShares(fileId) {
        try {
            const result = await api.getFileShares(fileId);
            this.currentShares = result.shares || [];
            
            this.renderCurrentShares();
        } catch (error) {
            console.error('Erreur chargement partages:', error);
            this.currentShares = [];
            this.renderCurrentShares();
        }
    }

    // Rendu des partages existants
    renderCurrentShares() {
        const container = document.getElementById('shared-users-list');
        if (!container) return;

        if (this.currentShares.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-muted);">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 12px;">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                    <p>Ce fichier n'est partagé avec personne</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.currentShares.map(share => `
            <div class="shared-user-item">
                <div class="share-user-avatar">${share.username.charAt(0).toUpperCase()}</div>
                <div class="share-user-info">
                    <div class="share-user-name">${share.username}</div>
                    <div class="share-user-email">${share.email}</div>
                </div>
                <div class="shared-user-permission">
                    <select onchange="shareManager.updatePermission(${share.id}, this.value)">
                        <option value="read" ${share.permission === 'read' ? 'selected' : ''}>Lecture</option>
                        <option value="write" ${share.permission === 'write' ? 'selected' : ''}>Écriture</option>
                    </select>
                </div>
                <button class="shared-user-remove" onclick="shareManager.revokeShare(${share.id})" title="Révoquer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `).join('');
    }

    // Rechercher des utilisateurs
    searchUsers(query) {
        clearTimeout(this.searchTimeout);
        
        const results = document.getElementById('share-user-results');
        if (!results) return;

        if (!query || query.length < 2) {
            results.style.display = 'none';
            return;
        }

        this.searchTimeout = setTimeout(async () => {
            try {
                const data = await api.searchUsers(query);
                
                if (data.users.length === 0) {
                    results.innerHTML = `
                        <div class="share-user-item" style="cursor: default; opacity: 0.6;">
                            Aucun utilisateur trouvé
                        </div>
                    `;
                } else {
                    results.innerHTML = data.users.map(user => `
                        <div class="share-user-item" onclick="shareManager.shareWithUser('${user.username}')">
                            <div class="share-user-avatar">${user.username.charAt(0).toUpperCase()}</div>
                            <div class="share-user-info">
                                <div class="share-user-name">${user.username}</div>
                                <div class="share-user-email">${user.email}</div>
                            </div>
                        </div>
                    `).join('');
                }
                
                results.style.display = 'block';
            } catch (error) {
                console.error('Erreur recherche utilisateurs:', error);
                results.style.display = 'none';
            }
        }, 300);
    }

    // Partager avec un utilisateur
    async shareWithUser(username) {
        try {
            const permission = document.getElementById('share-permission')?.value || 'read';
            
            await api.shareFile(this.currentFileId, username, permission);
            
            showToast('success', 'Partage', `Fichier partagé avec ${username}`);
            
            // Réinitialiser la recherche
            const searchInput = document.getElementById('share-user-input');
            if (searchInput) searchInput.value = '';
            
            const results = document.getElementById('share-user-results');
            if (results) results.style.display = 'none';
            
            // Recharger les partages
            await this.loadCurrentShares(this.currentFileId);
            
        } catch (error) {
            showToast('error', 'Erreur', error.message);
        }
    }

    // Mettre à jour la permission
    async updatePermission(shareId, permission) {
        try {
            await api.updateSharePermission(shareId, permission);
            showToast('success', 'Permission mise à jour', `Maintenant en ${permission === 'read' ? 'lecture' : 'écriture'}`);
            
            // Mettre à jour localement
            const share = this.currentShares.find(s => s.id === shareId);
            if (share) {
                share.permission = permission;
            }
        } catch (error) {
            showToast('error', 'Erreur', error.message);
            // Recharger pour réinitialiser
            await this.loadCurrentShares(this.currentFileId);
        }
    }

    // Révoquer un partage
    async revokeShare(shareId) {
        try {
            await api.revokeShare(shareId);
            showToast('success', 'Partage révoqué', 'Le partage a été supprimé');
            
            // Recharger les partages
            await this.loadCurrentShares(this.currentFileId);
            
            // Si appelé depuis "Mes partages", recharger la liste
            if (fileManager.files.some(f => f.share_id === shareId)) {
                fileManager.loadMyShares();
            }
        } catch (error) {
            showToast('error', 'Erreur', error.message);
        }
    }

    // Fermer le modal
    closeShareModal() {
        closeModal('share-modal');
        this.currentFileId = null;
        this.currentShares = [];
    }
}

// Instance globale
const shareManager = new ShareManager();

// Fonction globale pour ouvrir le modal (appelée depuis files.js)
function openShareModal(fileId) {
    shareManager.openShareModal(fileId);
}