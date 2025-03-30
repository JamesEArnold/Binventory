/**
 * @description Design system implementation from Phase 3.1: Core Web Interface
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

export const designSystem = {
  colors: {
    primary: '#0066CC',
    secondary: '#4C9AFF',
    success: '#36B37E',
    warning: '#FFAB00',
    error: '#FF5630',
    background: '#FFFFFF',
    surface: '#F4F5F7',
    text: {
      primary: '#172B4D',
      secondary: '#6B778C',
      disabled: '#A5ADBA',
      inverse: '#FFFFFF'
    },
    border: '#DFE1E6'
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    }
  },
  spacing: {
    unit: 4, // px
    xs: '0.25rem', // 4px
    sm: '0.5rem',  // 8px
    md: '1rem',    // 16px
    lg: '1.5rem',  // 24px
    xl: '2rem',    // 32px
    '2xl': '2.5rem', // 40px
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px'
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
  borderRadius: {
    sm: '0.125rem',
    md: '0.25rem',
    lg: '0.5rem',
    full: '9999px',
  }
}; 