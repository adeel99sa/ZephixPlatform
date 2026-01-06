import { Lock } from 'lucide-react';

export default function AuthenticationSettingsPage() {
  return (
    <div className="p-6" data-testid="admin-security-auth-root">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Lock className="h-6 w-6" />
          Authentication Settings
        </h1>
        <p className="text-gray-600 mt-2">
          Configure authentication methods and security policies for your organization.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Current Authentication Model</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <div>
                  <strong>Email and Password:</strong> Standard email/password authentication is enabled for all users.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <div>
                  <strong>JWT Tokens:</strong> Secure JSON Web Tokens are used for session management.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-600">○</span>
                <div>
                  <strong>Two-Factor Authentication (2FA):</strong> Planned for future release.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-600">○</span>
                <div>
                  <strong>Single Sign-On (SSO):</strong> Planned for future release.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-600">○</span>
                <div>
                  <strong>Password Policy:</strong> Custom password requirements planned for future release.
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500">
              <strong>TODO:</strong> Implement authentication settings UI and backend integration for 2FA, SSO, and password policies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


















