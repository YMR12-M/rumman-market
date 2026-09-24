/**
 * نقطة دخول التطبيق.
 * ترتيب المزوّدات (Providers) مقصود: كل مزوّد يعتمد على الذي فوقه.
 *   Theme → Toast → Site → Branch → Auth → Wishlist → Cart
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';
import { ThemeProvider } from '@/context/ThemeContext.jsx';
import { SiteProvider } from '@/context/SiteContext.jsx';
import { ToastProvider } from '@/context/ToastContext.jsx';
import { BranchProvider } from '@/context/BranchContext.jsx';
import { AuthProvider } from '@/context/AuthContext.jsx';
import { CartProvider } from '@/context/CartContext.jsx';
import { WishlistProvider } from '@/context/WishlistContext.jsx';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/product.css';
import './styles/pages.css';
import './styles/admin.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
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
  </StrictMode>,
);
