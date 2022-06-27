module.exports = {
  purge: {
    enabled: true,
    content: ['../../templates/*.html','../../templates/articles/*.html','dynamic.html']
  },
  darkMode: 'media',
  theme: {
    flex: {
      '1': '1 1 12%',
      '6': '6 1 76%',
      auto: '1 1 auto',
      initial: '0 1 auto',
      inherit: 'inherit',
      none: 'none',
    },
    boxShadow: {
      sm: '16px 16px #18181B',
    },
    minWidth: {
      '0': '0',
      '1/4': '25%',
      '1/2': '50%',
      '3/4': '75%',
      'full': '100%',
     },
    fontFamily: {
      display: ['Quicksand', 'sans-serif'],
      body: ['Roboto', 'sans-serif'],
      mono: ['Space mono','monospace']
    },
    fontSize: {
      'xs': '.75rem',
      'sm': '.8rem',
      'tiny': '.5rem',
      'base': '1rem',
      'lg': '1.25rem',
      'xl': '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '4rem',
      '12xl': '8rem',
    },
    extend: {
      transitionProperty: {
        'gridTemplateColumns': 'span'
      }
    }
  },
  variants: {},
  plugins: [require('tailwindcss'),
    require('autoprefixer'),
  ],
}