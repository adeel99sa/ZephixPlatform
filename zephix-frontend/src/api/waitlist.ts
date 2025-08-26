/**
 * Waitlist API Service
 * Handles form submissions for early access requests
 */

export interface WaitlistSubmission {
  email: string;
  company: string;
  teamSize: string;
  currentTool: string;
  submittedAt: string;
  userAgent: string;
  source: string;
}

export interface WaitlistResponse {
  success: boolean;
  message: string;
  submissionId?: string;
}

/**
 * Submit waitlist form data
 * @param data - Form submission data
 * @returns Promise with submission result
 */
export const submitWaitlist = async (data: WaitlistSubmission): Promise<WaitlistResponse> => {
  try {
    // In a real implementation, this would be your actual API endpoint
    // For now, we'll simulate the API call
    const response = await fetch('/api/waitlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      message: 'Thank you! We\'ll be in touch soon.',
      submissionId: result.submissionId,
    };
  } catch (error) {
    console.error('Waitlist submission error:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return {
          success: false,
          message: 'Too many submission attempts. Please try again in an hour.',
        };
      }
      
      if (error.message.includes('validation')) {
        return {
          success: false,
          message: 'Please check your information and try again.',
        };
      }
    }
    
    return {
      success: false,
      message: 'Something went wrong. Please try again or contact us directly.',
    };
  }
};

/**
 * Check if user is already on waitlist
 * @param email - Email to check
 * @returns Promise with check result
 */
export const checkWaitlistStatus = async (email: string): Promise<{ exists: boolean; status?: string }> => {
  try {
    const response = await fetch(`/api/waitlist/check?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!response.ok) {
      return { exists: false };
    }

    const result = await response.json();
    return {
      exists: result.exists,
      status: result.status,
    };
  } catch (error) {
    console.error('Waitlist status check error:', error);
    return { exists: false };
  }
};

/**
 * Get waitlist statistics (for admin purposes)
 * @returns Promise with waitlist stats
 */
export const getWaitlistStats = async (): Promise<{
  totalSubmissions: number;
  recentSubmissions: number;
  topCompanies: Array<{ company: string; count: number }>;
  topTools: Array<{ tool: string; count: number }>;
}> => {
  try {
    const response = await fetch('/api/waitlist/stats', {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Waitlist stats error:', error);
    return {
      totalSubmissions: 0,
      recentSubmissions: 0,
      topCompanies: [],
      topTools: [],
    };
  }
};

/**
 * Export waitlist data (for admin purposes)
 * @param format - Export format (csv, json, xlsx)
 * @returns Promise with export data
 */
export const exportWaitlistData = async (format: 'csv' | 'json' | 'xlsx' = 'csv'): Promise<Blob> => {
  try {
    const response = await fetch(`/api/waitlist/export?format=${format}`, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.blob();
  } catch (error) {
    console.error('Waitlist export error:', error);
    throw new Error('Failed to export waitlist data');
  }
};

// Mock implementation for development/testing
export const mockSubmitWaitlist = async (data: WaitlistSubmission): Promise<WaitlistResponse> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
  
  // Simulate random failures (10% chance)
  if (Math.random() < 0.1) {
    throw new Error('Simulated network error');
  }
  
  // Simulate validation errors
  if (data.email.includes('test')) {
    return {
      success: false,
      message: 'Test emails are not allowed.',
    };
  }
  
  // Success case
  return {
    success: true,
    message: 'Thank you! We\'ll be in touch soon.',
    submissionId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
};

// Export mock function for development
export { mockSubmitWaitlist as submitWaitlistMock };


