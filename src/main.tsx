import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './fonts.css'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './serviceWorker'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker()
