// ============================================
// ONBOARDING.JS - Système d'onboarding Nebula Drive (VERSION CORRIGÉE)
// ============================================

class OnboardingManager {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.overlay = null;
        this.tooltip = null;
        this.spotlight = null;
        this.isTransitioning = false; // ✅ NOUVEAU : Flag pour éviter les transitions multiples
        
        // ✅ Étapes avec sélecteurs SPÉCIFIQUES et UNIQUES
        this.steps = [
            {
                target: null,
                title: "Bienvenue dans Nebula Drive ! 🌩️",
                description: "Découvrons ensemble comment gérer vos fichiers en toute sécurité. Ce guide prend moins de 2 minutes.",
                position: 'center',
                actions: [
                    { label: 'Commencer', style: 'primary', action: 'next' },
                    { label: 'Ignorer', style: 'text', action: 'skip' }
                ]
            },
            {
                target: '.search-box',
                title: "🔍 Recherche instantanée",
                description: "Trouvez n'importe quel fichier en tapant son nom. La recherche fonctionne même dans les sous-dossiers.",
                position: 'bottom',
                actions: [
                    { label: 'Suivant', style: 'primary', action: 'next' }
                ]
            },
            {
                target: '#upload-button', // ✅ CORRIGÉ : ID spécifique au lieu de classe générique
                title: "📤 Upload ultra-simple",
                description: "Glissez-déposez vos fichiers n'importe où sur la page, ou cliquez sur le bouton Upload. Vos fichiers sont automatiquement chiffrés.",
                position: 'bottom',
                actions: [
                    { label: 'Suivant', style: 'primary', action: 'next' }
                ]
            },
            {
                target: '.view-toggle',
                title: "👁️ Vue grille ou liste",
                description: "Changez l'affichage selon votre préférence. La vue grille est parfaite pour les images, la vue liste pour les documents.",
                position: 'left',
                actions: [
                    { label: 'Suivant', style: 'primary', action: 'next' }
                ]
            },
            {
                target: '#notifications-btn',
                title: "🔔 Notifications en temps réel",
                description: "Soyez notifié instantanément des uploads, partages et annonces. Le badge rouge indique les notifications non lues.",
                position: 'bottom-left',
                actions: [
                    { label: 'Suivant', style: 'primary', action: 'next' }
                ]
            },
            {
                target: '#user-menu',
                title: "⚙️ Votre profil",
                description: "Cliquez sur votre avatar pour accéder aux paramètres, changer votre mot de passe et voir votre espace de stockage utilisé.",
                position: 'bottom-left',
                actions: [
                    { label: 'Suivant', style: 'primary', action: 'next' }
                ]
            },
            {
                target: null,
                title: "🎉 Vous êtes prêt !",
                description: "Vous connaissez maintenant l'essentiel de Nebula Drive. N'hésitez pas à explorer !",
                position: 'center',
                actions: [
                    { label: 'Commencer à utiliser', style: 'primary', action: 'complete' }
                ]
            }
        ];
    }

    // ✅ Vérifier si l'utilisateur a déjà vu le guide
    hasCompletedOnboarding() {
        return sessionStorage.getItem('nebula_onboarding_completed') === 'true';
    }

    // Démarrer le guide
    async start() {
        if (this.isActive) {
            console.warn('⚠️ Onboarding déjà actif');
            return;
        }
        
        console.log('🎓 Démarrage de l\'onboarding...');
        
        this.isActive = true;
        this.isTransitioning = false;
        this.currentStep = 0;
        
        // Créer l'overlay
        this.createOverlay();
        
        // Attendre que l'interface soit chargée
        await this.wait(500);
        
        // Afficher la première étape
        await this.showStep(0);
    }

    // Créer l'overlay sombre
    createOverlay() {
        // ✅ Nettoyer l'ancien overlay s'il existe
        if (this.overlay) {
            this.overlay.remove();
        }

        this.overlay = document.createElement('div');
        this.overlay.id = 'onboarding-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(3px);
            z-index: 9998;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        `;
        document.body.appendChild(this.overlay);
        
        // Forcer le reflow
        this.overlay.offsetHeight;
        this.overlay.style.opacity = '1';
    }

    // ✅ Afficher une étape (AVEC PROTECTION CONTRE LES TRANSITIONS MULTIPLES)
    async showStep(stepIndex) {
        // ✅ Protection contre les appels multiples
        if (this.isTransitioning) {
            console.warn('⚠️ Transition déjà en cours, appel ignoré');
            return;
        }

        if (stepIndex < 0 || stepIndex >= this.steps.length) {
            console.warn('❌ Index d\'étape invalide:', stepIndex);
            return;
        }

        this.isTransitioning = true;
        
        try {
            console.log('📍 Affichage étape', stepIndex + 1, '/', this.steps.length);
            
            this.currentStep = stepIndex;
            const step = this.steps[stepIndex];
            
            // Nettoyer l'étape précédente
            await this.cleanupStep();
            
            // Attendre un peu après le nettoyage
            await this.wait(100);
            
            // Créer le spotlight si cible
            if (step.target) {
                const targetExists = await this.createSpotlight(step.target);
                if (!targetExists) {
                    console.warn('⚠️ Élément cible non trouvé:', step.target);
                    // ✅ CORRIGÉ : Passer à l'étape suivante de manière sécurisée
                    this.isTransitioning = false;
                    setTimeout(() => this.nextStep(), 500);
                    return;
                }
            }
            
            // Créer la tooltip
            await this.createTooltip(step);
            
            // Animer l'entrée
            await this.wait(50);
            if (this.tooltip) {
                this.tooltip.style.opacity = '1';
                this.tooltip.style.transform = this.getTooltipTransform(step.position, true);
            }
            
        } catch (error) {
            console.error('❌ Erreur dans showStep:', error);
        } finally {
            // ✅ Toujours débloquer les transitions
            this.isTransitioning = false;
        }
    }

    // ✅ Créer le spotlight avec vérification RENFORCÉE
    async createSpotlight(selector) {
        try {
            const target = document.querySelector(selector);
            
            if (!target) {
                console.warn('❌ Élément non trouvé:', selector);
                return false;
            }

            // ✅ Attendre que l'élément soit visible dans le DOM
            await this.wait(100);

            const rect = target.getBoundingClientRect();
            
            // Vérifier que l'élément est visible
            if (rect.width === 0 || rect.height === 0) {
                console.warn('❌ Élément invisible:', selector);
                return false;
            }
            
            // ✅ Nettoyer l'ancien spotlight s'il existe
            if (this.spotlight) {
                this.spotlight.remove();
                this.spotlight = null;
            }

            // Créer le spotlight
            this.spotlight = document.createElement('div');
            this.spotlight.id = 'onboarding-spotlight';
            this.spotlight.style.cssText = `
                position: fixed;
                top: ${rect.top - 8}px;
                left: ${rect.left - 8}px;
                width: ${rect.width + 16}px;
                height: ${rect.height + 16}px;
                border: 3px solid #3b82f6;
                border-radius: 12px;
                box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.75),
                            0 0 30px rgba(59, 130, 246, 0.5),
                            inset 0 0 20px rgba(59, 130, 246, 0.2);
                z-index: 9999;
                pointer-events: none;
                animation: spotlightPulse 2s ease-in-out infinite;
            `;
            
            document.body.appendChild(this.spotlight);
            
            // Scroller vers l'élément
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            return true;
            
        } catch (error) {
            console.error('❌ Erreur createSpotlight:', error);
            return false;
        }
    }

    // ✅ Créer la tooltip avec gestion d'erreur RENFORCÉE
    async createTooltip(step) {
        try {
            // ✅ Nettoyer l'ancienne tooltip s'il existe
            if (this.tooltip) {
                this.tooltip.remove();
                this.tooltip = null;
            }

            this.tooltip = document.createElement('div');
            this.tooltip.id = 'onboarding-tooltip';
            
            // Position de base
            const tooltipStyle = this.calculateTooltipStyle(step);
            this.tooltip.style.cssText = tooltipStyle;
            
            // Contenu
            this.tooltip.innerHTML = `
                <!-- Barre de progression -->
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: #e5e7eb; border-radius: 16px 16px 0 0; overflow: hidden;">
                    <div style="height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); width: ${((this.currentStep + 1) / this.steps.length) * 100}%; transition: width 0.5s ease;"></div>
                </div>
                
                <!-- Badge étape -->
                <div style="position: absolute; top: -12px; right: 20px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                    ${this.currentStep + 1}/${this.steps.length}
                </div>
                
                <!-- Contenu -->
                <div style="margin-top: 8px;">
                    <h3 style="font-size: 20px; font-weight: 700; margin: 0 0 12px 0; color: #111827; line-height: 1.3;">
                        ${step.title}
                    </h3>
                    <p style="font-size: 15px; line-height: 1.6; color: #6b7280; margin: 0 0 24px 0;">
                        ${step.description}
                    </p>
                    
                    <!-- Actions -->
                    <div style="display: flex; gap: 12px; justify-content: flex-end; align-items: center;">
                        ${this.currentStep > 0 ? `
                            <button onclick="onboardingManager.previousStep()" style="padding: 10px 16px; border: 1px solid #e5e7eb; background: white; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; color: #6b7280; transition: all 0.2s;">
                                ← Précédent
                            </button>
                        ` : ''}
                        
                        ${step.actions.map(action => {
                            const styles = {
                                primary: 'background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; border: none;',
                                secondary: 'background: white; color: #3b82f6; border: 2px solid #3b82f6;',
                                text: 'background: transparent; color: #6b7280; border: none; padding: 10px 12px;'
                            };
                            
                            return `
                                <button onclick="onboardingManager.handleAction('${action.action}')" 
                                        style="${styles[action.style]} padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s; box-shadow: ${action.style === 'primary' ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'};">
                                    ${action.label}
                                </button>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
            
            document.body.appendChild(this.tooltip);
            
        } catch (error) {
            console.error('❌ Erreur création tooltip:', error);
        }
    }

    // Calculer le style de la tooltip
    calculateTooltipStyle(step) {
        let baseStyle = `
            position: fixed;
            background: white;
            border-radius: 16px;
            padding: 28px;
            max-width: 420px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4),
                        0 0 0 1px rgba(0, 0, 0, 0.05);
            z-index: 10000;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            pointer-events: auto;
        `;
        
        const transform = this.getTooltipTransform(step.position, false);
        const position = this.getTooltipPosition(step);
        
        return baseStyle + transform + position;
    }

    // Position de la tooltip
    getTooltipPosition(step) {
        if (!step.target || step.position === 'center') {
            return `
                top: 50%;
                left: 50%;
            `;
        }

        const target = document.querySelector(step.target);
        if (!target) return 'top: 50%; left: 50%;';

        const rect = target.getBoundingClientRect();
        const spacing = 20;
        
        const positions = {
            'top': `bottom: ${window.innerHeight - rect.top + spacing}px; left: ${rect.left + rect.width / 2}px;`,
            'bottom': `top: ${rect.bottom + spacing}px; left: ${rect.left + rect.width / 2}px;`,
            'left': `top: ${rect.top + rect.height / 2}px; right: ${window.innerWidth - rect.left + spacing}px;`,
            'right': `top: ${rect.top + rect.height / 2}px; left: ${rect.right + spacing}px;`,
            'bottom-left': `top: ${rect.bottom + spacing}px; right: ${window.innerWidth - rect.right}px;`,
        };

        return positions[step.position] || positions['bottom'];
    }

    // Transform de la tooltip
    getTooltipTransform(position, active) {
        const transforms = {
            'center': active ? 'transform: translate(-50%, -50%) scale(1);' : 'transform: translate(-50%, -50%) scale(0.9);',
            'top': active ? 'transform: translateX(-50%) scale(1);' : 'transform: translateX(-50%) translateY(10px) scale(0.9);',
            'bottom': active ? 'transform: translateX(-50%) scale(1);' : 'transform: translateX(-50%) translateY(-10px) scale(0.9);',
            'left': active ? 'transform: translateY(-50%) scale(1);' : 'transform: translateY(-50%) translateX(10px) scale(0.9);',
            'right': active ? 'transform: translateY(-50%) scale(1);' : 'transform: translateY(-50%) translateX(-10px) scale(0.9);',
            'bottom-left': active ? 'transform: scale(1);' : 'transform: translateY(-10px) scale(0.9);'
        };

        return transforms[position] || transforms['bottom'];
    }

    // ✅ Gérer les actions (AVEC PROTECTION)
    async handleAction(action) {
        if (this.isTransitioning) {
            console.warn('⚠️ Action ignorée, transition en cours');
            return;
        }

        console.log('🎬 Action:', action);
        
        try {
            switch (action) {
                case 'next':
                    await this.nextStep();
                    break;
                case 'skip':
                    this.skip();
                    break;
                case 'complete':
                    this.complete();
                    break;
            }
        } catch (error) {
            console.error('❌ Erreur action:', error);
            this.isTransitioning = false;
        }
    }

    // Étape suivante
    async nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            await this.showStep(this.currentStep + 1);
        } else {
            this.complete();
        }
    }

    // Étape précédente
    async previousStep() {
        if (this.currentStep > 0) {
            await this.showStep(this.currentStep - 1);
        }
    }

    // ✅ Ignorer le guide (CORRIGÉ)
    skip() {
        // ✅ Utiliser une confirmation sans bloquer l'exécution
        const shouldSkip = confirm('Êtes-vous sûr de vouloir ignorer le guide ? Vous pourrez le relancer depuis votre profil.');
        
        if (shouldSkip) {
            console.log('⏭️ Guide ignoré par l\'utilisateur');
            this.complete(false);
        } else {
            // ✅ Si annulé, débloquer les transitions
            this.isTransitioning = false;
        }
    }

    // ✅ Terminer le guide
    complete(showSuccess = true) {
        console.log('✅ Guide terminé');
        
        sessionStorage.setItem('nebula_onboarding_completed', 'true');
        
        if (showSuccess && typeof showToast === 'function') {
            showToast('success', 'Guide terminé ! 🎉', 'Vous êtes maintenant prêt à utiliser Nebula Drive');
        }
        
        this.cleanup();
    }

    // ✅ Nettoyer uniquement l'étape en cours (VERSION ASYNC)
    async cleanupStep() {
        if (this.tooltip) {
            this.tooltip.style.opacity = '0';
            await this.wait(300);
            if (this.tooltip) {
                this.tooltip.remove();
                this.tooltip = null;
            }
        }
        
        if (this.spotlight) {
            this.spotlight.remove();
            this.spotlight = null;
        }
    }

    // ✅ Nettoyer tout
    cleanup() {
        console.log('🧹 Nettoyage complet de l\'onboarding...');
        
        // Nettoyer l'étape
        if (this.tooltip) {
            this.tooltip.remove();
            this.tooltip = null;
        }
        
        if (this.spotlight) {
            this.spotlight.remove();
            this.spotlight = null;
        }
        
        // Nettoyer l'overlay
        if (this.overlay) {
            this.overlay.style.opacity = '0';
            setTimeout(() => {
                if (this.overlay) {
                    this.overlay.remove();
                    this.overlay = null;
                }
            }, 300);
        }
        
        this.isActive = false;
        this.isTransitioning = false;
        console.log('✅ Onboarding terminé et nettoyé');
    }

    // Utilitaire: attendre
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Relancer le guide
    restart() {
        console.log('🔄 Redémarrage du guide...');
        
        // Nettoyer d'abord
        this.cleanup();
        
        // Attendre un peu puis redémarrer
        setTimeout(() => {
            sessionStorage.removeItem('nebula_onboarding_completed');
            this.start();
        }, 500);
    }
}

// ✅ CSS Animations
const onboardingStyles = `
@keyframes spotlightPulse {
    0%, 100% { 
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.75),
                    0 0 30px rgba(59, 130, 246, 0.5),
                    inset 0 0 20px rgba(59, 130, 246, 0.2);
    }
    50% { 
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.75),
                    0 0 50px rgba(59, 130, 246, 0.8),
                    inset 0 0 30px rgba(59, 130, 246, 0.4);
    }
}
`;

// Injecter les styles
const styleSheet = document.createElement('style');
styleSheet.textContent = onboardingStyles;
document.head.appendChild(styleSheet);

// Instance globale
const onboardingManager = new OnboardingManager();

// ✅ Auto-démarrage sécurisé
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (typeof auth !== 'undefined' && 
                auth.isLoggedIn() && 
                !onboardingManager.hasCompletedOnboarding()) {
                onboardingManager.start();
            }
        }, 1500);
    });
}