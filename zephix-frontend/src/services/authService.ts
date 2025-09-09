class AuthService {
  // Get token from Zustand store
  getToken(): string | null {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const data = JSON.parse(authStorage);
        return data.state?.token || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser() {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const data = JSON.parse(authStorage);
        return data.state?.user || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  // Remove login/logout methods - these belong in authStore only
}

export default new AuthService();