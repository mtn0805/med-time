import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { Doctor, Slot } from '@medtime/shared';
import { useAuth } from '../lib/auth';
import { api, RequestError } from '../lib/api';
import { clinicDate, timeLabel, today } from '../lib/dates';
import { EmptyState, QueryState } from './Ui';
export default function BookingDialog({
  open,
  onClose,
  doctor,
  patientId,
}: {
  open: boolean;
  onClose: () => void;
  doctor?: Doctor;
  patientId?: string;
}) {
  const { user } = useAuth();
  const [date, setDate] = useState(today);
  const [selected, setSelected] = useState('');
  const [note, setNote] = useState('');
  const client = useQueryClient();
  const slots = useQuery({
    queryKey: ['availability', doctor?.id, date],
    queryFn: () => api.get<Slot[]>(`/doctors/${doctor!.id}/availability?date=${date}`),
    enabled: open && !!doctor && !!date,
  });
  const booking = useMutation({
    mutationFn: () =>
      api.post('/appointments', {
        doctorId: doctor!.id,
        startAt: selected,
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(patientId ? { patientId } : {}),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['appointments'] });
      void client.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (error) => {
      if (error instanceof RequestError && error.status === 409) {
        setSelected('');
        void slots.refetch();
      }
    },
  });
  useEffect(() => {
    if (open) {
      setDate(today());
      setSelected('');
      setNote('');
      booking.reset();
    }
  }, [open, doctor?.id]);
  useEffect(() => {
    setSelected('');
  }, [date]);
  const validSelected = slots.data?.some((slot) => slot.startAt === selected);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {booking.isSuccess ? 'התור נקבע בהצלחה' : 'קובעים זמן לבריאות'}
        {doctor && (
          <Typography component="p" variant="body2" color="text.secondary" mt={1}>
            {doctor.name} · {doctor.specialty}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        {booking.isSuccess ? (
          <Alert severity="success">התור נוסף ליומן שלכם. ניתן לצפות בפרטים במסך התורים.</Alert>
        ) : (
          <Stack spacing={3} sx={{ pt: 1 }}>
            {!user && (
              <Alert
                severity="info"
                action={
                  <Button component={RouterLink} to="/login" size="small">
                    כניסה
                  </Button>
                }
              >
                אפשר לראות זמינות. כדי להזמין תור יש להיכנס למערכת.
              </Alert>
            )}
            {user?.role === 'doctor' && (
              <Alert severity="info">הזמנת תורים זמינה למטופלים ולמנהלי המרפאה.</Alert>
            )}
            {user?.role === 'admin' && !patientId && (
              <Alert
                severity="info"
                action={
                  <Button component={RouterLink} to="/admin" size="small">
                    לניהול המרפאה
                  </Button>
                }
              >
                קביעת תור למטופל מתבצעת במסך ניהול המרפאה.
              </Alert>
            )}
            <TextField
              label="תאריך התור"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value || today())}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { min: today(), max: clinicDate().add(89, 'day').format('YYYY-MM-DD') },
              }}
            />
            <Box>
              <Typography fontWeight={700} mb={1.5}>
                שעות פנויות
              </Typography>
              <QueryState isPending={slots.isPending} error={slots.error} />
              {!slots.isPending && !slots.error && slots.data?.length === 0 && (
                <EmptyState
                  title="אין שעות פנויות ביום הזה"
                  description="בחרו יום אחר ונבדוק עבורכם את הזמינות."
                />
              )}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))',
                  gap: 1,
                }}
              >
                {slots.data?.map((slot) => (
                  <Button
                    key={slot.startAt}
                    variant={selected === slot.startAt ? 'contained' : 'outlined'}
                    sx={{ minWidth: 0, direction: 'ltr' }}
                    onClick={() => setSelected(slot.startAt)}
                    aria-pressed={selected === slot.startAt}
                  >
                    {timeLabel(slot.startAt)}
                  </Button>
                ))}
              </Box>
            </Box>
            {user && (
              <TextField
                label="הערה לתור (לא חובה)"
                multiline
                minRows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                inputProps={{ maxLength: 1000 }}
              />
            )}
            {booking.error && <Alert severity="error">{booking.error.message}</Alert>}
            {selected && validSelected && (
              <>
                <Divider />
                <Chip
                  color="primary"
                  variant="outlined"
                  label={`${clinicDate(selected).format('DD.MM.YYYY')} בשעה ${timeLabel(selected)}`}
                />
              </>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>{booking.isSuccess ? 'סגירה' : 'ביטול'}</Button>
        {!booking.isSuccess && (
          <Button
            variant="contained"
            disabled={
              !user ||
              user.role === 'doctor' ||
              (user.role === 'admin' && !patientId) ||
              !selected ||
              !validSelected ||
              booking.isPending
            }
            onClick={() => booking.mutate()}
          >
            {booking.isPending ? 'מאשרים את התור…' : 'אישור קביעת תור'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
