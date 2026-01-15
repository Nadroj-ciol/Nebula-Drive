// notifications.js — Gestion des notifications

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.pollingInterval = null;
        this.isPolling = false;
    }

 // ========================================
    // CHARGEMENT DES NOTIFICATIONS
    // ========================================
    
    async loadNotifications() {
        try {
            console.log('📥 Chargement des notifications...'); // Debug
            
            const result = await api.getNotifications();
            
            // ✅ VALIDATION STRICTE
            if (!result || typeof result !== 'object') {
                console.error('❌ Réponse API invalide:', result);
                throw new Error('Réponse API invalide');
            }

            // ✅ Vérifier que notifications est un tableau
            if (!Array.isArray(result.notifications)) {
                console.warn('⚠️ Format de notifications invalide:', result);
                this.notifications = [];
            } else {
                // ✅ Filtrer les notifications valides
                this.notifications = result.notifications.filter(notif => {
                    if (!notif || typeof notif !== 'object') {
                        console.warn('⚠️ Notification invalide (pas un objet):', notif);
                        return false;
                    }
                    if (!notif.id) {
                        console.warn('⚠️ Notification sans ID:', notif);
                        return false;
                    }
                    // ✅ Ajouter des valeurs par défaut pour les champs manquants
                    notif.title = notif.title || 'Notification';
                    notif.message = notif.message || '';
                    notif.type = notif.type || 'info';
                    notif.is_read = notif.is_read || 0;
                    notif.created_at = notif.created_at || new Date().toISOString();
                    return true;
                });
            }

            // Mettre à jour le compteur
            this.unreadCount = result.unreadCount || this.notifications.filter(n => !n.is_read).length;
            
            console.log('✅ Notifications chargées:', this.notifications.length, '| Non lues:', this.unreadCount);
            
            this.renderNotifications();
            this.updateBadge();
            
            return result;
        } catch (error) {
            console.error('❌ Erreur chargement notifications:', error);
            
            // ✅ NE PAS afficher de toast si c'est juste une erreur réseau
            if (error.message !== 'Failed to fetch' && error.message !== 'Impossible de contacter le serveur') {
                showToast('error', 'Erreur', 'Impossible de charger les notifications');
            }
            
            // En cas d'erreur, réinitialiser proprement
            this.notifications = [];
            this.unreadCount = 0;
            this.renderNotifications();
            this.updateBadge();
            
            throw error;
        }
    }

 // ========================================
// RENDU DES NOTIFICATIONS
// ========================================

renderNotifications() {
    const container = document.getElementById('notifications-list');
    
    if (!container) {
        console.warn('⚠️ Container notifications-list non trouvé');
        return;
    }

    // État vide
    if (!this.notifications || this.notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 60px 20px; text-align: center;">
                <div class="empty-icon" style="margin: 0 auto 20px;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.3;">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                </div>
                <h3 class="empty-title" style="font-size: 1.1rem; color: var(--text-primary); margin-bottom: 8px;">Aucune notification</h3>
                <p class="empty-text" style="color: var(--text-muted);">Vous n'avez aucune notification pour le moment</p>
            </div>
        `;
        return;
    }

    // ✅ Rendu des notifications
    const notificationsHTML = this.notifications.map(notif => {
        try {
            if (!notif || !notif.id) {
                console.warn('⚠️ Notification sans ID ignorée:', notif);
                return '';
            }

            const iconData = this.getNotifIcon(notif.type || 'info');
            const title = this.escapeHtml(notif.title || 'Notification');
            const message = this.escapeHtml(notif.message || '');
            const time = this.formatTime(notif.created_at);
            const isUnread = !notif.is_read;
            
            return `
                <div class="notification-item ${isUnread ? 'unread' : ''}" 
                     data-id="${notif.id}"
                     onclick="notificationManager.markAsRead(${notif.id})"
                     style="cursor: pointer;">
                    <div class="notification-icon ${iconData.class}">
                        ${iconData.svg}
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${title}</div>
                        <div class="notification-message">${message}</div>
                        <div class="notification-time">${time}</div>
                    </div>
                    ${isUnread ? `
                        <button class="notification-close" 
                                onclick="event.stopPropagation(); notificationManager.markAsRead(${notif.id})"
                                title="Marquer comme lu">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            `;
        } catch (err) {
            console.error('❌ Erreur rendu notification:', notif, err);
            return '';
        }
    }).filter(Boolean).join('');

    container.innerHTML = notificationsHTML || `
        <div class="empty-state" style="padding: 40px 20px; text-align: center;">
            <p style="color: var(--text-muted);">Erreur d'affichage des notifications</p>
        </div>
    `;
}

// ========================================
// ACTIONS SUR LES NOTIFICATIONS
// ========================================

async markAsRead(notificationId) {
    try {
        if (!notificationId || isNaN(parseInt(notificationId))) {
            console.error('❌ ID de notification invalide:', notificationId);
            return;
        }

        const id = parseInt(notificationId);

        // Appel API
        await api.markNotificationRead(id);

        // Mettre à jour localement
        const notif = this.notifications.find(n => n && n.id === id);
        if (notif && !notif.is_read) {
            notif.is_read = 1;
            this.unreadCount = Math.max(0, this.unreadCount - 1);
            this.renderNotifications();
            this.updateBadge();
        }

    } catch (error) {
        console.error('❌ Erreur marquage notification:', error);
    }
}

async markAllAsRead() {
    try {
        if (!this.notifications || this.notifications.length === 0) {
            showToast('info', 'Information', 'Aucune notification');
            return;
        }

        const unreadNotifs = this.notifications.filter(n => {
            return n && typeof n === 'object' && n.id && !n.is_read;
        });
        
        if (unreadNotifs.length === 0) {
            showToast('info', 'Information', 'Toutes les notifications sont déjà lues');
            return;
        }

        showLoading(true);

        // Appel API
        await api.markAllNotificationsRead();

        // Mettre à jour localement
        if (Array.isArray(this.notifications)) {
            this.notifications = this.notifications.map(notif => {
                if (notif && typeof notif === 'object' && notif.id) {
                    return { ...notif, is_read: 1 };
                }
                return notif;
            }).filter(notif => notif && notif.id);
        }
        
        this.unreadCount = 0;
        this.renderNotifications();
        this.updateBadge();

        showToast('success', 'Succès', 'Toutes les notifications marquées comme lues');

    } catch (error) {
        console.error('❌ Erreur markAllAsRead:', error);
        showToast('error', 'Erreur', 'Impossible de marquer les notifications comme lues');
    } finally {
        showLoading(false);
    }
}

// ========================================
// BADGE DE COMPTEUR
// ========================================

updateBadge() {
    const badge = document.getElementById('notification-badge');
    if (badge) {
        if (this.unreadCount > 0) {
            badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// ========================================
// PANEL NOTIFICATIONS
// ========================================

async togglePanel() {
    const panel = document.getElementById('notifications-panel');
    if (!panel) return;

    const isActive = panel.classList.contains('active');
    
    if (!isActive) {
        await this.loadNotifications();
        panel.classList.add('active');
    } else {
        panel.classList.remove('active');
    }
}

// ========================================
// POLLING
// ========================================

startPolling() {
    if (this.isPolling) {
        console.log('⚠️ Polling déjà actif');
        return;
    }
    
    this.isPolling = true;
    console.log('✅ Démarrage du polling des notifications');
    
    this.loadNotifications().catch(err => {
        console.error('❌ Erreur polling initial:', err);
    });
    
    this.pollInterval = setInterval(() => {
        this.loadNotifications().catch(err => {
            console.error('❌ Erreur polling:', err);
        });
    }, 30000);
}

stopPolling() {
    if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
        console.log('🛑 Arrêt du polling des notifications');
    }
    this.isPolling = false;
}

// ========================================
// UTILITAIRES
// ========================================

getNotifIcon(type) {
    const icons = {
        'upload_complete': {
            class: 'upload',
            svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        },
        'file_shared': {
            class: 'share',
            svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>'
        },
        'permission_changed': {
            class: 'warning',
            svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
        },
        'share_revoked': {
            class: 'error',
            svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
        },
        'announcement': {
            class: 'share',
            svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>'
        },
        'info': {
            class: 'share',
            svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        }
    };

    return icons[type] || icons['info'];
}

formatTime(dateStr) {
    if (!dateStr) return 'Date inconnue';
    
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return 'Date invalide';
        }
        
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return "À l'instant";
        if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
        if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`;
        if (diff < 604800000) return `Il y a ${Math.floor(diff / 86400000)} j`;
        
        return date.toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    } catch (error) {
        console.error('❌ Erreur formatTime:', error);
        return 'Date invalide';
    }
}

escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}
    // Marquer comme lue
    async markAsRead(notificationId) {
        try {
            await api.markNotificationRead(notificationId);
            
            // Mettre à jour localement
            const notif = this.notifications.find(n => n.id === notificationId);
            if (notif && !notif.is_read) {
                notif.is_read = 1;
                this.unreadCount = Math.max(0, this.unreadCount - 1);
                this.updateBadge();
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Erreur marquage notification:', error);
        }
    }

    

    // Supprimer une notification
    async deleteNotification(notificationId) {
        try {
            await api.deleteNotification(notificationId);
            
            // Retirer de la liste locale
            const index = this.notifications.findIndex(n => n.id === notificationId);
            if (index !== -1) {
                const wasUnread = !this.notifications[index].is_read;
                this.notifications.splice(index, 1);
                
                if (wasUnread) {
                    this.unreadCount = Math.max(0, this.unreadCount - 1);
                    this.updateBadge();
                }
                
                this.renderNotifications();
            }
        } catch (error) {
            showToast('error', 'Erreur', error.message);
        }
    }
}

// Instance globale
const notificationManager = new NotificationManager();