// Centralized Theme configuration based on DESIGN.md
export const Theme = {
  colors: {
    background: '#080B11', // Deep space-black base canvas
    glassSurface: 'rgba(17, 24, 39, 0.70)', // Main cards and panels
    glassBorder: 'rgba(6, 182, 212, 0.15)', // Thin glowing cyan frame
    textPrimary: '#F3F4F6', // Labels, headers, values
    textSecondary: '#9CA3AF', // Captions, subtext
    
    // Line/Voltage specific neon styling
    neon11KV: '#F59E0B',   // Neon Amber (11KV HT)
    neon33KV: '#EF4444',   // Neon Red/Coral (33KV HT)
    neon440V: '#06B6D4',   // Neon Cyan (440V LT)
    neonDTR: '#8B5CF6',    // Neon Purple (DTR Nodes)
    
    // Status colours
    glowCyan: '#06B6D4',
    glowPurple: '#8B5CF6',
    glowShadow: 'rgba(6, 182, 212, 0.4)',
    error: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
  },
  typography: {
    fontFamily: 'System',
    headerTitle: {
      fontSize: 22,
      fontWeight: '600' as const,
      letterSpacing: 0.5,
      color: '#F3F4F6',
    },
    sectionHeader: {
      fontSize: 16,
      fontWeight: '500' as const,
      color: '#06B6D4',
    },
    bodyText: {
      fontSize: 14,
      color: '#9CA3AF',
    },
    monospace: {
      fontSize: 13,
      fontFamily: 'System', // System monospace in RN is usually specified otherwise or just styled
      letterSpacing: 0.2,
    }
  },
  glassmorphic: {
    container: {
      backgroundColor: 'rgba(17, 24, 39, 0.75)',
      borderColor: 'rgba(6, 182, 212, 0.2)',
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      shadowColor: '#06B6D4',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
    },
    button: {
      backgroundColor: 'rgba(6, 182, 212, 0.12)',
      borderColor: '#06B6D4',
      borderWidth: 1.5,
      borderRadius: 8,
      shadowColor: '#06B6D4',
      shadowOpacity: 0.4,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
      elevation: 3,
    }
  }
};

export default Theme;
