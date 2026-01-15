// config.js — Configuration globale

const CONFIG = {
    // URL de l'API (à modifier selon votre serveur Kali)
    API_URL: window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : `${window.location.origin}/api`,

    // Auto-détection du réseau
  detectNetwork: async () => {
    try {
      const response = await fetch(`${CONFIG.API_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  },

    // Clé de stockage local pour le token (simulé en mémoire car localStorage non dispo)
    TOKEN_KEY: 'minicloud_token',
    USER_KEY: 'minicloud_user',
    
    // Formats de fichiers par catégorie
    FILE_TYPES: {
        image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
        video: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'webm'],
        audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'],
        document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt'],
        archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
        code: ['js', 'html', 'css', 'json', 'xml', 'php', 'py', 'java', 'c', 'cpp', 'h']
    },
    
    // Polling des notifications (en ms)
    NOTIFICATION_POLL_INTERVAL: 30000,
    
    // Taille max d'upload (en bytes)
    MAX_UPLOAD_SIZE: 100 * 1024 * 1024, // 100 MB
};

// Fonction pour obtenir le type de fichier
function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    
    for (const [type, extensions] of Object.entries(CONFIG.FILE_TYPES)) {
        if (extensions.includes(ext)) {
            return type;
        }
    }
    return 'default';
}

// Fonction pour formater la taille
function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Fonction pour formater la date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // Moins d'une minute
    if (diff < 60000) {
        return 'À l\'instant';
    }
    
    // Moins d'une heure
    if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return `Il y a ${mins} min`;
    }
    
    // Moins d'un jour
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `Il y a ${hours}h`;
    }
    
    // Moins d'une semaine
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `Il y a ${days}j`;
    }
    
    // Sinon date complète
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}