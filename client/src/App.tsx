import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Link as RouterLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import { ROLE_LABELS, type Role } from '@medtime/shared';
import { useAuth, dashboardPath } from './lib/auth';
const HomePage = lazy(() => import('./pages/HomePage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const PatientPage = lazy(() => import('./pages/PatientPage'));
const DoctorPage = lazy(() => import('./pages/DoctorPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
import FeedbackDialog from './components/FeedbackDialog';
function Protected({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, isLoading, error } = useAuth();
  if (isLoading)
    return (
      <Box sx={{ p: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={dashboardPath(user.role)} replace />;
  return children;
}
export default function App() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();
  useEffect(() => {
    const events = new EventSource('/api/events');
    events.onopen = () => {
      setConnected(true);
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
    };
    events.onerror = () => setConnected(false);
    events.onmessage = () => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
      void queryClient.invalidateQueries({ queryKey: ['doctors'] });
      void queryClient.invalidateQueries({ queryKey: ['history'] });
    };
    return () => events.close();
  }, [queryClient]);
  useEffect(() => {
    window.scrollTo(0, 0);
    setError('');
  }, [location.pathname]);
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: '1px solid #e3ecee',
          bgcolor: '#ffffffed',
          backdropFilter: 'blur(14px)',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar
            disableGutters
            sx={{
              gap: 3,
              minHeight: '80px!important',
              flexWrap: { xs: 'wrap', md: 'nowrap' },
              py: { xs: 1, md: 0 },
            }}
          >
            <Box
              component={RouterLink}
              to="/"
              sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}
              aria-label="MedTime — דף הבית"
            >
              <span className="brand-mark">+</span>
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, letterSpacing: -1, direction: 'ltr' }}
              >
                Med<span style={{ color: '#087e82' }}>Time</span>
              </Typography>
            </Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: { xs: 'none', lg: 'block' }, borderRight: '1px solid #dce5e8', pr: 3 }}
            >
              בריאות. בזמן שלכם.
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Button component={RouterLink} to="/" color="inherit">
              הרופאים שלנו
            </Button>
            {user ? (
              <>
                <Button component={RouterLink} to={dashboardPath(user.role)} color="inherit">
                  {user.role === 'patient'
                    ? 'התורים שלי'
                    : user.role === 'doctor'
                      ? 'היומן שלי'
                      : 'ניהול מרפאה'}
                </Button>
                <Box
                  component={RouterLink}
                  to="/profile"
                  sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
                >
                  <Avatar
                    sx={{
                      width: 34,
                      height: 34,
                      bgcolor: 'primary.light',
                      color: 'primary.dark',
                      fontSize: 15,
                    }}
                  >
                    {user.name.slice(0, 1)}
                  </Avatar>
                  <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Typography variant="body2" fontWeight={700}>
                      {user.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {ROLE_LABELS[user.role]}
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  aria-label="יציאה מהמערכת"
                  onClick={() => void logout().catch((e) => setError(e.message))}
                >
                  <LogoutRounded fontSize="small" />
                </IconButton>
              </>
            ) : (
              <Button component={RouterLink} to="/login" variant="contained">
                כניסה למערכת
              </Button>
            )}
          </Toolbar>
        </Container>
      </AppBar>
      {error && (
        <Container sx={{ pt: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      )}
      <Box component="main" sx={{ flex: 1 }}>
        <Suspense
          fallback={
            <Box role="status" aria-label="טוען עמוד" sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage register />} />
            <Route
              path="/my-appointments"
              element={
                <Protected roles={['patient']}>
                  <PatientPage />
                </Protected>
              }
            />
            <Route
              path="/schedule"
              element={
                <Protected roles={['doctor']}>
                  <DoctorPage />
                </Protected>
              }
            />
            <Route
              path="/admin"
              element={
                <Protected roles={['admin']}>
                  <Container maxWidth="xl" sx={{ py: 5 }}>
                    <AdminPage />
                  </Container>
                </Protected>
              }
            />
            <Route
              path="/profile"
              element={
                <Protected roles={['patient', 'doctor', 'admin']}>
                  <ProfilePage />
                </Protected>
              }
            />
            <Route
              path="*"
              element={
                <Container sx={{ py: 10, textAlign: 'center' }}>
                  <Typography variant="h4">העמוד לא נמצא</Typography>
                  <Button component={RouterLink} to="/" sx={{ mt: 3 }}>
                    חזרה לדף הבית
                  </Button>
                </Container>
              }
            />
          </Routes>
        </Suspense>
      </Box>
      <Box
        component="footer"
        sx={{ mt: 8, borderTop: '1px solid #e1e9ed', bgcolor: 'white', py: 3 }}
      >
        <Container maxWidth="xl">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            gap={2}
            flexWrap="wrap"
          >
            <Typography variant="body2" color="text.secondary">
              MedTime · רפואה אישית. ניהול חכם.
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                size="small"
                variant="outlined"
                color={connected ? 'success' : 'default'}
                label={connected ? 'עדכונים בזמן אמת פעילים' : 'מתחבר לעדכונים בזמן אמת'}
              />
              {user && (
                <Button
                  size="small"
                  startIcon={<ChatBubbleOutlineRounded />}
                  onClick={() => setFeedback(true)}
                >
                  הצעות ומשוב
                </Button>
              )}
            </Stack>
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" color="text.secondary">
            השעות מוצגות לפי שעון ישראל · המערכת מיועדת לתיאום ולניהול ביקורים
          </Typography>
        </Container>
      </Box>
      <FeedbackDialog open={feedback} onClose={() => setFeedback(false)} />
    </Box>
  );
}
