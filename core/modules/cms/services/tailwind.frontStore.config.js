// Storefront Tailwind config. Colours, fonts and the default radius point to
// the CSS variables in `pages/frontStore/all/tokens.scss`, so a theme can
// restyle utilities such as `text-interactive` by overriding those variables.
// A theme's own `tailwind.config.js` is deep-merged on top of this one.
export default {
  theme: {
    extend: {
      colors: {
        white: '#ffffff',
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        surface: 'var(--surface)',
        onSurface: 'var(--onSurface)',
        interactive: 'var(--interactive)',
        critical: 'var(--critical)',
        warning: 'var(--warning)',
        highlight: 'var(--highlight)',
        success: 'var(--success)',
        decorative: 'var(--decorative)',
        border: 'var(--border)',
        icon: 'var(--icon)',
        divider: 'var(--divider)',
        text: 'var(--text)',
        textSubdued: 'var(--textSubdued)',
        background: 'var(--background)',
        button: 'var(--button-bg)'
      },
      fontFamily: {
        sans: ['var(--font-body)'],
        heading: ['var(--font-heading)'],
        subheading: ['var(--font-subheading)']
      },
      borderRadius: {
        DEFAULT: 'var(--radius)'
      },
      boxShadow: {
        DEFAULT: '0 0 0 1px rgba(63,63,68,.05),0 1px 3px 0 rgba(63,63,68,.15)'
      }
    }
  },
  variants: {
    extend: {
      borderWidth: ['first', 'last'],
      margin: ['first', 'last'],
      padding: ['first', 'last']
    }
  }
};
