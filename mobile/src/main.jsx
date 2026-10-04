/**
 * نقطة دخول تطبيق الجوّال.
 * ترتيب المزوّدات مطابق للواجهة المكتبية، لأن السياقات المشتركة نفسها
 * تعتمد عليه: كل مزوّد يستخدم الذي فوقه.
 *   Theme → Toast → Site → Branch → Auth → Wishlist → Cart
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';
import { ErrorBoundary } from '@/components/ui/Feedback.jsx';
import { ThemeProvider } from '@/context/ThemeContext.jsx';
import { ToastProvider } from '@/context/ToastContext.jsx';
import { SiteProvider } from '@/context/SiteContext.jsx';
import { BranchProvider } from '@/context/BranchContext.jsx';
import { AuthProvider } from '@/context/AuthContext.jsx';
import { WishlistProvider } from '@/context/WishlistContext.jsx';
import { CartProvider } from '@/context/CartContext.jsx';
import { registerServiceWorker } from '@/lib/register-sw.js';

import './styles/tokens.css';
import './styles/tokens-phone.css';
import './styles/print.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/components.css';
import './styles/screens.css';

// العمل دون اتصال والتثبيت على الشاشة الرئيسية. لا يفعل شيئًا في التطوير.
registerServiceWorker();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <SiteProvider>
              <BranchProvider>
                <AuthProvider>
                  <WishlistProvider>
                    <CartProvider>
                      <App />
                    </CartProvider>
                  </WishlistProvider>
                </AuthProvider>
              </BranchProvider>
            </SiteProvider>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
