import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useProjects } from './useProjects';
import * as api from '@/lib/api';

// Mock the API module
vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useProjects());
    
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('returns error state on 500 and allows retry', async () => {
    const mockGet = vi.mocked(api.api.get);
    
    // First call fails with 500
    mockGet.mockRejectedValueOnce({ 
      status: 500, 
      message: 'Internal server error' 
    });

    const { result } = renderHook(() => useProjects());
    
    // Wait for the effect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.status).toBe(500);
    expect(result.current.error?.message).toBe('Internal server error');
    expect(result.current.data).toBe(null);

    // Second call succeeds
    mockGet.mockResolvedValueOnce({ 
      data: { 
        success: true, 
        data: [
          { id: '1', name: 'Test Project' },
          { id: '2', name: 'Another Project' }
        ] 
      } 
    });

    // Retry
    await act(async () => {
      result.current.refetch();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.data).toEqual([
      { id: '1', name: 'Test Project' },
      { id: '2', name: 'Another Project' }
    ]);
  });

  it('handles successful API response', async () => {
    const mockGet = vi.mocked(api.api.get);
    const mockData = [
      { id: '1', name: 'Project 1' },
      { id: '2', name: 'Project 2' }
    ];

    mockGet.mockResolvedValueOnce({ 
      data: { 
        success: true, 
        data: mockData 
      } 
    });

    const { result } = renderHook(() => useProjects());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.data).toEqual(mockData);
  });

  it('handles empty response gracefully', async () => {
    const mockGet = vi.mocked(api.api.get);

    mockGet.mockResolvedValueOnce({ 
      data: { 
        success: true, 
        data: [] 
      } 
    });

    const { result } = renderHook(() => useProjects());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.data).toEqual([]);
  });

  it('handles malformed response gracefully', async () => {
    const mockGet = vi.mocked(api.api.get);

    mockGet.mockResolvedValueOnce({ 
      data: { 
        success: true, 
        data: null 
      } 
    });

    const { result } = renderHook(() => useProjects());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.data).toEqual([]);
  });

  it('handles network errors', async () => {
    const mockGet = vi.mocked(api.api.get);

    mockGet.mockRejectedValueOnce({ 
      status: 0, 
      message: 'Network error' 
    });

    const { result } = renderHook(() => useProjects());
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.error?.status).toBe(0);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.data).toBe(null);
  });
});
