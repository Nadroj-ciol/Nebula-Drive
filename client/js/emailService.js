// ============================================
// EMAIL SERVICE - NEBULA DRIVE
// Configuration Nodemailer avec templates HTML
// ============================================

const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // ✅ Configuration du transporteur email
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 587,
            secure: false, // true pour port 465, false pour autres ports
            auth: {
                user: process.env.EMAIL_USER, // Votre email
                pass: process.env.EMAIL_PASSWORD // Mot de passe d'application
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Vérifier la connexion
        this.verifyConnection();
    }

    // Vérifier la connexion SMTP
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Service email prêt à envoyer des messages');
        } catch (error) {
            console.error('❌ Erreur connexion email:', error.message);
        }
    }

    // ============================================
    // 1. EMAIL DE BIENVENUE
    // ============================================
    async sendWelcomeEmail(userEmail, username) {
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    background-color: #f8fafc;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: white;
                }
                .header {
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                    padding: 40px 20px;
                    text-align: center;
                }
                .logo {
                    width: 60px;
                    height: 60px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 20px;
                }
                .header h1 {
                    color: white;
                    margin: 0;
                    font-size: 28px;
                }
                .content {
                    padding: 40px 30px;
                }
                .welcome-message {
                    font-size: 24px;
                    color: #1e293b;
                    margin-bottom: 20px;
                }
                .text {
                    color: #64748b;
                    line-height: 1.6;
                    margin-bottom: 30px;
                }
                .button {
                    display: inline-block;
                    padding: 14px 32px;
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                    color: white;
                    text-decoration: none;
                    border-radius: 12px;
                    font-weight: 600;
                    margin: 20px 0;
                }
                .features {
                    background: #f8fafc;
                    border-radius: 12px;
                    padding: 24px;
                    margin: 30px 0;
                }
                .feature-item {
                    display: flex;
                    align-items: start;
                    margin-bottom: 16px;
                }
                .feature-icon {
                    margin-right: 12px;
                    font-size: 24px;
                }
                .footer {
                    background: #f8fafc;
                    padding: 30px;
                    text-align: center;
                    color: #94a3b8;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <!-- Header -->
                <div class="header">
                    <div class="logo">
                        <span style="font-size: 32px;">☁️</span>
                    </div>
                    <h1>Nebula Drive</h1>
                </div>

                <!-- Content -->
                <div class="content">
                    <div class="welcome-message">
                        Bienvenue ${username} ! 🎉
                    </div>

                    <p class="text">
                        Nous sommes ravis de vous accueillir sur <strong>Nebula Drive</strong>, 
                        votre espace de stockage cloud personnel, sécurisé et ultra-rapide.
                    </p>

                    <p class="text">
                        Votre compte a été créé avec succès. Vous pouvez maintenant :
                    </p>

                    <!-- Features -->
                    <div class="features">
                        <div class="feature-item">
                            <span class="feature-icon">📤</span>
                            <div>
                                <strong>Uploader vos fichiers</strong><br>
                                <span style="color: #64748b;">Glissez-déposez ou cliquez pour envoyer</span>
                            </div>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">🔗</span>
                            <div>
                                <strong>Partager en toute sécurité</strong><br>
                                <span style="color: #64748b;">Partagez avec vos collègues et amis</span>
                            </div>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">🔒</span>
                            <div>
                                <strong>Vos données protégées</strong><br>
                                <span style="color: #64748b;">Chiffrement de bout en bout</span>
                            </div>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">⚡</span>
                            <div>
                                <strong>Accès ultra-rapide</strong><br>
                                <span style="color: #64748b;">Synchronisation en temps réel</span>
                            </div>
                        </div>
                    </div>

                    <div style="text-align: center;">
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/index.html" class="button">
                            🚀 Commencer maintenant
                        </a>
                    </div>

                    <p class="text" style="margin-top: 30px; font-size: 14px;">
                        Besoin d'aide ? Consultez notre 
                        <a href="${process.env.APP_URL}/help.html" style="color: #3b82f6;">centre d'aide</a> 
                        ou répondez directement à cet email.
                    </p>
                </div>

                <!-- Footer -->
                <div class="footer">
                    <p>© 2025 Nebula Drive - Tous droits réservés</p>
                    <p>
                        <a href="${process.env.APP_URL}/privacy.html" style="color: #94a3b8; text-decoration: none;">Confidentialité</a> • 
                        <a href="${process.env.APP_URL}/terms.html" style="color: #94a3b8; text-decoration: none;">Conditions d'utilisation</a>
                    </p>
                </div>
            </div>
        </body>
        </html>
        `;

        const mailOptions = {
            from: `"Nebula Drive" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: '🎉 Bienvenue sur Nebula Drive !',
            html: htmlContent
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Email de bienvenue envoyé:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Erreur envoi email bienvenue:', error);
            throw error;
        }
    }

    // ============================================
    // 2. EMAIL DE RÉINITIALISATION DE MOT DE PASSE
    // ============================================
    async sendPasswordResetEmail(userEmail, username, resetToken) {
        const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password.html?token=${resetToken}`;
        
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    background-color: #f8fafc;
                }
                .container {
                    max-width: 600px;
                    margin: 40px auto;
                    background: white;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }
                .header {
                    background: linear-gradient(135deg, #f59e0b, #ef4444);
                    padding: 40px 20px;
                    text-align: center;
                    color: white;
                }
                .content {
                    padding: 40px 30px;
                }
                .alert-box {
                    background: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    padding: 16px;
                    border-radius: 8px;
                    margin: 20px 0;
                }
                .button {
                    display: inline-block;
                    padding: 14px 32px;
                    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                    color: white;
                    text-decoration: none;
                    border-radius: 12px;
                    font-weight: 600;
                    margin: 20px 0;
                }
                .code-box {
                    background: #f8fafc;
                    border: 2px dashed #cbd5e1;
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: 4px;
                    color: #1e293b;
                    margin: 20px 0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0; font-size: 28px;">🔒 Réinitialisation du mot de passe</h1>
                </div>
                <div class="content">
                    <p style="font-size: 18px; color: #1e293b;">Bonjour ${username},</p>
                    
                    <p style="color: #64748b; line-height: 1.6;">
                        Vous avez demandé une réinitialisation de votre mot de passe sur Nebula Drive. 
                        Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
                    </p>

                    <div style="text-align: center;">
                        <a href="${resetUrl}" class="button">
                            🔑 Réinitialiser mon mot de passe
                        </a>
                    </div>

                    <div class="alert-box">
                        <strong>⏰ Attention :</strong> Ce lien expire dans <strong>1 heure</strong>.
                    </div>

                    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
                        Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br>
                        <code style="background: #f1f5f9; padding: 8px; border-radius: 4px; display: inline-block; margin-top: 8px; word-break: break-all;">
                            ${resetUrl}
                        </code>
                    </p>

                    <div class="alert-box" style="background: #fee2e2; border-left-color: #ef4444; margin-top: 30px;">
                        <strong>⚠️ Vous n'avez pas demandé cette réinitialisation ?</strong><br>
                        Ignorez cet email. Votre mot de passe reste inchangé.
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;

        const mailOptions = {
            from: `"Nebula Drive Security" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: '🔒 Réinitialisation de votre mot de passe - Nebula Drive',
            html: htmlContent
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Email de reset envoyé:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Erreur envoi email reset:', error);
            throw error;
        }
    }

    // ============================================
    // 3. EMAIL DE CONFIRMATION DE PARTAGE
    // ============================================
    async sendShareNotificationEmail(recipientEmail, recipientName, senderName, fileName, fileUrl) {
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { margin: 0; padding: 0; font-family: -apple-system, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; background: white; }
                .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 40px; text-align: center; color: white; }
                .content { padding: 40px 30px; }
                .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">🔗 Fichier partagé avec vous</h1>
                </div>
                <div class="content">
                    <p style="font-size: 18px; color: #1e293b;">Bonjour ${recipientName},</p>
                    <p style="color: #64748b;">
                        <strong>${senderName}</strong> a partagé le fichier 
                        <strong style="color: #3b82f6;">${fileName}</strong> avec vous sur Nebula Drive.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${fileUrl}" class="button">📂 Voir le fichier</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;

        const mailOptions = {
            from: `"Nebula Drive" <${process.env.EMAIL_USER}>`,
            to: recipientEmail,
            subject: `📁 ${senderName} a partagé "${fileName}" avec vous`,
            html: htmlContent
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log('✅ Email de partage envoyé');
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur envoi email partage:', error);
            throw error;
        }
    }
}

// Export singleton
module.exports = new EmailService();