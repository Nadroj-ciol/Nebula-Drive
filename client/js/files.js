// files.js — Gestion des fichiers et dossiers (COMPLET)

class FileManager {
    constructor() {
        this.currentFolder = null;
        this.files = [];
        this.breadcrumb = [];
        this.selectedFiles = new Set();
        this.viewMode = 'grid'; // 'grid' ou 'list'
        this.sortBy = 'name'; // 'name', 'date', 'size'
        this.sortOrder = 'asc';
    }

    // Charger les fichiers
    async loadFiles(folderId = null) {
        try {
            showLoading(true);
            this.currentFolder = folderId;
            const result = await api.getFiles(folderId);
            
            this.files = result.files || [];
            this.breadcrumb = result.breadcrumb || [];
            
            this.sortFiles();
            this.renderFiles();
            this.renderBreadcrumb();
            this.updateNavActive('my-files');
            
            return this.files;
        } catch (error) {
            showToast('error', 'Erreur', error.message);
            throw error;
        } finally {
            showLoading(false);
        }
    }

    // Charger les fichiers partagés avec moi
    async loadSharedFiles() {
        try {
            showLoading(true);
            const result = await api.getSharedFiles();
            this.files = result.files || [];
            this.breadcrumb = [];
            this.currentFolder = null;
            
            this.renderFiles(true); // true = mode partagé
            this.renderBreadcrumb(true);
            this.updateNavActive('shared-with-me');
            
            return this.files;
        } catch (error) {
            showToast('error', 'Erreur', error.message);
            throw error;
        } finally {
            showLoading(false);
        }
    }

    // Charger mes partages (fichiers que j'ai partagés)
    async loadMyShares() {
        try {
            showLoading(true);
            const result = await api.getMyShares();
            const shares = result.shares || [];
            
            // Transformer en format fichier pour l'affichage
            this.files = shares.map(s => ({
                id: s.file_id,
                original_name: s.original_name,
                is_folder: s.is_folder,
                shared_with: s.shared_with,
                permission: s.permission,
                share_id: s.id,
                created_at: s.created_at
            }));
            
            this.breadcrumb = [];
            this.currentFolder = null;
            
            this.renderMyShares();
            this.updateNavActive('my-shares');
            
        } catch (error) {
            showToast('error', 'Erreur', error.message);
        } finally {
            showLoading(false);
        }
    }

    // Mettre à jour la navigation active
    updateNavActive(activeId) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeItem = document.getElementById(activeId);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    // Ouvrir le modal de partage multiple
openBulkShareModal() {
    if (this.selectedFiles.size === 0) {
        showToast('info', 'Sélection requise', 'Veuillez sélectionner au moins un fichier');
        return;
    }

    const selectedFileNames = Array.from(this.selectedFiles)
        .map(id => this.files.find(f => f.id === id)?.original_name)
        .filter(Boolean);

    // Mettre à jour le titre
    const modalTitle = document.querySelector('#bulk-share-modal .modal-title');
    if (modalTitle) {
        modalTitle.textContent = `Partager ${selectedFileNames.length} fichier(s)`;
    }

    // Afficher la liste des fichiers sélectionnés
    const filesList = document.getElementById('bulk-share-files-list');
    if (filesList) {
        filesList.innerHTML = `
            <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px; max-height: 150px; overflow-y: auto;">
                ${selectedFileNames.map(name => `
                    <div style="padding: 4px 0; font-size: 0.9rem;">
                        <span style="color: var(--accent-primary);">📄</span> ${name}
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Réinitialiser le champ utilisateurs
    document.getElementById('bulk-share-users').value = '';
    document.getElementById('bulk-share-permission').value = 'read';

    openModal('bulk-share-modal');
}

// Partager en masse
async bulkShare() {
    const usersInput = document.getElementById('bulk-share-users').value.trim();
    const permission = document.getElementById('bulk-share-permission').value;

    if (!usersInput) {
        showToast('error', 'Champ requis', 'Veuillez entrer au moins un nom d\'utilisateur');
        return;
    }

    // Séparer les noms d'utilisateurs (virgule, espace, point-virgule)
    const usernames = usersInput
        .split(/[,;\s]+/)
        .map(u => u.trim())
        .filter(u => u.length > 0);

    if (usernames.length === 0) {
        showToast('error', 'Format invalide', 'Aucun nom d\'utilisateur valide trouvé');
        return;
    }

    const fileIds = Array.from(this.selectedFiles);

    try {
        showLoading(true);
        
        const result = await api.bulkShareFiles(fileIds, usernames, permission);
        
        if (result.results.failed.length > 0) {
            console.warn('Échecs:', result.results.failed);
        }

        showToast(
            'success',
            'Partage réussi',
            `${result.results.totalShares} partage(s) créé(s) avec succès`
        );

        closeModal('bulk-share-modal');
        this.clearSelection();

    } catch (error) {
        showToast('error', 'Erreur', error.message);
    } finally {
        showLoading(false);
    }
}

    // Trier les fichiers
    sortFiles() {
        this.files.sort((a, b) => {
            // Dossiers en premier
            if (a.is_folder && !b.is_folder) return -1;
            if (!a.is_folder && b.is_folder) return 1;
            
            let comparison = 0;
            
            switch (this.sortBy) {
                case 'name':
                    comparison = a.original_name.localeCompare(b.original_name);
                    break;
                case 'date':
                    comparison = new Date(b.created_at) - new Date(a.created_at);
                    break;
                case 'size':
                    comparison = (b.size || 0) - (a.size || 0);
                    break;
            }
            
            return this.sortOrder === 'asc' ? comparison : -comparison;
        });
    }

    // Changer le tri
    setSorting(sortBy, sortOrder = null) {
        if (this.sortBy === sortBy && sortOrder === null) {
            // Inverser l'ordre si même colonne
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortBy = sortBy;
            this.sortOrder = sortOrder || 'asc';
        }
        
        this.sortFiles();
        this.renderFiles();
    }

    // Rendu des fichiers
    renderFiles(isSharedView = false) {
        const container = document.getElementById('files-container');
        if (!container) return;

        if (this.files.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <h3 class="empty-title">${isSharedView ? 'Aucun fichier partagé' : 'Aucun fichier'}</h3>
                    <p class="empty-text">${isSharedView ? 'Personne n\'a partagé de fichier avec vous.' : 'Ce dossier est vide. Uploadez des fichiers ou créez un dossier.'}</p>
                    ${!isSharedView ? `
                        <button class="btn btn-primary" onclick="openUploadModal()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            Upload
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }

        if (this.viewMode === 'grid') {
            this.renderGridView(container, isSharedView);
        } else {
            this.renderListView(container, isSharedView);
        }
    }

    // Rendu de mes partages
    renderMyShares() {
        const container = document.getElementById('files-container');
        if (!container) return;

        // Mettre à jour le breadcrumb
        const breadcrumbContainer = document.getElementById('breadcrumb');
        if (breadcrumbContainer) {
            breadcrumbContainer.innerHTML = '<span class="breadcrumb-current">Mes partages</span>';
        }

        if (this.files.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                    </div>
                    <h3 class="empty-title">Aucun partage</h3>
                    <p class="empty-text">Vous n'avez partagé aucun fichier.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="files-list">
                ${this.files.map(file => `
                    <div class="file-row" data-id="${file.id}">
                        <div class="file-row-icon ${file.is_folder ? 'folder' : getFileType(file.original_name)}">
                            ${this.getFileIcon(file.is_folder ? 'folder' : getFileType(file.original_name))}
                        </div>
                        <div class="file-row-info">
                            <div class="file-row-name">${file.original_name}</div>
                            <div class="file-row-path">Partagé avec ${file.shared_with} (${file.permission === 'write' ? 'lecture/écriture' : 'lecture seule'})</div>
                        </div>
                        <div class="file-row-date">${formatDate(file.created_at)}</div>
                        <div class="file-row-actions">
                            <button class="btn btn-icon btn-sm btn-secondary" onclick="openShareModal(${file.id})" title="Gérer le partage">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                </svg>
                            </button>
                            <button class="btn btn-icon btn-sm btn-danger" onclick="shareManager.revokeShare(${file.share_id})" title="Révoquer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="15" y1="9" x2="9" y2="15"></line>
                                    <line x1="9" y1="9" x2="15" y2="15"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Vue grille
    renderGridView(container, isSharedView = false) {
        container.innerHTML = `
            <div class="files-grid">
                ${this.files.map(file => this.renderFileCard(file, isSharedView)).join('')}
            </div>
        `;
    }

    // Vue liste
    renderListView(container, isSharedView = false) {
        container.innerHTML = `
            <div class="files-list">
                <div class="file-row file-row-header">
                    <div style="width: 52px;"></div>
                    <div class="file-row-info" onclick="fileManager.setSorting('name')" style="cursor: pointer;">
                        Nom ${this.sortBy === 'name' ? (this.sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </div>
                    <div class="file-row-size" onclick="fileManager.setSorting('size')" style="cursor: pointer;">
                        Taille ${this.sortBy === 'size' ? (this.sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </div>
                    <div class="file-row-date" onclick="fileManager.setSorting('date')" style="cursor: pointer;">
                        Date ${this.sortBy === 'date' ? (this.sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </div>
                    <div style="width: 100px;"></div>
                </div>
                ${this.files.map(file => this.renderFileRow(file, isSharedView)).join('')}
            </div>
        `;
    }

    // Carte fichier (grille)
    renderFileCard(file, isSharedView = false) {
        const fileType = file.is_folder ? 'folder' : getFileType(file.original_name);
        const isSelected = this.selectedFiles.has(file.id);
        const isOwner = !isSharedView || file.owner_id === auth.getUser()?.id;
        
        return `
            <div class="file-card ${isSelected ? 'selected' : ''}" 
                 data-id="${file.id}" 
                 data-folder="${file.is_folder ? '1' : '0'}"
                 onclick="fileManager.handleFileClick(event, ${file.id})"
                 ondblclick="fileManager.handleFileDoubleClick(${file.id}, ${isSharedView})"
                 oncontextmenu="fileManager.handleContextMenu(event, ${file.id}, ${isSharedView})">
                
                <input type="checkbox" class="file-checkbox" 
                       ${isSelected ? 'checked' : ''}
                       onclick="event.stopPropagation(); fileManager.toggleSelection(${file.id})">
                
                <div class="file-actions">
                    <button class="file-action-btn" onclick="event.stopPropagation(); fileManager.showFileMenu(event, ${file.id}, ${isSharedView})">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="19" cy="12" r="1"></circle>
                            <circle cx="5" cy="12" r="1"></circle>
                        </svg>
                    </button>
                </div>
                
                <div class="file-icon ${fileType}">
                    ${this.getFileIcon(fileType)}
                </div>
                
                <div class="file-name" title="${file.original_name}">${file.original_name}</div>
                <div class="file-meta">
                    ${file.is_folder ? '' : formatSize(file.size || 0)}
                    ${file.owner_name ? `<br>Par ${file.owner_name}` : ''}
                    ${file.permission ? `<br>${file.permission === 'write' ? '✏️' : '👁️'}` : ''}
                </div>
            </div>
        `;
    }

    // Ligne fichier (liste)
    renderFileRow(file, isSharedView = false) {
        const fileType = file.is_folder ? 'folder' : getFileType(file.original_name);
        const isSelected = this.selectedFiles.has(file.id);
        
        return `
            <div class="file-row ${isSelected ? 'selected' : ''}"
                 data-id="${file.id}"
                 onclick="fileManager.handleFileClick(event, ${file.id})"
                 ondblclick="fileManager.handleFileDoubleClick(${file.id}, ${isSharedView})"
                 oncontextmenu="fileManager.handleContextMenu(event, ${file.id}, ${isSharedView})">
                
                <input type="checkbox" class="file-checkbox"
                       ${isSelected ? 'checked' : ''}
                       onclick="event.stopPropagation(); fileManager.toggleSelection(${file.id})"
                       style="margin-right: 8px;">
                
                <div class="file-row-icon ${fileType}">
                    ${this.getFileIcon(fileType)}
                </div>
                
                <div class="file-row-info">
                    <div class="file-row-name">${file.original_name}</div>
                    ${file.owner_name ? `<div class="file-row-path">Partagé par ${file.owner_name} ${file.permission === 'write' ? '(écriture)' : '(lecture)'}</div>` : ''}
                </div>
                
                <div class="file-row-size">${file.is_folder ? '-' : formatSize(file.size || 0)}</div>
                <div class="file-row-date">${formatDate(file.created_at)}</div>
                
                <div class="file-row-actions">
                    ${!file.is_folder ? `
                        <button class="btn btn-icon btn-sm btn-secondary" onclick="event.stopPropagation(); fileManager.downloadFile(${file.id})" title="Télécharger">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        </button>
                    ` : ''}
                    ${!isSharedView ? `
                        <button class="btn btn-icon btn-sm btn-secondary" onclick="event.stopPropagation(); openShareModal(${file.id})" title="Partager">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="18" cy="5" r="3"></circle>
                                <circle cx="6" cy="12" r="3"></circle>
                                <circle cx="18" cy="19" r="3"></circle>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Icône selon le type
    getFileIcon(type) {
        const icons = {
            folder: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
            image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
            video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>',
            audio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>',
            document: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
            archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v13H3V8"></path><path d="M1 3h22v5H1z"></path><path d="M10 12h4"></path></svg>',
            code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
            default: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>'
        };
        
        return icons[type] || icons.default;
    }

    // Rendu du breadcrumb
    renderBreadcrumb(isSharedView = false) {
        const container = document.getElementById('breadcrumb');
        if (!container) return;

        if (isSharedView) {
            container.innerHTML = '<span class="breadcrumb-current">Partagés avec moi</span>';
            return;
        }

        let html = `<span class="breadcrumb-item" onclick="fileManager.navigateToRoot()">Mes fichiers</span>`;
        
        for (let i = 0; i < this.breadcrumb.length; i++) {
            const item = this.breadcrumb[i];
            const isLast = i === this.breadcrumb.length - 1;
            
            html += `<span class="breadcrumb-separator">/</span>`;
            
            if (isLast) {
                html += `<span class="breadcrumb-current">${item.name}</span>`;
            } else {
                html += `<span class="breadcrumb-item" onclick="fileManager.navigateToFolder(${item.id})">${item.name}</span>`;
            }
        }
        
        container.innerHTML = html;
    }

    // Navigation
    navigateToRoot() {
        this.loadFiles(null);
    }

    navigateToFolder(folderId) {
        this.loadFiles(folderId);
    }

    // Gestion des clics
    handleFileClick(event, fileId) {
        if (event.ctrlKey || event.metaKey) {
            this.toggleSelection(fileId);
        } else if (event.shiftKey && this.selectedFiles.size > 0) {
            // Sélection multiple avec Shift
            const fileIds = this.files.map(f => f.id);
            const lastSelected = Array.from(this.selectedFiles).pop();
            const lastIndex = fileIds.indexOf(lastSelected);
            const currentIndex = fileIds.indexOf(fileId);
            
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);
            
            for (let i = start; i <= end; i++) {
                this.selectedFiles.add(fileIds[i]);
            }
            this.renderFiles();
        } else {
            this.selectedFiles.clear();
            this.selectedFiles.add(fileId);
            this.renderFiles();
        }
    }

    handleFileDoubleClick(fileId, isSharedView = false) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;

        if (file.is_folder) {
            if (isSharedView) {
                // Ne pas naviguer dans les dossiers partagés (pour simplifier)
                showToast('info', 'Information', 'Navigation dans les dossiers partagés non disponible');
            } else {
                this.loadFiles(fileId);
            }
        } else {
            this.downloadFile(fileId);
        }
    }

    handleContextMenu(event, fileId, isSharedView = false) {
        event.preventDefault();
        
        if (!this.selectedFiles.has(fileId)) {
            this.selectedFiles.clear();
            this.selectedFiles.add(fileId);
            this.renderFiles();
        }
        
        this.showContextMenu(event.clientX, event.clientY, fileId, isSharedView);
    }

    // Sélection
    toggleSelection(fileId) {
        if (this.selectedFiles.has(fileId)) {
            this.selectedFiles.delete(fileId);
        } else {
            this.selectedFiles.add(fileId);
        }
        this.renderFiles();
    }

    selectAll() {
        this.files.forEach(f => this.selectedFiles.add(f.id));
        this.renderFiles();
    }

    clearSelection() {
        this.selectedFiles.clear();
        this.renderFiles();
    }

    // Menu contextuel
    showContextMenu(x, y, fileId, isSharedView = false) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;

        const canEdit = !isSharedView || file.permission === 'write';
        const isOwner = !isSharedView;

        const menu = document.getElementById('context-menu');
        menu.innerHTML = `
            ${file.is_folder ? `
                <div class="context-menu-item" onclick="fileManager.handleFileDoubleClick(${fileId}, ${isSharedView}); hideContextMenu();">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                    Ouvrir
                </div>
            ` : `
                <div class="context-menu-item" onclick="fileManager.downloadFile(${fileId}); hideContextMenu();">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Télécharger
                </div>
            `}
            
            ${isOwner ? `
                <div class="context-menu-item" onclick="openShareModal(${fileId}); hideContextMenu();">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                    Partager
                </div>
                <div class="context-menu-divider"></div>
                <div class="context-menu-item" onclick="openRenameModal(${fileId}); hideContextMenu();">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Renommer
                </div>
                <div class="context-menu-item" onclick="openMoveModal(${fileId}); hideContextMenu();">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
                    Déplacer
                </div>
                <div class="context-menu-divider"></div>
                <div class="context-menu-item danger" onclick="fileManager.confirmDelete(${fileId}); hideContextMenu();">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Supprimer
                </div>
            ` : `
                ${canEdit ? `
                    <div class="context-menu-divider"></div>
                    <div class="context-menu-item" onclick="openRenameModal(${fileId}); hideContextMenu();">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        Renommer
                    </div>
                ` : ''}
            `}
        `;
        
        // Position du menu
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.classList.add('active');

        // Ajuster si dépasse l'écran
        setTimeout(() => {
            const rect = menu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                menu.style.left = `${window.innerWidth - rect.width - 10}px`;
            }
            if (rect.bottom > window.innerHeight) {
                menu.style.top = `${window.innerHeight - rect.height - 10}px`;
            }
        }, 0);
    }

    showFileMenu(event, fileId, isSharedView = false) {
        event.stopPropagation();
        const rect = event.target.getBoundingClientRect();
        this.showContextMenu(rect.left, rect.bottom + 5, fileId, isSharedView);
    }

    // Actions sur les fichiers
    async downloadFile(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file || file.is_folder) return;

        try {
            showToast('info', 'Téléchargement', `Préparation de ${file.original_name}...`);
            
            const url = api.getDownloadUrl(fileId);
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${auth.getToken()}`
                }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur de téléchargement');
            }
            
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = file.original_name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(objectUrl);
            
            showToast('success', 'Téléchargement', `${file.original_name} téléchargé`);
        } catch (error) {
            showToast('error', 'Erreur', error.message);
        }
    }

    async createFolder(name) {
        try {
            await api.createFolder(name, this.currentFolder);
            showToast('success', 'Dossier créé', `Le dossier "${name}" a été créé`);
            this.loadFiles(this.currentFolder);
        } catch (error) {
            showToast('error', 'Erreur', error.message);
        }
    }

    async renameFile(fileId, newName) {
        try {
            await api.renameFile(fileId, newName);
            showToast('success', 'Renommé', 'Le fichier a été renommé');
            this.loadFiles(this.currentFolder);
        } catch (error) {
            showToast('error', 'Erreur', error.message);
        }
    }

    async moveFile(fileId, targetFolderId) {
        try {
            await api.moveFile(fileId, targetFolderId);
            showToast('success', 'Déplacé', 'Le fichier a été déplacé');
            this.loadFiles(this.currentFolder);
        } catch (error) {
            showToast('error', 'Erreur', error.message);
        }
    }

    confirmDelete(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;

        showConfirmModal(
            'Supprimer',
            `Êtes-vous sûr de vouloir supprimer "${file.original_name}" ?${file.is_folder ? ' Tout son contenu sera également supprimé.' : ''}`,
            async () => {
                try {
                    await api.deleteFile(fileId);
                    showToast('success', 'Supprimé', 'Le fichier a été supprimé');
                    this.selectedFiles.delete(fileId);
                    this.loadFiles(this.currentFolder);
                    
                    // Mettre à jour le quota
                    const userData = await api.getMe();
                    auth.updateUser(userData.user);
                    updateStorageDisplay();
                } catch (error) {
                    showToast('error', 'Erreur', error.message);
                }
            }
        );
    }

    // Supprimer les fichiers sélectionnés
    async deleteSelected() {
        if (this.selectedFiles.size === 0) return;

        const count = this.selectedFiles.size;
        showConfirmModal(
            'Supprimer',
            `Êtes-vous sûr de vouloir supprimer ${count} élément(s) ?`,
            async () => {
                try {
                    for (const fileId of this.selectedFiles) {
                        await api.deleteFile(fileId);
                    }
                    showToast('success', 'Supprimés', `${count} élément(s) supprimé(s)`);
                    this.selectedFiles.clear();
                    this.loadFiles(this.currentFolder);
                    
                    // Mettre à jour le quota
                    const userData = await api.getMe();
                    auth.updateUser(userData.user);
                    updateStorageDisplay();
                } catch (error) {
                    showToast('error', 'Erreur', error.message);
                }
            }
        );
    }

    // Upload
    async uploadFiles(files) {
        if (files.length === 0) return;

        // Vérifier la taille
        let totalSize = 0;
        for (const file of files) {
            totalSize += file.size;
            if (file.size > CONFIG.MAX_UPLOAD_SIZE) {
                showToast('error', 'Fichier trop volumineux', `${file.name} dépasse la limite de ${formatSize(CONFIG.MAX_UPLOAD_SIZE)}`);
                return;
            }
        }

        // Vérifier le quota
        const user = auth.getUser();
        if (user.storage_used + totalSize > user.storage_quota) {
            showToast('error', 'Quota dépassé', 'Pas assez d\'espace de stockage disponible');
            return;
        }

        try {
            showLoading(true);
            const result = await api.uploadFiles(files, this.currentFolder);
            showToast('success', 'Upload terminé', result.message);
            
            // Recharger les fichiers et le quota
            await this.loadFiles(this.currentFolder);
            const userData = await api.getMe();
            auth.updateUser(userData.user);
            updateStorageDisplay();
            
        } catch (error) {
            showToast('error', 'Erreur upload', error.message);
        } finally {
            showLoading(false);
        }
    }

    // Changer la vue
    setViewMode(mode) {
        this.viewMode = mode;
        this.renderFiles();
        
        // Mettre à jour les boutons
        document.querySelectorAll('.view-toggle button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === mode);
        });
    }

    // Recherche
    async search(query) {
        if (!query || query.length < 2) {
            this.loadFiles(this.currentFolder);
            return;
        }

        try {
            showLoading(true);
            const result = await api.searchFiles(query);
            this.files = result.files || [];
            this.breadcrumb = [];
            
            // Mettre à jour le breadcrumb pour la recherche
            const container = document.getElementById('breadcrumb');
            if (container) {
                container.innerHTML = `
                    <span class="breadcrumb-item" onclick="fileManager.navigateToRoot()">Mes fichiers</span>
                    <span class="breadcrumb-separator">/</span>
                    <span class="breadcrumb-current">Recherche: "${query}"</span>
                `;
            }
            
            this.renderFiles();
        } catch (error) {
            showToast('error', 'Erreur', error.message);
        } finally {
            showLoading(false);
        }
    }
}

// Instance globale
const fileManager = new FileManager();

// Fonctions utilitaires globales
function hideContextMenu() {
    const menu = document.getElementById('context-menu');
    if (menu) {
        menu.classList.remove('active');
    }
}

// Cacher le menu quand on clique ailleurs
document.addEventListener('click', (e) => {
    if (!e.target.closest('.context-menu')) {
        hideContextMenu();
    }
});

// Raccourcis clavier
document.addEventListener('keydown', (e) => {
    // Ctrl+A : Sélectionner tout
    if (e.ctrlKey && e.key === 'a' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        fileManager.selectAll();
    }
    
    // Delete : Supprimer la sélection
    if (e.key === 'Delete' && fileManager.selectedFiles.size > 0 && !e.target.matches('input, textarea')) {
        e.preventDefault();
        fileManager.deleteSelected();
    }
    
    // Escape : Annuler la sélection
    if (e.key === 'Escape') {
        fileManager.clearSelection();
        hideContextMenu();
    }
});