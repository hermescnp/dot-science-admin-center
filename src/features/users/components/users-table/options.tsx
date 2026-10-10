export const ACCESS_OPTIONS = [
  { value: 'admin', label: 'Platform admin' },
  { value: 'member', label: 'Member' }
];

const providerLabels: Record<string, string> = {
  email: 'Email',
  google: 'Google',
  github: 'GitHub',
  apple: 'Apple',
  azure: 'Microsoft'
};

export function providerLabel(provider: string) {
  return providerLabels[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}
