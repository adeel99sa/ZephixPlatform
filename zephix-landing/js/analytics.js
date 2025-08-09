// Analytics Configuration and Initialization
(function() {
    'use strict';
    
    // Check if we're in production (not localhost or file://)
    const isProduction = window.location.hostname !== 'localhost' && 
                        window.location.hostname !== '127.0.0.1' && 
                        !window.location.hostname.includes('netlify.app') && // Remove this if you want analytics on previews
                        window.location.protocol !== 'file:';
    
    // Analytics configuration
    const analytics = {
        plausible: {
            enabled: true,
            domain: 'getzephix.com', // Replace with your domain
            src: 'https://plausible.io/js/script.js' // Or your self-hosted instance
        },
        googleAnalytics: {
            enabled: false, // Set to true to enable GA
            measurementId: 'G-XXXXXXXXXX', // Replace with your GA4 measurement ID
            requireConsent: true // Set to false to load GA without cookie banner
        }
    };
    
    // Make analytics config available globally
    window.analyticsConfig = analytics;
    window.isProduction = isProduction;
    
    // Load Plausible Analytics
    if (isProduction && analytics.plausible.enabled) {
        const plausibleScript = document.createElement('script');
        plausibleScript.defer = true;
        plausibleScript.setAttribute('data-domain', analytics.plausible.domain);
        plausibleScript.src = analytics.plausible.src;
        document.head.appendChild(plausibleScript);
    }
    
    // Google Analytics loader function
    function loadGoogleAnalytics() {
        // Google tag (gtag.js)
        const gtagScript = document.createElement('script');
        gtagScript.async = true;
        gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${analytics.googleAnalytics.measurementId}`;
        document.head.appendChild(gtagScript);
        
        // Initialize gtag
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', analytics.googleAnalytics.measurementId, {
            cookie_flags: 'SameSite=None;Secure',
            anonymize_ip: true
        });
        
        // Make gtag available globally
        window.gtag = gtag;
    }
    
    // Load Google Analytics
    if (isProduction && analytics.googleAnalytics.enabled) {
        // Load GA immediately if no cookie banner, or wait for consent
        if (!analytics.googleAnalytics.requireConsent) {
            loadGoogleAnalytics();
        } else {
            // Wait for cookie consent - will be handled by cookie banner
            window.loadGoogleAnalytics = loadGoogleAnalytics;
        }
    }
    
    // Universal analytics tracking function
    window.trackEvent = function(eventName, parameters = {}) {
        // Plausible Analytics
        if (typeof plausible !== 'undefined') {
            plausible(eventName, { props: parameters });
        }
        
        // Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, parameters);
        }
        
        console.log('Analytics Event:', eventName, parameters);
    };
})();
