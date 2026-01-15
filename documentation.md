# 🌩️ Mini-Cloud Personnel - Guide Complet

## 📦 Ce qui a été créé

### ✅ Frontend (Interface Web)
- **Fichier unique** : `index.html` (HTML + CSS + JavaScript intégré)
- Interface moderne et responsive (PC + mobile)
- Fonctionnalités :
  - 🔐 Connexion / Inscription
  - 📁 Gestion de fichiers (upload, dossiers, navigation)
  - 🔗 Partage de fichiers avec d'autres utilisateurs
  - 🔔 Notifications en temps réel
  - 🔍 Recherche de fichiers
  - 📊 Affichage du quota de stockage
  - ⬇️ Téléchargement de fichiers
  - ✏️ Renommer, déplacer, supprimer
  - 🎨 Design moderne avec animations

### ✅ Backend (API REST)
- Déjà fourni dans votre document
- **Corrections appliquées** :
  - `routes/share.routes.js` : syntaxe corrigée
  - `routes/notifications.routes.js` : syntaxe corrigée

---

## 🚀 Installation et Configuration

### 1️⃣ **Sur le serveur Kali Linux**

```bash
# Installer Node.js (si pas déjà fait)
sudo apt update
sudo apt install nodejs npm -y

# Vérifier les versions
node -v   # >= 18.x
npm -v

# Créer le projet
mkdir -p ~/mini-cloud/backend
cd ~/mini-cloud/backend

# Copier tous les fichiers backend depuis votre document
# (package.json, server.js, .env, config/, middleware/, routes/, services/)

# Installer les dépendances
npm install

# Créer le dossier storage
mkdir -p storage

# Démarrer le serveur
npm start

# OU en mode développement (auto-reload)
npm run dev
```

Le serveur démarre sur `http://0.0.0.0:3000`

### 2️⃣ **Trouver l'adresse IP du serveur**

```bash
hostname -I
# Exemple de sortie : 192.168.0.10
```

### 3️⃣ **Configurer le Frontend**

1. **Ouvrir le fichier `index.html`** que j'ai créé
2. **Modifier la ligne 752** (cherchez `BASE_URL`) :

```javascript
const BASE_URL = 'http://192.168.0.10:3000/api'; // ⚠️ METTRE VOTRE IP ICI
```

Remplacez `192.168.0.10` par **l'IP réelle de votre serveur Kali**.

3. **Ouvrir le fichier** dans un navigateur :
   - Sur PC : Double-cliquez sur `index.html`
   - Sur smartphone : Transférez le fichier ou hébergez-le sur un serveur web simple

---

## 🌐 Option : Héberger le Frontend sur le serveur

Si vous voulez accéder au frontend depuis n'importe quel appareil du réseau :

```bash
# Sur le serveur Kali
cd ~/mini-cloud
mkdir frontend
# Copier index.html dans ce dossier

# Installer un serveur HTTP simple
sudo npm install -g http-server

# Démarrer le serveur frontend
cd frontend
http-server -p 8080

# Le frontend sera accessible à : http://IP_SERVEUR:8080
```

---

## 🔧 Corrections Backend Appliquées

### **Fichier : `routes/share.routes.js`**
**Problème** : Syntaxe JavaScript incomplète/corrompue

**Correction** : Code réécrit proprement (voir l'artifact "Corrections Backend")

### **Fichier : `routes/notifications.routes.js`**
**Problème** : Même problème de syntaxe

**Correction** : Code réécrit proprement (voir l'artifact "Corrections Backend")

**Action à faire** : Remplacez le contenu de ces deux fichiers par le code corrigé que j'ai fourni.

---

## 📱 Utilisation de l'Interface

### **Connexion**
1. Ouvrez `index.html` dans votre navigateur
2. Cliquez sur "Créer un compte"
3. Remplissez le formulaire (username, email, mot de passe)
4. Une fois inscrit, connectez-vous

### **Gérer vos fichiers**
- **Upload** : Cliquez sur "⬆️ Uploader" ou glissez-déposez des fichiers
- **Créer un dossier** : Bouton "📁 Nouveau dossier"
- **Naviguer** : Cliquez sur un dossier pour l'ouvrir
- **Actions sur fichiers** :
  - ⬇️ Télécharger
  - 🔗 Partager
  - ✏️ Renommer
  - 🗑️ Supprimer

### **Partager des fichiers**
1. Cliquez sur l'icône 🔗 d'un fichier
2. Entrez le nom d'utilisateur du destinataire
3. Choisissez les permissions (lecture ou écriture)
4. Cliquez sur "Partager"

### **Voir les fichiers partagés**
- Onglet "🔗 Partagés avec moi" : Fichiers que d'autres ont partagés avec vous
- Onglet "📤 Mes partages" : Fichiers que vous avez partagés

### **Notifications**
- Cliquez sur l'icône 🔔 en haut à droite
- Badge rouge indique le nombre de notifications non lues

---

## 🎨 Caractéristiques du Design

### **Modern & Épuré**
- Dégradé violet-bleu en arrière-plan
- Cartes blanches avec ombres douces
- Animations fluides sur les interactions
- Responsive (s'adapte aux petits écrans)

### **Fonctionnalités UX**
- Glisser-déposer pour uploader
- Recherche en temps réel
- Breadcrumb pour la navigation
- Indicateur de quota de stockage visuel
- Messages d'alerte contextuels

---

## 🔐 Sécurité

- ✅ Authentification JWT
- ✅ Hash des mots de passe (bcrypt)
- ✅ Vérification des permissions sur chaque route
- ✅ Protection CORS configurée
- ✅ Stockage isolé par utilisateur

---

## 🐛 Dépannage

### **Problème : "Erreur de connexion à l'API"**
- Vérifiez que le backend est bien démarré (`npm start`)
- Vérifiez l'IP dans `BASE_URL` du frontend
- Vérifiez que vous êtes sur le même réseau Wi-Fi

### **Problème : "Token invalide"**
- Reconnectez-vous (bouton "Déconnexion" puis reconnexion)

### **Problème : "Quota dépassé"**
- En tant qu'admin, vous pouvez augmenter le quota :
  ```bash
  # Via l'API
  curl -X PUT http://localhost:3000/api/users/USER_ID \
    -H "Authorization: Bearer ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"storage_quota": 1073741824}'  # 1 GB
  ```

### **Problème : Upload échoue**
- Vérifiez les permissions du dossier `storage/`
  ```bash
  chmod -R 755 ~/mini-cloud/backend/storage
  ```

---

## 📊 Quotas par Défaut

| Rôle | Quota | En bytes |
|------|-------|----------|
| Basic | 100 MB | 104857600 |
| Premium | 1 GB | 1073741824 |
| Admin | 10 GB | 10737418240 |

Modifiables dans `.env` ou via l'API admin.

---

## 🚀 Pour aller plus loin

### **Ajouter un utilisateur admin manuellement**

```javascript
// Créer un script init-admin.js
const db = require('./config/db');
const bcrypt = require('bcrypt');

async function createAdmin() {
    const hash = await bcrypt.hash('admin123', 10);
    db.prepare(`
        INSERT INTO users (username, email, password_hash, role, storage_quota)
        VALUES ('admin', 'admin@minicloud.local', ?, 'admin', 10737418240)
    `).run(hash);
    console.log('✅ Admin créé : admin / admin123');
}

createAdmin();
```

```bash
node init-admin.js
```

### **Activer HTTPS (production)**
- Utilisez `nginx` ou `caddy` comme reverse proxy
- Certificat SSL via Let's Encrypt

### **Ajouter des fonctionnalités**
- Prévisualisation d'images
- Lecteur vidéo intégré
- Éditeur de texte en ligne
- Versioning de fichiers
- Corbeille (soft delete)

---

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs du serveur backend
2. Ouvrez la console développeur du navigateur (F12)
3. Vérifiez la configuration réseau (firewall, IP, ports)

---

## 🎉 C'est tout !

Votre Mini-Cloud est prêt à l'emploi. Profitez de votre espace de stockage personnel et sécurisé !

**Développé avec ❤️ pour votre projet 48h**