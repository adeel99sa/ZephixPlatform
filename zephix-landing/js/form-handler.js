// Waitlist Form Handler
(function() {
    'use strict';
    
    document.addEventListener('DOMContentLoaded', function() {
        const form = document.getElementById('waitlist-form');
        const submitBtn = document.getElementById('submit-btn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');
        const successMessage = document.getElementById('success-message');
        
        if (!form || !submitBtn) {
            console.warn('Waitlist form elements not found');
            return;
        }
        
        // Handle form submission
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(form);
            const email = formData.get('email_address');
            const role = formData.get('fields[role]');
            
            // Validate email
            if (!email || !isValidEmail(email)) {
                showError('Please enter a valid email address.');
                return;
            }
            
            // Show loading state
            setLoadingState(true);
            
            // Submit to ConvertKit
            fetch(form.action, {
                method: 'POST',
                body: formData,
                mode: 'no-cors' // ConvertKit handles CORS
            })
            .then(() => {
                // Show success message
                showSuccess();
            })
            .catch((error) => {
                console.error('Form submission error:', error);
                // Still show success as no-cors doesn't give us response details
                showSuccess();
            });
        });
        
        function setLoadingState(loading) {
            if (loading) {
                submitBtn.disabled = true;
                btnText.style.display = 'none';
                btnLoading.style.display = 'inline';
                submitBtn.style.opacity = '0.7';
            } else {
                submitBtn.disabled = false;
                btnText.style.display = 'inline';
                btnLoading.style.display = 'none';
                submitBtn.style.opacity = '1';
            }
        }
        
        function showSuccess() {
            // Hide the form
            form.style.display = 'none';
            
            // Show success message
            successMessage.style.display = 'block';
            
            // Scroll to success message
            successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Reset loading state (in case user refreshes)
            setTimeout(() => {
                setLoadingState(false);
            }, 1000);
            
            // Track analytics events
            if (typeof trackEvent === 'function') {
                trackEvent('waitlist_signup', {
                    method: 'form_submission',
                    email_domain: email.split('@')[1]
                });
            }
            
            // Track with Facebook Pixel (if you have it)
            if (typeof fbq !== 'undefined') {
                fbq('track', 'Lead');
            }
        }
        
        function showError(message) {
            alert(message); // Simple error handling
            setLoadingState(false);
        }
        
        function isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }
        
        // Add real-time email validation
        const emailInput = document.getElementById('email-input');
        if (emailInput) {
            emailInput.addEventListener('blur', function() {
                if (this.value && !isValidEmail(this.value)) {
                    this.style.borderColor = '#ef4444';
                    this.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
                } else {
                    this.style.borderColor = '';
                    this.style.boxShadow = '';
                }
            });
            
            emailInput.addEventListener('input', function() {
                // Reset border on input
                this.style.borderColor = '';
                this.style.boxShadow = '';
            });
        }
    });
})();
