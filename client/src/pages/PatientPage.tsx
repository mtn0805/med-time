import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import type { Appointment } from '@medtime/shared';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { clinicDate, dateLabel, timeLabel } from '../lib/dates';
import { EmptyState, PageHeading, QueryState, StatusChip } from '../components/Ui';
export default function PatientPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState(0);
  const [cancel, setCancel] = useState<Appointment>();
  const [detail, setDetail] = useState<Appointment>();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['appointments', 'patient'],
    queryFn: () => api.get<Appointment[]>('/appointments'),
  });
  const mutation = useMutation({
    mutationFn: (id: string) => api.patch(`/appointments/${id}/cancel`),
    onSuccess: () => {
      setCancel(undefined);
      void client.invalidateQueries({ queryKey: ['appointments'] });
      void client.invalidateQueries({ queryKey: ['availability'] });
    },
  });
  const history = useQuery({
    queryKey: ['history', user?.id],
    queryFn: () => api.get<Appointment[]>(`/patients/${user!.id}/history`),
    enabled: !!user,
  });
  const allVisits = [
    ...new Map([...(query.data || []), ...(history.data || [])].map((a) => [a.id, a])).values(),
  ].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const future = query.data?.filter(
    (a) => a.status === 'scheduled' && clinicDate(a.startAt).isAfter(clinicDate()),
  );
  const past = allVisits
    .filter((a) => a.status !== 'scheduled' || !clinicDate(a.startAt).isAfter(clinicDate()))
    .reverse();
  const list = tab === 0 ? future : past;
  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <PageHeading
        title={`שלום, ${user?.name.split(' ')[0]}`}
        subtitle="הבריאות שלכם מתחילה בניהול זמן שמתאים לכם."
        action={
          <Button component={RouterLink} to="/" variant="contained" startIcon={<AddRounded />}>
            קביעת תור חדש
          </Button>
        }
      />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        {[
          { title: 'תורים קרובים', value: future?.length || 0 },
          { title: 'ביקורים שהושלמו', value: history.data?.length || 0 },
          { title: 'הכל במקום אחד', value: 'היומן שלי' },
        ].map((item) => (
          <Card key={item.title}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {item.title}
              </Typography>
              <Typography variant="h4" color="primary.main" mt={1}>
                {item.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: '1px solid #dfe8ec' }}
      >
        <Tab label="התורים הקרובים" />
        <Tab label="היסטוריית תורים" />
      </Tabs>
      <QueryState
        isPending={query.isPending || (tab === 1 && history.isPending)}
        error={query.error || (tab === 1 ? history.error : null)}
      />
      {!query.isPending &&
        !query.error &&
        !(tab === 1 && (history.isPending || history.error)) &&
        !list?.length && (
          <EmptyState
            title={tab === 0 ? 'אין תורים קרובים ביומן' : 'אין עדיין היסטוריית ביקורים'}
            description={
              tab === 0
                ? 'אפשר למצוא רופא ולבחור שעה פנויה בעמוד הראשי.'
                : 'הביקורים שלכם יוצגו כאן לאחר קביעת תור.'
            }
          />
        )}
      <Stack spacing={2}>
        {list?.map((appointment) => (
          <Card key={appointment.id}>
            <CardContent
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                flexWrap: 'wrap',
                '&:last-child': { pb: 2 },
              }}
            >
              <Box
                sx={{
                  bgcolor: 'primary.light',
                  borderRadius: 3,
                  px: 2,
                  py: 1.5,
                  minWidth: 80,
                  textAlign: 'center',
                }}
              >
                <Typography variant="h5" fontWeight={800} color="primary.dark">
                  {clinicDate(appointment.startAt).format('DD')}
                </Typography>
                <Typography variant="caption" color="primary.dark">
                  {clinicDate(appointment.startAt).format('MMM')}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="h6" fontWeight={700}>
                  {appointment.doctorName}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {appointment.specialty}
                </Typography>
                <Typography variant="body2" mt={1}>
                  {dateLabel(appointment.startAt)} · {timeLabel(appointment.startAt)}
                </Typography>
              </Box>
              <StatusChip status={appointment.status} />
              <Button onClick={() => setDetail(appointment)}>פרטי הביקור</Button>
              {appointment.status === 'scheduled' &&
                clinicDate(appointment.startAt).isAfter(clinicDate()) && (
                  <Button
                    color="error"
                    onClick={() => {
                      mutation.reset();
                      setCancel(appointment);
                    }}
                  >
                    ביטול תור
                  </Button>
                )}
            </CardContent>
          </Card>
        ))}
      </Stack>
      <Dialog open={!!cancel} onClose={() => setCancel(undefined)} fullWidth maxWidth="xs">
        <DialogTitle>לבטל את התור?</DialogTitle>
        <DialogContent>
          <Typography>התור אצל {cancel?.doctorName} יבוטל והשעה תתפנה למטופלים אחרים.</Typography>
          {mutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {mutation.error.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setCancel(undefined)}>שמירת התור</Button>
          <Button
            color="error"
            variant="contained"
            disabled={mutation.isPending}
            onClick={() => cancel && mutation.mutate(cancel.id)}
          >
            כן, לבטל תור
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!detail} onClose={() => setDetail(undefined)} fullWidth maxWidth="sm">
        <DialogTitle>פרטי הביקור</DialogTitle>
        <DialogContent>
          {detail && (
            <Stack spacing={2}>
              <Typography variant="h6">{detail.doctorName}</Typography>
              <Typography>
                {dateLabel(detail.startAt)} בשעה {timeLabel(detail.startAt)}
              </Typography>
              <StatusChip status={detail.status} />
              {detail.note && <Typography>הערה לתור: {detail.note}</Typography>}
              {(detail.visitSummary || detail.prescription) && <Divider />}
              {detail.visitSummary && (
                <Box>
                  <Typography fontWeight={700}>סיכום הביקור</Typography>
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>{detail.visitSummary}</Typography>
                </Box>
              )}
              {detail.prescription && (
                <Box>
                  <Typography fontWeight={700}>מרשם / הנחיות</Typography>
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>{detail.prescription}</Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(undefined)}>סגירה</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
