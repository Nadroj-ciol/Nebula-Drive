// middleware/upload.js — Configuration Multer pour l'upload de fichiers

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Configuration du stockage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Créer un dossier par utilisateur
        const userFolder = path.join(__dirname, '..', 'storage', `user_${req.user.id}`);
        
        if (!fs.existsSync(userFolder)) {
            fs.mkdirSync(userFolder, { recursive: true });
        }
        
        cb(null, userFolder);
    },
    filename: (req, file, cb) => {
        // Nom unique pour éviter les conflits
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// Filtre de fichiers (optionnel - peut être personnalisé)
const fileFilter = (req, file, cb) => {
    // Liste noire d'extensions dangereuses
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (dangerousExtensions.includes(ext)) {
        return cb(new Error('Type de fichier non autorisé'), false);
    }
    
    cb(null, true);
};

// Configuration Multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100 MB max par fichier
        files: 10 // Max 10 fichiers par requête
    }
});

module.exports = upload;