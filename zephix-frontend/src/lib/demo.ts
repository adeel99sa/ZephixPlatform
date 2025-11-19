export const DEMO_EMAILS = new Set([
  'demo@zephix.ai',
  'admin@zephix.ai',
  'member@zephix.ai',
  'guest@zephix.ai'
]);

export const isDemoUser = (email?: string) => !!email && DEMO_EMAILS.has(email);

export const getDemoModeMessage = (email?: string) => {
  if (!isDemoUser(email)) return null;
  return `Demo Mode: destructive actions are disabled for ${email}`;
};

