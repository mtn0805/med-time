import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import { ROLE_LABELS, type User } from '@medtime/shared';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { PageHeading } from '../components/Ui';
export default function ProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const client = useQueryClient();
  const update = useMutation({
    mutationFn: () => api.patch<User>('/auth/me', { name, phone }),
    onSuccess: (user) => client.setQueryData(['auth'], user),
  });
  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <PageHeading title="הפרופיל שלי" subtitle="הפרטים האישיים שלכם, במקום אחד." />
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 4 } }}>
        <Stack
          component="form"
          spacing={3}
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate();
          }}
        >
          <Typography color="text.secondary">
            סוג חשבון: {user && ROLE_LABELS[user.role]}
          </Typography>
          {update.error && <Alert severity="error">{update.error.message}</Alert>}
          {update.isSuccess && <Alert severity="success">הפרטים עודכנו בהצלחה</Alert>}
          <TextField
            label="שם מלא"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            inputProps={{ minLength: 2, maxLength: 100 }}
          />
          <TextField
            label="אימייל"
            value={user?.email || ''}
            disabled
            inputProps={{ dir: 'ltr' }}
            helperText="כתובת האימייל משמשת להזדהות במערכת"
          />
          <TextField
            label="מספר טלפון"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            required
            inputProps={{ maxLength: 30, dir: 'ltr' }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={update.isPending}
            sx={{ alignSelf: 'flex-start' }}
          >
            שמירת שינויים
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
