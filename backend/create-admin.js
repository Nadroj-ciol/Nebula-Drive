// create-admin.js - Script pour créer un compte administrateur

const bcrypt = require('bcrypt');
const db = require('./config/db');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
    try {
        console.log('\n╔═══════════════════════════════════════════════════╗');
        console.log('║     🌩️  CRÉATION D\'UN COMPTE ADMINISTRATEUR      ║');
        console.log('╚═══════════════════════════════════════════════════╝\n');

        // Demander les informations
        const username = await question('Nom d\'utilisateur (ex: jordan) : ');
        
        if (!username || username.length < 3) {
            console.log('❌ Le nom d\'utilisateur doit contenir au moins 3 caractères');
            rl.close();
            return;
        }

        // Vérifier si l'utilisateur existe déjà
        const existingUser = db.prepare('SELECT id, role FROM users WHERE username = ?').get(username);
        
        if (existingUser) {
            if (existingUser.role === 'admin') {
                console.log(`\n❌ L'utilisateur "${username}" est déjà administrateur`);
                rl.close();
                return;
            }
            
            // Proposer de promouvoir l'utilisateur existant
            const promote = await question(`\n⚠️  L'utilisateur "${username}" existe déjà. Voulez-vous le promouvoir administrateur ? (oui/non) : `);
            
            if (promote.toLowerCase() === 'oui' || promote.toLowerCase() === 'o') {
                db.prepare(`
                    UPDATE users 
                    SET role = 'admin', 
                        subscription = 'enterprise', 
                        storage_quota = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE username = ?
                `).run(10737418240, username); // 10 GB
                
                console.log('\n✅ Utilisateur promu administrateur avec succès !');
                console.log('╔═══════════════════════════════════════════════════╗');
                console.log('║          PROMOTION ADMINISTRATEUR                 ║');
                console.log('╠═══════════════════════════════════════════════════╣');
                console.log(`║  Utilisateur : ${username.padEnd(34)} ║`);
                console.log('║  Nouveau rôle : admin                             ║');
                console.log('║  Quota : 10 GB                                    ║');
                console.log('╚═══════════════════════════════════════════════════╝\n');
                
                rl.close();
                return;
            } else {
                console.log('\n❌ Opération annulée');
                rl.close();
                return;
            }
        }

        const email = await question('Email (ex: jordan@nebula.local) : ');
        
        if (!email || !email.includes('@')) {
            console.log('❌ Email invalide');
            rl.close();
            return;
        }

        // Vérifier si l'email existe
        const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingEmail) {
            console.log(`\n❌ L'email "${email}" est déjà utilisé`);
            rl.close();
            return;
        }

        const password = await question('Mot de passe (min 6 caractères) : ');
        
        if (!password || password.length < 6) {
            console.log('❌ Le mot de passe doit contenir au moins 6 caractères');
            rl.close();
            return;
        }

        // Créer le compte admin
        const passwordHash = await bcrypt.hash(password, 10);
        
        const result = db.prepare(`
            INSERT INTO users (username, email, password_hash, role, subscription, storage_quota)
            VALUES (?, ?, ?, 'admin', 'enterprise', ?)
        `).run(username, email, passwordHash, 10737418240); // 10 GB
        
        console.log('\n✅ Compte administrateur créé avec succès !');
        console.log('╔═══════════════════════════════════════════════════╗');
        console.log('║          IDENTIFIANTS ADMINISTRATEUR              ║');
        console.log('╠═══════════════════════════════════════════════════╣');
        console.log(`║  Nom d'utilisateur : ${username.padEnd(30)} ║`);
        console.log(`║  Email : ${email.padEnd(38)} ║`);
        console.log(`║  Mot de passe : ${password.padEnd(33)} ║`);
        console.log('╠═══════════════════════════════════════════════════╣');
        console.log('║  ⚠️  CONSERVEZ CES IDENTIFIANTS EN LIEU SÛR !     ║');
        console.log('╚═══════════════════════════════════════════════════╝\n');
        
        rl.close();
        
    } catch (error) {
        console.error('❌ Erreur lors de la création de l\'admin:', error.message);
        rl.close();
    }
}

createAdmin();