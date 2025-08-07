import React, { useState } from 'react';
import { X, Send } from 'lucide-react';

interface DemoRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoRequestModal: React.FC<DemoRequestModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Debug modal props
  console.log('DemoRequestModal render - isOpen:', isOpen);
  console.log('DemoRequestModal render - onClose function:', typeof onClose);

  // Force modal to be visible for testing
  if (isOpen) {
    console.log('Modal should be visible now!');
    // Add a temporary alert to confirm modal is trying to render
    setTimeout(() => {
      console.log('Modal render timeout - checking if visible');
    }, 100);
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Integrate with backend API
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Store in localStorage for demo purposes
      const demoRequests = JSON.parse(localStorage.getItem('demoRequests') || '[]');
      demoRequests.push({
        ...formData,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('demoRequests', JSON.stringify(demoRequests));
      
      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
        setIsSubmitted(false);
        setFormData({ name: '', email: '', company: '', role: '' });
      }, 2000);
    } catch (error) {
      console.error('Error submitting demo request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Simple fallback modal for testing
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        zIndex: 10000
      }}>
        <h2 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: 'bold' }}>
          🎉 Demo Request Modal is Working!
        </h2>
        <p style={{ marginBottom: '20px' }}>
          The modal is rendering correctly! This is a test version.
        </p>
        <button 
          onClick={onClose}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Close Modal
        </button>
      </div>
    </div>
  );
};
