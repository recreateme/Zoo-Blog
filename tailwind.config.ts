import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: 'var(--accent)',
          light: 'var(--accent-light)',
          subtle: 'var(--accent-subtle)',
        },
        surface: {
          base: 'var(--bg-base)',
          DEFAULT: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          sunken: 'var(--bg-sunken)',
        },
        ink: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': 'var(--text-primary)',
            '--tw-prose-headings': 'var(--text-primary)',
            '--tw-prose-links': 'var(--accent)',
            '--tw-prose-bold': 'var(--text-primary)',
            '--tw-prose-counters': 'var(--text-secondary)',
            '--tw-prose-bullets': 'var(--text-tertiary)',
            '--tw-prose-hr': 'var(--border-default)',
            '--tw-prose-quotes': 'var(--text-secondary)',
            '--tw-prose-quote-borders': 'var(--accent)',
            '--tw-prose-captions': 'var(--text-tertiary)',
            '--tw-prose-code': 'var(--accent)',
            '--tw-prose-pre-code': 'var(--text-primary)',
            '--tw-prose-pre-bg': 'var(--bg-sunken)',
            '--tw-prose-th-borders': 'var(--border-default)',
            '--tw-prose-td-borders': 'var(--border-subtle)',
            maxWidth: 'none',
            lineHeight: '1.8',
            fontFamily: 'var(--font-sans)',
            h1: { fontFamily: 'var(--font-serif)', fontWeight: '400', letterSpacing: '-0.02em' },
            h2: { fontFamily: 'var(--font-serif)', fontWeight: '400', letterSpacing: '-0.015em' },
            h3: { fontFamily: 'var(--font-serif)', fontWeight: '400' },
            h4: { fontFamily: 'var(--font-serif)', fontWeight: '400' },
            code: {
              fontFamily: 'var(--font-mono)',
              fontSize: '0.875em',
              backgroundColor: 'var(--bg-sunken)',
              padding: '0.15em 0.35em',
              borderRadius: '0.25rem',
              fontWeight: '400',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            pre: {
              fontFamily: 'var(--font-mono)',
              backgroundColor: 'var(--bg-sunken)',
              border: '1px solid var(--border-subtle)',
            },
            blockquote: {
              fontStyle: 'italic',
              fontFamily: 'var(--font-serif)',
              fontSize: '1.1em',
            },
          },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseSubtle: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

export default config
