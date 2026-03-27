export const lightTheme = {
  background: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',
    tertiary: '#F1F5F9',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#94A3B8',
    inverse: '#FFFFFF',
  },
  border: {
    light: '#E2E8F0',
    medium: '#CBD5E1',
    dark: '#94A3B8',
  },
  accent: {
    primary: '#0066CC',
    primaryHover: '#0052A3',
    secondary: '#6366F1',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  surface: {
    success: '#ECFDF5',
    danger: '#FEF2F2',
    warning: '#FFFBEB',
    info: '#EFF6FF',
  },
  shadow: {
    color: '#000000',
    opacity: 0.08,
  },
  gradient: {
    primary: ['#0066CC', '#0052A3'],
    accent: ['#6366F1', '#8B5CF6'],
  },
};

export const darkTheme = {
  background: {
    primary: '#0F172A',
    secondary: '#1E293B',
    tertiary: '#334155',
    card: '#1E293B',
    elevated: '#334155',
  },
  text: {
    primary: '#F1F5F9',
    secondary: '#CBD5E1',
    tertiary: '#94A3B8',
    inverse: '#0F172A',
  },
  border: {
    light: '#334155',
    medium: '#475569',
    dark: '#64748B',
  },
  accent: {
    primary: '#3B82F6',
    primaryHover: '#2563EB',
    secondary: '#818CF8',
    success: '#34D399',
    danger: '#F87171',
    warning: '#FBBF24',
    info: '#60A5FA',
  },
  surface: {
    success: '#064E3B',
    danger: '#7F1D1D',
    warning: '#78350F',
    info: '#1E3A8A',
  },
  shadow: {
    color: '#000000',
    opacity: 0.3,
  },
  gradient: {
    primary: ['#3B82F6', '#2563EB'],
    accent: ['#818CF8', '#A78BFA'],
  },
};

export type Theme = typeof lightTheme;
