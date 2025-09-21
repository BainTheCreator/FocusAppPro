/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './index.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    // './src/**/*.{js,jsx,ts,tsx}', // если используете src
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ТЁМНАЯ ПАЛИТРА ПО УМОЛЧАНИЮ
        background: '#111827',              // slate-900
        foreground: '#f3f4f6',              // gray-100

        card: '#1f2937',                    // gray-800
        'card-foreground': '#f3f4f6',

        popover: '#1f2937',
        'popover-foreground': '#f3f4f6',

        // primary — был синий, стал #35D07F
        primary: '#35D07F',
        'primary-foreground': '#ffffff',

        secondary: '#374151',               // gray-700
        'secondary-foreground': '#f3f4f6',

        muted: '#374151',
        'muted-foreground': '#9ca3af',      // gray-400

        accent: '#374151',
        'accent-foreground': '#f3f4f6',

        destructive: '#f87171',             // red-400
        'destructive-foreground': '#111827',

        border: '#4b5563',                  // gray-600
        input: '#4b5563',

        // ring — был синий, стал #35D07F
        ring: '#35D07F',

        // sidebar
        sidebar: '#1f2937',
        'sidebar-foreground': '#f3f4f6',
        'sidebar-accent': '#374151',
        'sidebar-accent-foreground': '#f3f4f6',
        'sidebar-border': '#4b5563',

        // sidebar-ring — был синий, стал #35D07F
        'sidebar-ring': '#35D07F',
      },
    },
  },
  plugins: [],
};