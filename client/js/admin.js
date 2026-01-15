// admin.js — Gestion du panel d'administration

class AdminManager {
    constructor() {
        this.users = [];
        this.stats = null;
        this.editingUserId = null;
        this.announcements = [];
        this.activities = [];
        this.currentActivityFilter = 'all';
    }

    // Charger les statistiques
    async loadStats() {
        try {
            console.log('Chargement des stats admin...'); // Debug
            showLoading(true);
            
            // CORRECTION: Récupérer tous les utilisateurs
            const result = await api.getUsers();
            console.log('Résultat API users:', result); // Debug
            
            this.users = result.users || [];
            console.log('Utilisateurs chargés:', this.users.length); // Debug
            
            // Calculer les stats
            this.calculateStats();
            this.renderStats();
            this.renderUsersTable();

            // ✅ Charger les annonces et activités
            await this.loadAnnouncements();
            await this.loadActivities();
            
        } catch (error) {
            console.error('Erreur chargement stats:', error); // Debug
            showToast('error', 'Erreur', error.message);
            
            // CORRECTION: Afficher un message d'erreur dans le conteneur
            const container = document.getElementById('admin-stats');
            if (container) {
                container.innerHTML = `
                    <div class="stat-card" style="grid-column: 1 / -1;">
                        <div style="text-align: center; color: var(--accent-danger);">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 12px;">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                            <p>Erreur de chargement: ${error.message}</p>
                            <button class="btn btn-secondary" onclick="adminManager.loadStats()" style="margin-top: 12px;">
                                Réessayer
                            </button>
                        </div>
                    </div>
                `;
            }
        } finally {
            showLoading(false);
        }
    }

    // Calculer les statistiques
    calculateStats() {
        const totalUsers = this.users.length;
        const totalStorage = this.users.reduce((sum, u) => sum + (u.storage_used || 0), 0);
        const totalQuota = this.users.reduce((sum, u) => sum + (u.storage_quota || 0), 0);
        
        this.stats = {
            totalUsers,
            totalStorage,
            totalQuota,
            storagePercentage: totalQuota > 0 ? ((totalStorage / totalQuota) * 100).toFixed(1) : 0
        };
    }

    // Rendu des statistiques
    renderStats() {
        const container = document.getElementById('admin-stats');
        if (!container || !this.stats) return;

        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon users">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                </div>
                <div class="stat-value">${this.stats.totalUsers}</div>
                <div class="stat-label">Utilisateurs</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon storage">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                    </svg>
                </div>
                <div class="stat-value">${formatSize(this.stats.totalStorage)}</div>
                <div class="stat-label">Stockage utilisé (${this.stats.storagePercentage}%)</div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon files">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                        <polyline points="13 2 13 9 20 9"></polyline>
                    </svg>
                </div>
                <div class="stat-value">${formatSize(this.stats.totalQuota)}</div>
                <div class="stat-label">Quota total</div>
            </div>
        `;
    }

    // Rendu du tableau des utilisateurs
    renderUsersTable() {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        if (this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        Aucun utilisateur
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.users.map(user => {
            const storagePercent = user.storage_quota > 0 
                ? ((user.storage_used / user.storage_quota) * 100).toFixed(0) 
                : 0;
            
            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.9rem;">
                                ${user.username.charAt(0).toUpperCase()}
                            </div>
                            <strong>${user.username}</strong>
                        </div>
                    </td>
                    <td>${user.email}</td>
                    <td><span class="role-badge ${user.role}">${user.role}</span></td>
                    <td>${user.subscription}</td>
                    <td>
                        <div style="font-size: 0.85rem;">
                            ${formatSize(user.storage_used)} / ${formatSize(user.storage_quota)}
                            <div class="storage-bar" style="margin-top: 4px;">
                                <div class="storage-bar-fill" style="width: ${storagePercent}%;"></div>
                            </div>
                        </div>
                    </td>
                    <td>${formatDate(user.created_at)}</td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-icon btn-sm btn-secondary" 
                                    onclick="adminManager.openEditModal(${user.id})" 
                                    title="Modifier">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                            ${auth.getUser().id !== user.id ? `
                                <button class="btn btn-icon btn-sm btn-danger" 
                                        onclick="adminManager.confirmDeleteUser(${user.id}, '${user.username}')" 
                                        title="Supprimer">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Ouvrir le modal d'édition
    openEditModal(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        this.editingUserId = userId;

        // Remplir le formulaire
        document.getElementById('edit-user-id').value = userId;
        document.getElementById('edit-user-role').value = user.role;
        document.getElementById('edit-user-subscription').value = user.subscription;
        document.getElementById('edit-user-quota').value = Math.round(user.storage_quota / (1024 * 1024)); // Convertir en MB
        document.getElementById('edit-user-password').value = '';

        openModal('edit-user-modal');
    }

    // Sauvegarder les modifications
    async saveUserEdit() {
        try {
            const userId = parseInt(document.getElementById('edit-user-id').value);
            const role = document.getElementById('edit-user-role').value;
            const subscription = document.getElementById('edit-user-subscription').value;
            const quotaMB = parseInt(document.getElementById('edit-user-quota').value);
            const password = document.getElementById('edit-user-password').value;

            // Validation
            if (quotaMB < 10 || quotaMB > 10240) {
                showToast('error', 'Erreur', 'Le quota doit être entre 10 MB et 10 GB');
                return;
            }

            if (password && password.length < 6) {
                showToast('error', 'Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
                return;
            }

            // Préparer les données
            const data = {
                role,
                subscription,
                storage_quota: quotaMB * 1024 * 1024 // Convertir en bytes
            };

            if (password) {
                data.password = password;
            }

            // Envoyer la requête
            await api.updateUser(userId, data);

            showToast('success', 'Utilisateur mis à jour', 'Les modifications ont été enregistrées');
            this.closeEditModal();
            this.loadStats(); // Recharger les données

        } catch (error) {
            showToast('error', 'Erreur', error.message);
        }
    }

    // Fermer le modal d'édition
    closeEditModal() {
        closeModal('edit-user-modal');
        this.editingUserId = null;
    }

    // Confirmer la suppression
    confirmDeleteUser(userId, username) {
        showConfirmModal(
            'Supprimer l\'utilisateur',
            `Êtes-vous sûr de vouloir supprimer "${username}" ? Tous ses fichiers et données seront supprimés définitivement.`,
            async () => {
                await this.deleteUser(userId);
            }
        );
    }

    // Supprimer un utilisateur
    async deleteUser(userId) {
        try {
            await api.deleteUser(userId);
            showToast('success', 'Utilisateur supprimé', 'L\'utilisateur et ses données ont été supprimés');
            this.loadStats(); // Recharger les données
        } catch (error) {
            showToast('error', 'Erreur', error.message);
        }
    }


// ========================================
// ANNONCES
// ========================================

async loadAnnouncements() {
    try {
        console.log('📢 Chargement des annonces...'); // Debug
        
        const result = await api.getAnnouncements(10);
        
        console.log('📢 Résultat API annonces:', result); // Debug
        
        // ✅ Vérification stricte
        if (!result || !Array.isArray(result.announcements)) {
            console.warn('⚠️ Format de réponse invalide:', result);
            this.announcements = [];
        } else {
            this.announcements = result.announcements;
        }
        
        console.log('📢 Annonces chargées:', this.announcements.length); // Debug
        
        this.renderAnnouncements();
        
    } catch (error) {
        console.error('❌ Erreur chargement annonces:', error);
        this.announcements = [];
        this.renderAnnouncements();
    }
}

renderAnnouncements() {
    const container = document.getElementById('announcements-list');
    if (!container) return;

    if (this.announcements.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 16px; opacity: 0.3;">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>Aucune annonce récente</p>
            </div>
        `;
        return;
    }

    const typeIcons = {
        info: { icon: 'ℹ️', color: 'var(--accent-primary)' },
        warning: { icon: '⚠️', color: 'var(--accent-warning)' },
        success: { icon: '✅', color: 'var(--accent-success)' },
        maintenance: { icon: '🔧', color: 'var(--accent-secondary)' }
    };

    container.innerHTML = this.announcements.map(ann => {
        const typeData = typeIcons[ann.type] || typeIcons.info;
        return `
            <div style="padding: 16px; border-bottom: 1px solid var(--border-color); display: flex; gap: 12px;">
                <div style="font-size: 2rem;">${typeData.icon}</div>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                        <strong style="color: var(--text-primary);">${ann.title}</strong>
                        <button class="btn btn-icon btn-sm" onclick="adminManager.deleteAnnouncement(${ann.id})" title="Supprimer">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                    <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 8px;">${ann.message}</p>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">
                        Envoyée ${formatDate(ann.created_at)} • ${ann.notification_count || 0} utilisateur(s) notifié(s)
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Ajouter ces méthodes à la classe AdminManager :

// Ouvrir le modal d'annonce amélioré
openAnnouncementModal() {
    document.getElementById('announcement-title').value = '';
    document.getElementById('announcement-message').value = '';
    document.getElementById('announcement-type').value = 'info';
    
    // Réinitialiser la sélection d'utilisateurs
    document.getElementById('announcement-target').value = 'all';
    document.getElementById('announcement-users-list').style.display = 'none';
    
    // Charger la liste des utilisateurs
    this.loadUsersForAnnouncement();
    
    openModal('announcement-modal');
}

// Charger les utilisateurs pour la sélection
loadUsersForAnnouncement() {
    const container = document.getElementById('announcement-users-list');
    const currentUserId = auth.getUser().id;
    
    if (!container) return;
    
    const users = this.users.filter(u => u.id !== currentUserId);
    
    container.innerHTML = `
        <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px;">
            ${users.map(user => `
                <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 6px; transition: background 0.2s;" 
                       onmouseover="this.style.background='var(--bg-tertiary)'" 
                       onmouseout="this.style.background='transparent'">
                    <input type="checkbox" 
                           value="${user.id}" 
                           class="announcement-user-checkbox"
                           style="margin-right: 12px; width: 18px; height: 18px; cursor: pointer;">
                    <div style="flex: 1;">
                        <div style="font-weight: 500; color: var(--text-primary);">${user.username}</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">${user.email}</div>
                    </div>
                    <span class="role-badge ${user.role}" style="font-size: 0.75rem;">${user.role}</span>
                </label>
            `).join('')}
        </div>
    `;
}

// Gérer le changement de cible
handleAnnouncementTargetChange(value) {
    const usersList = document.getElementById('announcement-users-list');
    
    if (value === 'specific') {
        usersList.style.display = 'block';
    } else {
        usersList.style.display = 'none';
        // Décocher toutes les cases
        document.querySelectorAll('.announcement-user-checkbox').forEach(cb => {
            cb.checked = false;
        });
    }
}

// Envoyer l'annonce avec ciblage
async sendAnnouncement() {
    const title = document.getElementById('announcement-title').value.trim();
    const message = document.getElementById('announcement-message').value.trim();
    const type = document.getElementById('announcement-type').value;
    const target = document.getElementById('announcement-target').value;

    if (!title || !message) {
        showToast('error', 'Champs requis', 'Veuillez remplir tous les champs');
        return;
    }

    let targetUsers = 'all';
    
    if (target === 'specific') {
        const selectedUsers = Array.from(document.querySelectorAll('.announcement-user-checkbox:checked'))
            .map(cb => parseInt(cb.value));
        
        if (selectedUsers.length === 0) {
            showToast('error', 'Sélection requise', 'Veuillez sélectionner au moins un utilisateur');
            return;
        }
        
        targetUsers = selectedUsers;
    }

    try {
        showLoading(true);
        const result = await api.sendAnnouncement(title, message, type, targetUsers);
        showToast('success', 'Annonce envoyée', `${result.notificationCount} utilisateur(s) notifié(s)`);
        this.closeAnnouncementModal();
        await this.loadAnnouncements();
    } catch (error) {
        showToast('error', 'Erreur', error.message);
    } finally {
        showLoading(false);
    }
}

async deleteAnnouncement(announcementId) {
    showConfirmModal(
        'Supprimer l\'annonce',
        'Voulez-vous supprimer cette annonce ?',
        async () => {
            try {
                await api.deleteAnnouncement(announcementId);
                showToast('success', 'Supprimée', 'Annonce supprimée');
                await this.loadAnnouncements();
            } catch (error) {
                showToast('error', 'Erreur', error.message);
            }
        }
    );
}

// ========================================
// JOURNAL D'ACTIVITÉ
// ========================================

async loadActivities(filter = null) {
    try {
        console.log('📋 Chargement des activités...'); // Debug
        
        const filterToUse = filter || this.currentActivityFilter;
        const result = await api.getActivities(filterToUse, 50);
        
        console.log('📋 Résultat API activités:', result); // Debug
        
        // ✅ Vérification stricte
        if (!result || !Array.isArray(result.activities)) {
            console.warn('⚠️ Format de réponse invalide:', result);
            this.activities = [];
        } else {
            this.activities = result.activities;
        }
        
        console.log('📋 Activités chargées:', this.activities.length); // Debug
        
        this.renderActivities();
        
    } catch (error) {
        console.error('❌ Erreur chargement activités:', error);
        this.activities = [];
        this.renderActivities();
    }
}

filterActivities(filter) {
    this.currentActivityFilter = filter;
    this.loadActivities(filter);
}

renderActivities() {
    const container = document.getElementById('activities-list');
    if (!container) return;

    if (this.activities.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <p>Aucune activité enregistrée</p>
            </div>
        `;
        return;
    }

    const actionIcons = {
        'user_login': '🔓',
        'user_logout': '🔒',
        'user_register': '✨',
        'file_upload': '⬆️',
        'file_download': '⬇️',
        'file_delete': '🗑️',
        'file_rename': '✏️',
        'folder_create': '📁',
        'share_create': '🔗',
        'share_revoke': '🚫',
        'user_update': '👤',
        'user_delete': '❌'
    };

    container.innerHTML = `
        <table style="width: 100%;">
            <thead>
                <tr style="background: var(--bg-tertiary);">
                    <th style="padding: 12px; text-align: left;">Action</th>
                    <th style="padding: 12px; text-align: left;">Utilisateur</th>
                    <th style="padding: 12px; text-align: left;">Détails</th>
                    <th style="padding: 12px; text-align: left;">IP</th>
                    <th style="padding: 12px; text-align: left;">Date</th>
                </tr>
            </thead>
            <tbody>
                ${this.activities.map(activity => `
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 12px;">
                            <span style="font-size: 1.2rem;">${actionIcons[activity.action] || '📌'}</span>
                            <span style="font-size: 0.85rem; margin-left: 8px;">${this.formatActivityAction(activity.action)}</span>
                        </td>
                        <td style="padding: 12px; font-size: 0.85rem;">${activity.username || 'Système'}</td>
                        <td style="padding: 12px; font-size: 0.85rem;">${activity.details || '-'}</td>
                        <td style="padding: 12px; font-size: 0.75rem;">${activity.ip_address || '-'}</td>
                        <td style="padding: 12px; font-size: 0.75rem;">${formatDate(activity.created_at)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

formatActivityAction(action) {
    const labels = {
        'user_login': 'Connexion',
        'user_logout': 'Déconnexion',
        'user_register': 'Inscription',
        'file_upload': 'Upload fichier',
        'file_download': 'Téléchargement',
        'file_delete': 'Suppression',
        'file_rename': 'Renommage',
        'folder_create': 'Création dossier',
        'share_create': 'Partage créé',
        'share_revoke': 'Partage révoqué',
        'user_update': 'Modif. utilisateur',
        'user_delete': 'Suppr. utilisateur'
    };
    return labels[action] || action;
}
}
// Instance globale
const adminManager = new AdminManager();