/**
 * Waitlist API Service
 * Handles form submissions for early access requests
 */

import { api } from '../services/api';

export interface WaitlistData {
  name: string;
  email: string;
  company?: string;
  biggestChallenge?: string;
}

export const waitlistApi = {
  async join(data: WaitlistData) {
    const response = await api.post('/waitlist', {
      ...data,
      source: 'landing-page'
    });
    return response;
  }
};


