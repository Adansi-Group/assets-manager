


import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './theme-styles.css' // Add theme styles
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)



