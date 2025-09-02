/**
 * Waitlist API Service
 * Handles form submissions for early access requests
 */

import { apiPost } from '../services/api.service';

export interface WaitlistData {
  name: string;
  email: string;
  company?: string;
  biggestChallenge?: string;
}

export const waitlistApi = {
  async join(data: WaitlistData) {
    const response = await apiPost('/waitlist', {
      ...data,
      source: 'landing-page'
    });
    return response;
  }
};


