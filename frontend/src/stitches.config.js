import { createStitches } from '@stitches/react';

export const {
  styled,
  css,
  globalCss,
  theme,
  keyframes,
  getCssText,
  config,
} = createStitches({
  theme: {
    colors: {
      primary: '#2ecc40',
      secondary: '#222',
      accent: '#ffb3d1',
      background: '#f6f6f6',
    },
    fonts: {
      heading: 'Montserrat, Inter, system-ui, sans-serif',
      body: 'Inter, system-ui, sans-serif',
    },
    radii: {
      sm: '4px',
      md: '8px',
      lg: '16px',
      full: '9999px',
    },
  },
}); 