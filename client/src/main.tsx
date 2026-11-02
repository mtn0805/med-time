import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import { AuthProvider } from './lib/auth';
import App from './App';
import './styles.css';
const cache = createCache({ key: 'muirtl', stylisPlugins: [prefixer, rtlPlugin] });
const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: { main: '#087e82', dark: '#07575b', light: '#e5f5f3' },
    secondary: { main: '#d69756' },
    background: { default: '#f5f8fa', paper: '#fff' },
    text: { primary: '#153445', secondary: '#647b87' },
  },
  typography: {
    fontFamily: 'Arial, "Noto Sans Hebrew", sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 800 },
    h4: { fontWeight: 800 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 10, padding: '10px 21px' } },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiCard: {
      styleOverrides: { root: { boxShadow: '0 8px 32px #173e4f08', border: '1px solid #e2ebef' } },
    },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 700, background: '#f5f9fa' } } },
  },
});
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 15_000 } },
});
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </CacheProvider>
  </React.StrictMode>,
);
