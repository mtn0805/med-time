import { useState } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockOutlined from '@mui/icons-material/LockOutlined';
import { ROLE_LABELS, type Role } from '@medtime/shared';
import { useAuth, dashboardPath } from '../lib/auth';
export default function AuthPage({ register = false }: { register?: boolean }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('patient');
  const [values, setValues] = useState({ name: '', email: '', phone: '', password: '' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  if (auth.user) return <Navigate to={dashboardPath(auth.user.role)} replace />;
  const field = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues({ ...values, [key]: event.target.value });
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, md: 9 } }}>
      <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, border: '1px solid #e0e9ed' }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            bgcolor: 'primary.light',
            color: 'primary.main',
            borderRadius: 3,
            display: 'grid',
            placeItems: 'center',
            mb: 3,
          }}
        >
          <LockOutlined />
        </Box>
        <Typography component="h1" variant="h4">
          {register ? 'נעים להכיר' : 'טוב שחזרתם'}
        </Typography>
        <Typography color="text.secondary" mt={1} mb={4}>
          {register
            ? 'הרשמה קצרה — והתור הבא שלכם בהישג יד.'
            : 'היכנסו כדי לנהל את הבריאות והזמן שלכם.'}
        </Typography>
        <Stack
          component="form"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setError('');
            try {
              const user = register
                ? await auth.register(values)
                : await auth.login({ email: values.email, password: values.password, role });
              navigate(dashboardPath(user.role), { replace: true });
            } catch (error) {
              setError(error instanceof Error ? error.message : 'הפעולה נכשלה');
            } finally {
              setPending(false);
            }
          }}
          spacing={2.5}
        >
          {error && <Alert severity="error">{error}</Alert>}
          {!register && (
            <TextField
              select
              label="סוג משתמש"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          )}
          {register && (
            <TextField
              label="שם מלא"
              value={values.name}
              onChange={field('name')}
              autoComplete="name"
              required
              slotProps={{ htmlInput: { minLength: 2, maxLength: 100 } }}
            />
          )}
          <TextField
            label="כתובת אימייל"
            type="email"
            value={values.email}
            onChange={field('email')}
            autoComplete="email"
            required
            inputProps={{ dir: 'ltr', maxLength: 254 }}
          />
          {register && (
            <TextField
              label="מספר טלפון"
              type="tel"
              value={values.phone}
              onChange={field('phone')}
              autoComplete="tel"
              required
              inputProps={{ dir: 'ltr', maxLength: 30 }}
            />
          )}
          <TextField
            label="סיסמה"
            type="password"
            value={values.password}
            onChange={field('password')}
            autoComplete={register ? 'new-password' : 'current-password'}
            required
            helperText={register ? 'לפחות 10 תווים' : undefined}
            inputProps={{ minLength: register ? 10 : 1, maxLength: 72, dir: 'ltr' }}
          />
          <Button type="submit" variant="contained" size="large" disabled={pending}>
            {pending ? 'רגע, מתחברים…' : register ? 'יצירת חשבון' : 'כניסה למערכת'}
          </Button>
        </Stack>
        <Divider sx={{ my: 3 }} />
        <Typography textAlign="center" variant="body2">
          {register ? 'כבר יש לכם חשבון?' : 'עדיין אין לכם חשבון?'}{' '}
          <Button component={RouterLink} to={register ? '/login' : '/register'} size="small">
            {register ? 'כניסה' : 'הרשמה למטופלים'}
          </Button>
        </Typography>
      </Paper>
    </Container>
  );
}
