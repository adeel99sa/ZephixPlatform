// Cookie Banner Management
(function() {
    'use strict';
    
    document.addEventListener('DOMContentLoaded', function() {
        initializeCookieBanner();
    });
    
    function initializeCookieBanner() {
        // Only show cookie banner if Google Analytics is enabled
        if (!window.analyticsConfig || !window.analyticsConfig.googleAnalytics.enabled || !window.isProduction) {
            return;
        }
        
        const banner = document.getElementById('cookie-banner');
        const acceptBtn = document.getElementById('cookie-accept');
        const declineBtn = document.getElementById('cookie-decline');
        
        if (!banner || !acceptBtn || !declineBtn) {
            console.warn('Cookie banner elements not found');
            return;
        }
        
        // Check if user has already made a choice
        const cookieConsent = localStorage.getItem('cookieConsent');
        
        if (cookieConsent === 'accepted') {
            // Load GA if previously accepted
            if (window.loadGoogleAnalytics) {
                window.loadGoogleAnalytics();
            }
        } else if (cookieConsent === 'declined') {
            // Don't show banner if previously declined
            return;
        } else {
            // Show banner for new users
            banner.style.display = 'block';
            
            // Add slide-in animation
            setTimeout(() => {
                banner.classList.add('show');
            }, 100);
        }
        
        // Handle accept
        acceptBtn.addEventListener('click', function() {
            localStorage.setItem('cookieConsent', 'accepted');
            hideCookieBanner();
            
            // Load Google Analytics
            if (window.loadGoogleAnalytics) {
                window.loadGoogleAnalytics();
            }
            
            // Track consent
            setTimeout(() => {
                if (typeof trackEvent === 'function') {
                    trackEvent('cookie_consent', { consent: 'accepted' });
                }
            }, 1000);
        });
        
        // Handle decline
        declineBtn.addEventListener('click', function() {
            localStorage.setItem('cookieConsent', 'declined');
            hideCookieBanner();
            
            if (typeof trackEvent === 'function') {
                trackEvent('cookie_consent', { consent: 'declined' });
            }
        });
        
        function hideCookieBanner() {
            banner.classList.add('hide');
            setTimeout(() => {
                banner.style.display = 'none';
            }, 300);
        }
    }
})();
