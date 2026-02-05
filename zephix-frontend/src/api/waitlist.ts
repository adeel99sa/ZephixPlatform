/**
 * Waitlist API Service
 * Handles form submissions for early access requests
 */

import { request } from '@/lib/api';

export interface WaitlistData {
  name: string;
  email: string;
  company?: string;
  biggestChallenge?: string;
}

export interface WaitlistJoinResponse {
  position: number;
  message?: string;
}

export const waitlistApi = {
  async join(data: WaitlistData): Promise<WaitlistJoinResponse> {
    const response = await request.post<WaitlistJoinResponse>('/waitlist', {
      ...data,
      source: 'landing-page'
    });
    return response;
  }
};


