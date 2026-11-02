import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import type { Appointment } from '@medtime/shared';
import { api } from '../lib/api';
import { clinicDate, dateLabel, dayBounds, timeLabel, today } from '../lib/dates';
import { EmptyState, PageHeading, QueryState, StatusChip } from '../components/Ui';
export default function DoctorPage() {
  const [date, setDate] = useState(today);
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [selected, setSelected] = useState<Appointment>();
  const bounds = dayBounds(date, mode === 'week');
  const query = useQuery({
    queryKey: ['appointments', 'doctor', date, mode],
    queryFn: () =>
      api.get<Appointment[]>(
        `/appointments?from=${encodeURIComponent(bounds.from)}&to=${encodeURIComponent(bounds.to)}`,
      ),
  });
  const appointments = query.data?.filter((a) => a.status !== 'cancelled') || [];
  const days = Array.from({ length: mode === 'week' ? 7 : 1 }, (_, i) =>
    clinicDate(date).add(i, 'day').format('YYYY-MM-DD'),
  );
  const changeDate = (direction: number) =>
    setDate(
      clinicDate(date)
        .add(direction * (mode === 'week' ? 7 : 1), 'day')
        .format('YYYY-MM-DD'),
    );
  return (
    <Container maxWidth="xl" sx={{ py: 5 }}>
      <PageHeading
        title="היומן הרפואי שלי"
        subtitle="תמונה מלאה של היום שלכם — וכל מטופל במרכז."
        action={
          <Chip
            label={`${appointments.length} ביקורים בתקופה שנבחרה`}
            color="primary"
            variant="outlined"
          />
        }
      />
      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}
      >
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, value) => value && setMode(value)}
          size="small"
          aria-label="תצוגת יומן"
        >
          <ToggleButton value="day">יומי</ToggleButton>
          <ToggleButton value="week">שבועי</ToggleButton>
        </ToggleButtonGroup>
        <Button aria-label="לתקופה הקודמת" onClick={() => changeDate(-1)} sx={{ minWidth: 40 }}>
          <ChevronRightRounded />
        </Button>
        <TextField
          label="תחילת התקופה"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value || today())}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Button aria-label="לתקופה הבאה" onClick={() => changeDate(1)} sx={{ minWidth: 40 }}>
          <ChevronLeftRounded />
        </Button>
        <Button onClick={() => setDate(today())}>היום</Button>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>
          לפי שעון ישראל
        </Typography>
      </Paper>
      <QueryState isPending={query.isPending} error={query.error} />
      {!query.isPending && !query.error && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns:
              mode === 'week' ? { xs: '1fr', md: 'repeat(3,1fr)', xl: 'repeat(7,1fr)' } : '1fr',
            gap: 2,
          }}
        >
          {days.map((day) => {
            const list = appointments.filter(
              (a) => clinicDate(a.startAt).format('YYYY-MM-DD') === day,
            );
            return (
              <Box key={day}>
                <Box
                  sx={{
                    mb: 2,
                    p: 1.5,
                    bgcolor: day === today() ? 'primary.light' : '#eaf0f3',
                    borderRadius: 2,
                  }}
                >
                  <Typography fontWeight={800}>{clinicDate(day).format('dddd')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {clinicDate(day).format('D MMMM')} · {list.length} ביקורים
                  </Typography>
                </Box>
                {!list.length && <EmptyState title="אין תורים" />}
                <Stack spacing={1.5}>
                  {list.map((a) => (
                    <Card key={a.id} variant="outlined">
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          flexWrap="wrap"
                          gap={1}
                        >
                          <Typography color="primary.main" fontWeight={800}>
                            {timeLabel(a.startAt)}–{timeLabel(a.endAt)}
                          </Typography>
                          <StatusChip status={a.status} />
                        </Stack>
                        <Typography variant="h6" mt={1.5} fontWeight={700}>
                          {a.patientName}
                        </Typography>
                        {a.note && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            mt={1}
                            sx={{
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {a.note}
                          </Typography>
                        )}
                        <Button size="small" sx={{ mt: 1.5 }} onClick={() => setSelected(a)}>
                          פתיחת ביקור
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Box>
      )}
      <VisitDialog appointment={selected} onClose={() => setSelected(undefined)} />
    </Container>
  );
}
function VisitDialog({ appointment, onClose }: { appointment?: Appointment; onClose: () => void }) {
  const client = useQueryClient();
  const [status, setStatus] = useState<'completed' | 'no_show'>('completed');
  const [summary, setSummary] = useState('');
  const [prescription, setPrescription] = useState('');
  const history = useQuery({
    queryKey: ['history', appointment?.patientId],
    queryFn: () => api.get<Appointment[]>(`/patients/${appointment!.patientId}/history`),
    enabled: !!appointment,
  });
  const mutation = useMutation({
    mutationFn: () =>
      api.patch<Appointment>(`/appointments/${appointment!.id}/visit`, {
        status,
        visitSummary: summary,
        prescription,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['appointments'] });
      void client.invalidateQueries({ queryKey: ['history'] });
      onClose();
    },
  });
  useEffect(() => {
    if (appointment) {
      setStatus('completed');
      setSummary(appointment.visitSummary || '');
      setPrescription(appointment.prescription || '');
      mutation.reset();
    }
  }, [appointment?.id]);
  const canComplete =
    appointment?.status === 'scheduled' && !clinicDate(appointment.startAt).isAfter(clinicDate());
  return (
    <Dialog open={!!appointment} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>ביקור מטופל — {appointment?.patientName}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          {appointment && (
            <>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                <Typography>
                  {dateLabel(appointment.startAt)} · {timeLabel(appointment.startAt)}
                </Typography>
                <StatusChip status={appointment.status} />
              </Stack>
              {appointment.note && <Alert severity="info">הערת המטופל: {appointment.note}</Alert>}
            </>
          )}
          <Box>
            <Typography variant="h6" fontWeight={700} mb={2}>
              היסטוריית ביקורים
            </Typography>
            <QueryState isPending={history.isPending} error={history.error} />
            {history.data?.length === 0 && (
              <Typography color="text.secondary">אין ביקורים קודמים זמינים להצגה.</Typography>
            )}
            <Stack spacing={2}>
              {history.data?.map((visit) => (
                <Paper key={visit.id} variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight={700}>
                    {clinicDate(visit.startAt).format('DD.MM.YYYY')} · {visit.doctorName}
                  </Typography>
                  {visit.visitSummary && (
                    <Typography sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                      {visit.visitSummary}
                    </Typography>
                  )}
                  {visit.prescription && (
                    <Typography color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                      מרשם / הנחיות: {visit.prescription}
                    </Typography>
                  )}
                </Paper>
              ))}
            </Stack>
          </Box>
          <Divider />
          {canComplete ? (
            <Stack
              component="form"
              id="visit-form"
              spacing={2}
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
            >
              <Typography variant="h6" fontWeight={700}>
                סיום ביקור
              </Typography>
              <TextField
                select
                label="סטטוס הביקור"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'completed' | 'no_show')}
              >
                <MenuItem value="completed">הביקור הושלם</MenuItem>
                <MenuItem value="no_show">המטופל לא הגיע</MenuItem>
              </TextField>
              <TextField
                label="סיכום ביקור"
                multiline
                minRows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                inputProps={{ maxLength: 5000 }}
              />
              <TextField
                label="מרשם / הנחיות למטופל"
                multiline
                minRows={2}
                value={prescription}
                onChange={(e) => setPrescription(e.target.value)}
                inputProps={{ maxLength: 5000 }}
              />
              {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
            </Stack>
          ) : appointment?.status === 'scheduled' ? (
            <Alert severity="info">ניתן לסיים ביקור לאחר שעת תחילתו.</Alert>
          ) : (
            <Box>
              <Typography fontWeight={700}>סיכום הביקור</Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                {appointment?.visitSummary || 'לא הוזן סיכום.'}
              </Typography>
              {appointment?.prescription && (
                <Typography sx={{ whiteSpace: 'pre-wrap', mt: 2 }}>
                  מרשם / הנחיות: {appointment.prescription}
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>סגירה</Button>
        {canComplete && (
          <Button type="submit" form="visit-form" variant="contained" disabled={mutation.isPending}>
            שמירת הביקור
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
