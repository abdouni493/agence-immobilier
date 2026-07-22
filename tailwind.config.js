/** @type {import('tailwindcss').Config} */

/* ───────────────────────────────────────────────────────────────────────────
 * DARK-GREY THEME
 *
 * The whole UI is written with the "light" utility vocabulary (bg-white,
 * bg-slate-100, text-slate-900, text-emerald-600 …). Instead of rewriting
 * every className, we re-map the underlying palette so that vocabulary renders
 * a coherent dark-grey theme:
 *
 *   • the slate/gray ramps are INVERTED → slate-50 is the darkest surface,
 *     slate-900 the lightest text.
 *   • accent ramps: 50/100/200 become dark tints (panels & borders),
 *     600/700/800/900 become light shades (readable on dark).
 *     300/400/500 keep their original values (already readable).
 *   • `bg-white` is overridden in index.css — `text-white` must stay white.
 * ─────────────────────────────────────────────────────────────────────────── */

/** Build an accent ramp: dark tints low, originals mid, light shades high. */
const accent = (t50, t100, t200, c300, c400, c500, l600, l700, l800, l900) => ({
  50: t50,
  100: t100,
  200: t200,
  300: c300,
  400: c400,
  500: c500,
  600: l600,
  700: l700,
  800: l800,
  900: l900,
});

const grey = {
  50: '#191c21',
  100: '#1f232a',
  200: '#2b3038',
  300: '#3a4049',
  400: '#6f7780',
  500: '#8d959f',
  600: '#aeb6c0',
  700: '#c8cfd8',
  800: '#dfe4ea',
  900: '#f2f5f8',
  950: '#ffffff',
};

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: grey,
        gray: grey,
        neutral: grey,
        zinc: grey,

        bg: {
          dark: '#121417',
          card: '#1c2026',
          panel: '#181b20',
        },
        ink: {
          primary: '#f2f5f8',
          secondary: '#b6bec8',
          muted: '#7d858f',
        },

        brand: {
          50: '#16203a',
          100: '#1b2a4c',
          200: '#24365f',
          300: '#3f6bb8',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#93c5fd',
          800: '#bfdbfe',
          900: '#dbeafe',
        },

        emerald: accent('#14261f', '#17362b', '#1f4a3a', '#6ee7b7', '#34d399', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'),
        green:   accent('#16261a', '#1a361f', '#204826', '#86efac', '#4ade80', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7'),
        teal:    accent('#142524', '#163431', '#1b4844', '#5eead4', '#2dd4bf', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1'),
        cyan:    accent('#12262b', '#14353c', '#184953', '#67e8f9', '#22d3ee', '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc', '#cffafe'),
        sky:     accent('#14212e', '#172d3f', '#1d3e57', '#7dd3fc', '#38bdf8', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe'),
        blue:    accent('#16203a', '#1b2a4c', '#24365f', '#93c5fd', '#60a5fa', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'),
        indigo:  accent('#1a1d33', '#232746', '#2f3560', '#a5b4fc', '#818cf8', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'),
        violet:  accent('#1f1b2e', '#2a233f', '#392e57', '#c4b5fd', '#a78bfa', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'),
        purple:  accent('#231b2e', '#30243f', '#423057', '#d8b4fe', '#c084fc', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff', '#f3e8ff'),
        rose:    accent('#2a161b', '#3a1c24', '#522733', '#fda4af', '#fb7185', '#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#ffe4e6'),
        red:     accent('#2b1717', '#3b1d1d', '#532727', '#fca5a5', '#f87171', '#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'),
        orange:  accent('#2b1e15', '#3c2917', '#53381b', '#fdba74', '#fb923c', '#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'),
        amber:   accent('#2a2116', '#3a2d18', '#513e1c', '#fcd34d', '#fbbf24', '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7'),
        yellow:  accent('#2a2614', '#3a3417', '#51491c', '#fde047', '#facc15', '#eab308', '#facc15', '#fde047', '#fef08a', '#fef9c3'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'Tajawal', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'grad-primary': 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #0891b2 100%)',
        'grad-secondary': 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #4F46E5 100%)',
        'grad-success': 'linear-gradient(135deg, #34D399 0%, #10B981 55%, #059669 100%)',
        'grad-warning': 'linear-gradient(135deg, #FBBF24 0%, #FB7185 60%, #EF4444 100%)',
        'grad-gold': 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 55%, #D97706 100%)',
        'grad-rose': 'linear-gradient(135deg, #FB7185 0%, #F43F5E 50%, #E11D8F 100%)',
        'grad-teal': 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 55%, #0D9488 100%)',
        'grad-purple': 'linear-gradient(135deg, #A855F7 0%, #8B5CF6 50%, #6D28D9 100%)',
        'grad-cyan': 'linear-gradient(135deg, #22D3EE 0%, #06B6D4 55%, #0891B2 100%)',
        'grad-surface': 'linear-gradient(145deg, #1c2026 0%, #22272f 55%, #2a3038 100%)',
      },
      boxShadow: {
        glow: '0 10px 26px -6px rgba(37,99,235,0.45)',
        'glow-lg': '0 16px 40px -8px rgba(37,99,235,0.5)',
        card: '0 10px 30px rgba(0,0,0,0.45)',
      },
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'gradient-shift': 'gradient-shift 8s ease infinite',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 1.5s infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
