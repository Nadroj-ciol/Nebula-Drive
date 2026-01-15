// app.js — Point d'entrée principal (COMPLET)

// ============================================
// ÉTAT GLOBAL DE L'APPLICATION
// ============================================

const AppState = {
    serverStatus: 'checking', // 'checking', 'connected', 'disconnected', 'error'
    serverCheckInterval: null,
    lastServerCheck: null,
    offlineMode: false
};

// ============================================
// VÉRIFICATION DE LA CONNEXION SERVEUR
// ============================================

async function checkServerConnection() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout 5s
        
        const response = await fetch(`${CONFIG.API_URL}/health`, {
            method: 'GET',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            if (AppState.serverStatus !== 'connected') {
                console.log('✅ Serveur connecté');
                AppState.serverStatus = 'connected';
                AppState.offlineMode = false;
                updateServerStatusUI();
                
                // Si on était déconnecté, recharger les données
                if (AppState.lastServerCheck && Date.now() - AppState.lastServerCheck > 30000) {
                    if (auth.isLoggedIn()) {
                        console.log('🔄 Reconnexion détectée, rechargement des données...');
                        refreshAllData();
                    }
                }
            }
        } else {
            throw new Error('Réponse serveur invalide');
        }
        
        AppState.lastServerCheck = Date.now();
    } catch (error) {
        if (AppState.serverStatus !== 'disconnected') {
            console.warn('⚠️ Serveur inaccessible:', error.message);
            AppState.serverStatus = 'disconnected';
            AppState.offlineMode = true;
            updateServerStatusUI();
        }
    }
}

// Démarrer la vérification périodique
function startServerMonitoring() {
    // Vérification initiale
    checkServerConnection();
    
    // Vérification toutes les 10 secondes
    if (!AppState.serverCheckInterval) {
        AppState.serverCheckInterval = setInterval(checkServerConnection, 10000);
    }
}

// Arrêter la vérification
function stopServerMonitoring() {
    if (AppState.serverCheckInterval) {
        clearInterval(AppState.serverCheckInterval);
        AppState.serverCheckInterval = null;
    }
}

// Mettre à jour l'UI du statut serveur
function updateServerStatusUI() {
    const statusIndicator = document.getElementById('server-status-indicator');
    if (!statusIndicator) return;

    const statusConfig = {
        checking: {
            icon: '🔍',
            text: 'Vérification serveur...',
            class: 'status-checking',
            color: '#6b7280'
        },
        connected: {
            icon: '✅',
            text: 'Serveur connecté',
            class: 'status-connected',
            color: '#10b981'
        },
        disconnected: {
            icon: '❌',
            text: 'Serveur hors ligne',
            class: 'status-disconnected',
            color: '#ef4444'
        },
        error: {
            icon: '⚠️',
            text: 'Erreur de connexion',
            class: 'status-error',
            color: '#f59e0b'
        }
    };

    const config = statusConfig[AppState.serverStatus];
    
    statusIndicator.innerHTML = `
        <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem; padding: 4px 12px; border-radius: 6px; background: ${config.color}15; color: ${config.color}; font-weight: 500;">
            <span style="font-size: 1rem;">${config.icon}</span>
            ${config.text}
        </span>
    `;
    
    // Ajouter un message d'aide si déconnecté
    if (AppState.serverStatus === 'disconnected') {
        const helpText = document.getElementById('server-help-text');
        if (helpText) {
            helpText.style.display = 'block';
            helpText.textContent = '🔄 Tentative de reconnexion automatique... Certaines fonctionnalités sont temporairement indisponibles.';
        }
    } else {
        const helpText = document.getElementById('server-help-text');
        if (helpText) {
            helpText.style.display = 'none';
        }
    }
}

// Rafraîchir toutes les données après reconnexion
async function refreshAllData() {
    try {
        // Recharger les fichiers
        if (typeof fileManager !== 'undefined') {
            await fileManager.loadFiles(fileManager.currentFolder);
        }
        
        // Recharger les notifications
        if (typeof notificationManager !== 'undefined') {
            await notificationManager.loadNotifications();
        }
        
        // Recharger les infos utilisateur
        await refreshUserInfo();
        
        showToast('success', 'Reconnexion réussie', 'Vos données ont été actualisées');
    } catch (error) {
        console.error('Erreur lors du rafraîchissement:', error);
    }
}

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation de Nebula Drive...');

    // Détecter le thème
    initTheme();
    
    //Démarrer la surveillance du serveur
    startServerMonitoring();

    // Charger la session depuis sessionStorage
    auth.loadSession();
    
    // Vérifier l'authentification
    // Vérifier l'authentification
const isLoggedIn = auth.isLoggedIn();

console.log('Session chargée:', { isLoggedIn, user: auth.getUser() });

// Si sur la page de login
if (window.location.pathname.includes('login.html')) {
    if (isLoggedIn) {
        // Afficher l'avertissement de session existante
        const warning = document.getElementById('existing-session-warning');
        const userSpan = document.getElementById('current-session-user');
        if (warning && userSpan) {
            userSpan.textContent = auth.getUser().username;
            warning.style.display = 'block';
        }
        // NE PAS rediriger automatiquement
        return;
    }
} else {
    // Sur les autres pages, rediriger vers login si pas connecté
    if (!isLoggedIn) {
        console.log('Redirection vers login.html');
        window.location.href = 'login.html';
        return;
    }
}
    
    // Initialiser l'application
    if (document.getElementById('files-container')) {
        initApp();
    }
    
    // Initialiser la page login
    if (document.getElementById('login-form') || document.getElementById('register-form')) {
        initLoginPage();
    }
    
    // Initialiser la page admin
    if (document.getElementById('admin-stats')) {
        initAdminPage();
    }
});

// Cleanup au déchargement
window.addEventListener('beforeunload', () => {
    console.log('🛑 Arrêt de Nebula-Drive APPlication');
    stopServerMonitoring();
    if (typeof notificationManager !== 'undefined') {
        notificationManager.stopPolling();
    }
});

// ============================================
// THÈME
// ============================================

function initTheme() {
    // Vérifier la préférence système
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    // Écouter les changements
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    });
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
}

// ============================================
// APPLICATION PRINCIPALE
// ============================================

async function initApp() {
     console.log('📱 Initialisation de l\'interface principale...');

    // Afficher les infos utilisateur
    updateUserDisplay();
    updateStorageDisplay();
    
    // Charger les fichiers
    await fileManager.loadFiles();
    
    // Démarrer le polling des notifications
    notificationManager.startPolling();
    
    // Initialiser les événements
    initEventListeners();
    // Démarrer l'onboarding si première visite
    setTimeout(() => {
        if (typeof onboardingManager !== 'undefined' && 
            !onboardingManager.hasCompletedOnboarding()) {
            onboardingManager.start();
        }
    }, 1500);
}

function updateUserDisplay() {
    const user = auth.getUser();
    if (!user) return;
    
    const avatar = document.getElementById('user-avatar');
    const name = document.getElementById('user-name');
    const role = document.getElementById('user-role');
    
    if (avatar) avatar.textContent = user.username.charAt(0).toUpperCase();
    if (name) name.textContent = user.username;
    if (role) role.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    
    // Afficher le lien admin si admin
    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        adminLink.style.display = auth.isAdmin() ? 'flex' : 'none';
    }
}

function updateStorageDisplay() {
    const user = auth.getUser();
    if (!user) return;
    
    const used = user.storage_used || 0;
    const quota = user.storage_quota || 104857600;
    const percentage = Math.min((used / quota) * 100, 100);
    
    const label = document.getElementById('storage-label');
    const bar = document.getElementById('storage-bar-fill');
    
    if (label) label.textContent = `${formatSize(used)} / ${formatSize(quota)}`;
    if (bar) bar.style.width = `${percentage}%`;
}

// ============================================
// ÉVÉNEMENTS
// ============================================

function initEventListeners() {
    console.log('🎯 Initialisation des événements...');

    // Sidebar toggle (mobile)
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
    
    // Recherche
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                fileManager.search(e.target.value);
            }, 300);
        });
        
        // Effacer avec Escape
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                fileManager.loadFiles(fileManager.currentFolder);
            }
        });
    }
    
    // View toggle
    document.querySelectorAll('.view-toggle button').forEach(btn => {
        btn.addEventListener('click', () => {
            fileManager.setViewMode(btn.dataset.view);
        });
    });
    
    // User dropdown
    const userMenu = document.getElementById('user-menu');
    const userDropdown = document.getElementById('user-dropdown');
    
    if (userMenu && userDropdown) {
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });
        
        document.addEventListener('click', () => {
            userDropdown.classList.remove('active');
        });
    }
    
    // Notifications
    const notifBtn = document.getElementById('notifications-btn');
    if (notifBtn) {
        notifBtn.addEventListener('click', () => {
            notificationManager.togglePanel();
        });
    }
    
    // Fermer le panel notifications
    const closeNotifPanel = document.getElementById('close-notifications');
    if (closeNotifPanel) {
        closeNotifPanel.addEventListener('click', () => {
            document.getElementById('notifications-panel').classList.remove('active');
        });
    }
    
    // Fermer les modals avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Fermer les modals en cliquant sur l'overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });
    
    // Upload zone
    initUploadZone();
}

// ============================================
// UPLOAD
// ============================================

function initUploadZone() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    
    if (!uploadZone || !fileInput) return;
    
    // Click pour ouvrir le sélecteur
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Drag & drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleUpload(files);
        }
    });
    
    // Input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleUpload(e.target.files);
            // Reset input pour permettre de re-sélectionner le même fichier
            e.target.value = '';
        }
    });
    
    // Drag & drop global (sur toute la page)
    document.body.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    document.body.addEventListener('drop', (e) => {
        e.preventDefault();
        // Si on drop sur le body (pas sur une zone spécifique)
        if (!e.target.closest('#upload-zone')) {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleUpload(files);
            }
        }
    });
}

async function handleUpload(files) {
    // Vérifier la connexion serveur
    if (AppState.serverStatus !== 'connected') {
        showToast('error', 'Upload impossible', 'Le serveur est actuellement hors ligne. Veuillez réessayer dans quelques instants.');
        return;
    }

    closeModal('upload-modal');
    await fileManager.uploadFiles(Array.from(files));
}

// ============================================
// MODALS
// ============================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => {
        modal.classList.remove('active');
    });
    document.getElementById('notifications-panel')?.classList.remove('active');
    hideContextMenu();
}

// Modal Upload
function openUploadModal() {
    if (AppState.serverStatus !== 'connected') {
        showToast('warning', 'Serveur hors ligne', 'Impossible d\'uploader des fichiers pour le moment. Le serveur est inaccessible.');
        return;
    }

    openModal('upload-modal');
}

// Modal Nouveau dossier
function openNewFolderModal() {
    if (AppState.serverStatus !== 'connected') {
        showToast('warning', 'Serveur hors ligne', 'Impossible de créer un dossier pour le moment.');
        return;
    }

    document.getElementById('new-folder-name').value = '';
    openModal('new-folder-modal');
}

function createNewFolder() {
    const name = document.getElementById('new-folder-name').value.trim();
    if (!name) {
        showToast('error', 'Champ requis', 'Veuillez entrer un nom de dossier');
        return;
    }
     if (AppState.serverStatus !== 'connected') {
        showToast('error', 'Serveur hors ligne', 'Impossible de créer le dossier maintenant.');
        return;
    }

    closeModal('new-folder-modal');
    fileManager.createFolder(name);
}

// Modal Renommer
function openRenameModal(fileId) {
    const file = fileManager.files.find(f => f.id === fileId);
    if (!file) return;
    
    if (AppState.serverStatus !== 'connected') {
        showToast('warning', 'Serveur hors ligne', 'Impossible de renommer pour le moment.');
        return;
    }

    document.getElementById('rename-file-id').value = fileId;
    document.getElementById('rename-input').value = file.original_name;
    openModal('rename-modal');
    
    // Focus et sélectionner le nom sans extension
    const input = document.getElementById('rename-input');
    input.focus();
    const lastDot = file.original_name.lastIndexOf('.');
    if (lastDot > 0 && !file.is_folder) {
        input.setSelectionRange(0, lastDot);
    } else {
        input.select();
    }
}

function renameFile() {
    const fileId = document.getElementById('rename-file-id').value;
    const newName = document.getElementById('rename-input').value.trim();
    
    if (!newName) {
        showToast('error', 'Erreur', 'Veuillez entrer un nom');
        return;
    }

     if (AppState.serverStatus !== 'connected') {
        showToast('error', 'Serveur hors ligne', 'Impossible de renommer maintenant.');
        return;
    }

    closeModal('rename-modal');
    fileManager.renameFile(parseInt(fileId), newName);
}

// Modal Déplacer
async function openMoveModal(fileId) {
     if (AppState.serverStatus !== 'connected') {
        showToast('warning', 'Serveur hors ligne', 'Impossible de déplacer pour le moment.');
        return;
    }
    document.getElementById('move-file-id').value = fileId;
    
    // Charger les dossiers disponibles
    try {
        const result = await api.getFiles(null);
        const folders = result.files.filter(f => f.is_folder && f.id !== fileId);
        
        const select = document.getElementById('move-target');
        select.innerHTML = '<option value="root">/ (Racine)</option>';
        
        folders.forEach(folder => {
            select.innerHTML += `<option value="${folder.id}">${folder.original_name}</option>`;
        });
        
        openModal('move-modal');
    } catch (error) {
        showToast('error', 'Erreur', error.message);
    }
}

function moveFile() {
    const fileId = document.getElementById('move-file-id').value;
    const targetId = document.getElementById('move-target').value;
    
      if (AppState.serverStatus !== 'connected') {
        showToast('error', 'Serveur hors ligne', 'Impossible de déplacer maintenant.');
        return;
    }

    closeModal('move-modal');
    fileManager.moveFile(parseInt(fileId), targetId === 'root' ? null : parseInt(targetId));
}

// ============================================
// TOASTS & CONFIRMATIONS
// ============================================

function showToast(type, title, message, duration = 5000) {
    const container = document.getElementById('toast-container') || createToastContainer();
    
    const icons = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
        warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;
    
    modal.querySelector('.modal-title').textContent = title;
    modal.querySelector('.confirm-message').textContent = message;
    
    // Stocker le callback
    modal.dataset.callback = 'pending';
    modal.onConfirm = onConfirm;
    
    openModal('confirm-modal');
}

function confirmAction() {
    const modal = document.getElementById('confirm-modal');
    if (modal && modal.onConfirm) {
        modal.onConfirm();
    }
    closeModal('confirm-modal');
}

// ============================================
// LOADING
// ============================================

function showLoading(show) {
    let loader = document.getElementById('loading-overlay'); // CORRECTION: Changé 'overlay' en 'loading-overlay'
    
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'loading-overlay';
            loader.className = 'loading-overlay';
            loader.innerHTML = '<div class="loading-spinner"></div>';
            document.body.appendChild(loader); // CORRECTION: Ajout de .appendChild(loader)
        }
        loader.style.display = 'flex';
    } else if (loader) { // CORRECTION: Ajout de 'if' avant (loader)
        loader.style.display = 'none'; // CORRECTION: Ajout du point-virgule et guillemet fermant
    }
}

// ============================================
// LOGIN
// ============================================

function initLoginPage() {
    console.log('🔐 Initialisation de la page de connexion...');

    // Basculer entre login et register
    const tabs = document.querySelectorAll('.login-tab');
    const forms = document.querySelectorAll('.login-form');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(f => f.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`${target}-form`).classList.add('active');
        });
    });
    
    // Form login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const identifier = document.getElementById('login-identifier').value;
            const password = document.getElementById('login-password').value;
            const errorDiv = document.getElementById('login-error');
            
            try {
                errorDiv.style.display = 'none';

                 // Vérifier la connexion serveur
                if (AppState.serverStatus !== 'connected') {
                    throw new Error('❌ Impossible de se connecter : le serveur est actuellement hors ligne. Veuillez patienter quelques instants...');
                }

                // CORRECTION: Afficher un indicateur de chargement
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="loading-spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>';
                
                await auth.login(identifier, password);
                
                // CORRECTION: Afficher un toast de succès
                showToast('success', 'Connexion réussie', 'Redirection en cours...');
                
                // Attendre un peu avant de rediriger
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 500);
                
            } catch (error) {
                // CORRECTION: Restaurer le bouton
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Se connecter';
                
                // Afficher l'erreur
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
                
                // CORRECTION: Aussi afficher un toast
                showToast('error', 'Erreur de connexion', error.message);
            }
        });
    }
    
    // Form register
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('register-username').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm').value;
            const errorDiv = document.getElementById('register-error');
            const successDiv = document.getElementById('register-success');
            
            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';
            
            if (password !== confirmPassword) {
                errorDiv.textContent = 'Les mots de passe ne correspondent pas.';
                errorDiv.style.display = 'block';
                showToast('error', 'Erreur', 'Les mots de passe ne correspondent pas');
                return;
            }
            
            try {
                // Vérifier la connexion serveur
                if (AppState.serverStatus !== 'connected') {
                    throw new Error('Service d\'inscription temporairement indisponible (serveur hors ligne).');
                }

                // CORRECTION: Afficher un indicateur de chargement
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="loading-spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>';
                
                await auth.register(username, email, password);
                
                // CORRECTION: Restaurer le bouton
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                
                successDiv.textContent = 'Inscription réussie ! Vous pouvez maintenant vous connecter.';
                successDiv.style.display = 'block';
                
                // CORRECTION: Toast de succès
                showToast('success', '✅Inscription réussie', 'Vous pouvez maintenant vous connecter');
                
                // Passer à l'onglet login
                setTimeout(() => {
                    document.querySelector('[data-tab="login"]').click();
                    document.getElementById('login-identifier').value = username;
                }, 1500);
                
            } catch (error) {
                // CORRECTION: Restaurer le bouton
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'S\'inscrire';
                
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
                
                // CORRECTION: Toast d'erreur
                showToast('error', 'Erreur d\'inscription', error.message);
            }
        });
    }
}

// ============================================
// PAGE ADMIN
// ============================================

async function initAdminPage() {
     console.log('👨‍💼 Initialisation de la page admin...');
    if (!auth.isAdmin()) {
        window.location.href = 'index.html';
        return;
    }
    
    updateUserDisplay();
    await adminManager.loadStats(); // CORRECTION: Ajout de 'await' avant adminManager
}

// ============================================
// LOGOUT
// ============================================

function logout() {
    if (typeof notificationManager != 'undefined'){
        notificationManager.stopPolling(); // CORRECTION: Ajout de 'notificationManager.stop'
        }
        stopServerMonitoring();
        auth.logout();
        window.location.href = 'login.html'; // CORRECTION: Ajout de la redirection vers login.html
}

// ============================================
// REFRESH USER INFO
// ============================================

async function refreshUserInfo() {
    if (AppState.serverStatus !== 'connected') {
        console.warn('⚠️ Impossible de rafraîchir les infos utilisateur (serveur hors ligne)');
        return;
    }
    
    try {
        const data = await api.getMe();
        currentUser = data.user;
        auth.updateUser(data.user);
        updateUserDisplay();
        updateStorageDisplay();
    } catch (err) {
        console.error('Erreur refresh user info:', err);
    }
}
// ============================================
// DÉCONNEXION FORCÉE
// ============================================

function forceLogout() {
    // Effacer la session
    sessionStorage.clear();
    
    // Réinitialiser auth
    auth.clearSession();
    
    // Masquer l'avertissement
    const warning = document.getElementById('existing-session-warning');
    if (warning) {
        warning.style.display = 'none';
    }
    
    showToast('success', 'Déconnexion réussie', 'Vous pouvez maintenant vous connecter avec un autre compte');
}

//nouveau code pour la gestion des emails

const emailService = require('./emailService'); // Route d'inscription (modifiée) 
app.post('/api/auth/register', 
    async (req, res) => { 
        try { 
            const { username, email, password } = req.body; // ... votre logique d'inscription existante ... 
            
            // ✅ NOUVEAU : Envoyer l'email de bienvenue 
            await emailService.sendWelcomeEmail(email, username); 
            res.json({ 
                success: true, message: 'Inscription réussie. Un email de bienvenue vous a été envoyé.' 
            });
         } catch (error) { 
            console.error(error); 
            res.status(500).json({ error: error.message });
         } 
        }); // ✅ NOUVEAU : Route de demande de réinitialisation 
        app.post('/api/auth/forgot-password', async (req, res) => { 
            try { 
                const { email } = req.body; // Chercher l'utilisateur 
                const user = await getUserByEmail(email); if (!user) { 
                    return res.status(404).json({ 
                        error: 'Utilisateur non trouvé' 
                    });
                 } 
                 // Générer un token de réinitialisation 
                 const resetToken = crypto.randomBytes(32).toString('hex'); 
                 const resetTokenExpiry = Date.now() + 3600000; // 1 heure 
                 // Sauvegarder le token dans la base de données 
                 await saveResetToken(user.id, resetToken, resetTokenExpiry); // Envoyer l'email 
                 await emailService.sendPasswordResetEmail( user.email, user.username, resetToken ); 
                 res.json({ success: true, message: 'Email de réinitialisation envoyé' 

                 }); 
                } catch (error) { console.error(error); 
                    res.status(500).json({ 
                        error: 'Erreur serveur' 
                    });
                 } 
                }); 
                // ✅ NOUVEAU : Route de réinitialisation effective 
                app.post('/api/auth/reset-password', async (req, res) => { 
                    try { const { token, newPassword } = req.body; // Vérifier le token 
                    const userId = await verifyResetToken(token); 
                    if (!userId) { return res.status(400).json({ 
                        error: 'Token invalide ou expiré' 
                    });
                 } // Hasher le nouveau mot de passe 
                 const hashedPassword = await bcrypt.hash(newPassword, 10); // Mettre à jour le mot de passe 
                 await updateUserPassword(userId, hashedPassword); // Supprimer le token 
                 await deleteResetToken(userId); 
                 res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' 

                 }); 
                } catch (error) { 
                    console.error(error); 
                    res.status(500).json({ 
                        error: 'Erreur serveur' 
                    }); 
                } 
            });