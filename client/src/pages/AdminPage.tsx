import { useState, type FormEvent } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import GroupsRounded from '@mui/icons-material/GroupsRounded';
import MedicalServicesRounded from '@mui/icons-material/MedicalServicesRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CLINIC_TIMEZONE,
  ROLE_LABELS,
  type Appointment,
  type Doctor,
  type Feedback,
  type User,
  type WorkingHours,
} from '@medtime/shared';
import { api } from '../lib/api';
import BookingDialog from '../components/BookingDialog';
import { EmptyState, PageHeading, StatusChip } from '../components/Ui';

const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const defaultHours: WorkingHours[] = [0, 1, 2, 3, 4].map((dayOfWeek) => ({
  dayOfWeek,
  start: '08:00',
  end: '16:00',
}));
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('he-IL', {
    timeZone: CLINIC_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
const formatTime = (value: string) =>
  new Intl.DateTimeFormat('he-IL', {
    timeZone: CLINIC_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
const message = (error: unknown) =>
  error instanceof Error ? error.message : 'הפעולה נכשלה. נסו שוב.';

type UserForm = { name: string; email: string; phone: string; password: string };
const emptyUser: UserForm = { name: '', email: '', phone: '', password: '' };

function PatientDialog({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user?: User;
}) {
  const cache = useQueryClient();
  const [form, setForm] = useState<UserForm>(user ? { ...emptyUser, ...user } : emptyUser);
  const mutation = useMutation({
    mutationFn: () =>
      user
        ? api.patch<User>(`/admin/users/${user.id}`, { name: form.name, phone: form.phone })
        : api.post<User>('/admin/patients', form),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['admin-users'] });
      await cache.invalidateQueries({ queryKey: ['admin-patients'] });
      onClose();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };
  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={submit}>
        <DialogTitle>{user ? 'עדכון פרטי משתמש' : 'הוספת מטופל'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography color="text.secondary" variant="body2">
              {user
                ? 'עדכון פרטי הקשר כפי שיופיעו במערכת.'
                : 'לאחר יצירת החשבון המטופל יוכל להתחבר ולקבוע תורים בעצמו.'}
            </Typography>
            {mutation.isError && <Alert severity="error">{message(mutation.error)}</Alert>}
            <TextField
              label="שם מלא"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              label="כתובת דוא״ל"
              type="email"
              required
              disabled={!!user}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              inputProps={{ dir: 'ltr', maxLength: 254 }}
            />
            <TextField
              label="מספר טלפון"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              inputProps={{ dir: 'ltr', maxLength: 20 }}
            />
            {!user && (
              <TextField
                label="סיסמה ראשונית"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                inputProps={{ minLength: 10, maxLength: 72, dir: 'ltr' }}
                helperText="10 תווים לפחות. יש למסור למטופל באופן פרטי."
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} disabled={mutation.isPending}>
            ביטול
          </Button>
          <Button variant="contained" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'שומר…' : user ? 'שמירת שינויים' : 'יצירת מטופל'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function DoctorDialog({
  open,
  onClose,
  doctor,
}: {
  open: boolean;
  onClose: () => void;
  doctor?: Doctor;
}) {
  const cache = useQueryClient();
  const [form, setForm] = useState({
    ...emptyUser,
    name: doctor?.name ?? '',
    email: doctor?.email ?? '',
    phone: doctor?.phone ?? '',
    specialty: doctor?.specialty ?? '',
    bio: doctor?.bio ?? '',
    slotMinutes: doctor?.slotMinutes ?? 20,
    workingHours: doctor?.workingHours ?? defaultHours,
    active: doctor?.active ?? true,
  });
  const hoursValid =
    form.workingHours.length > 0 && form.workingHours.every((row) => row.start < row.end);
  const mutation = useMutation({
    mutationFn: () =>
      doctor
        ? api.patch<Doctor>(`/admin/doctors/${doctor.id}`, {
            specialty: form.specialty,
            bio: form.bio,
            slotMinutes: form.slotMinutes,
            workingHours: form.workingHours,
            active: form.active,
          })
        : api.post<Doctor>('/admin/doctors', {
            name: form.name,
            email: form.email,
            phone: form.phone,
            password: form.password,
            specialty: form.specialty,
            bio: form.bio,
            slotMinutes: form.slotMinutes,
            workingHours: form.workingHours,
          }),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ['doctors'] });
      await cache.invalidateQueries({ queryKey: ['admin-users'] });
      await cache.invalidateQueries({ queryKey: ['availability'] });
      onClose();
    },
  });
  const changeHours = (dayOfWeek: number, field: 'start' | 'end', value: string) =>
    setForm({
      ...form,
      workingHours: form.workingHours.map((row) =>
        row.dayOfWeek === dayOfWeek ? { ...row, [field]: value } : row,
      ),
    });
  const toggleDay = (dayOfWeek: number, checked: boolean) =>
    setForm({
      ...form,
      workingHours: checked
        ? [...form.workingHours, { dayOfWeek, start: '08:00', end: '16:00' }].sort(
            (a, b) => a.dayOfWeek - b.dayOfWeek,
          )
        : form.workingHours.filter((row) => row.dayOfWeek !== dayOfWeek),
    });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (hoursValid) mutation.mutate();
  };
  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} fullWidth maxWidth="md">
      <Box component="form" onSubmit={submit}>
        <DialogTitle>
          {doctor ? `שעות קבלה ופרטי רופא · ${doctor.name}` : 'הוספת רופא לצוות'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {mutation.isError && <Alert severity="error">{message(mutation.error)}</Alert>}
            {!doctor && (
              <>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="שם מלא"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    inputProps={{ maxLength: 100 }}
                  />
                  <TextField
                    label="כתובת דוא״ל"
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    inputProps={{ dir: 'ltr', maxLength: 254 }}
                  />
                  <TextField
                    label="מספר טלפון"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    inputProps={{ dir: 'ltr', maxLength: 20 }}
                  />
                  <TextField
                    label="סיסמה ראשונית"
                    required
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    inputProps={{ minLength: 10, maxLength: 72, dir: 'ltr' }}
                    helperText="10 תווים לפחות"
                  />
                </Box>
                <Divider />
              </>
            )}
            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2 }}
            >
              <TextField
                label="התמחות"
                required
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                inputProps={{ maxLength: 100 }}
              />
              <TextField
                label="משך תור בדקות"
                type="number"
                required
                value={form.slotMinutes}
                onChange={(e) => setForm({ ...form, slotMinutes: Number(e.target.value) })}
                inputProps={{ min: 5, max: 120, step: 5 }}
              />
            </Box>
            <TextField
              label="על הרופא"
              multiline
              minRows={2}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              inputProps={{ maxLength: 2000 }}
            />
            <Box>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                שעות קבלה שבועיות
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                כל השעות לפי שעון ישראל. המערכת תגזור חלונות זמן לפי משך התור.
              </Typography>
              <Stack spacing={1}>
                {days.map((day, dayOfWeek) => {
                  const row = form.workingHours.find((item) => item.dayOfWeek === dayOfWeek);
                  return (
                    <Box
                      key={day}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1,
                        borderRadius: 2,
                        bgcolor: row ? 'action.hover' : undefined,
                        flexWrap: 'wrap',
                      }}
                    >
                      <FormControlLabel
                        sx={{ width: 105, mr: 0 }}
                        control={
                          <Checkbox
                            checked={!!row}
                            onChange={(e) => toggleDay(dayOfWeek, e.target.checked)}
                          />
                        }
                        label={day}
                      />
                      {row ? (
                        <>
                          <TextField
                            size="small"
                            label="תחילת קבלה"
                            type="time"
                            value={row.start}
                            onChange={(e) => changeHours(dayOfWeek, 'start', e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                            sx={{ width: 145 }}
                            required
                          />
                          <Typography aria-hidden>—</Typography>
                          <TextField
                            size="small"
                            label="סיום קבלה"
                            type="time"
                            value={row.end}
                            onChange={(e) => changeHours(dayOfWeek, 'end', e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                            sx={{ width: 145 }}
                            required
                            error={row.end <= row.start}
                          />
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          אין קבלת קהל
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </Box>
            {!hoursValid && (
              <Alert severity="warning">
                יש לבחור לפחות יום קבלה אחד ושעת סיום המאוחרת משעת ההתחלה.
              </Alert>
            )}
            {doctor && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />
                }
                label="הרופא פעיל ומוצג למטופלים"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} disabled={mutation.isPending}>
            ביטול
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending || !hoursValid}>
            {mutation.isPending ? 'שומר…' : doctor ? 'שמירת שעות ופרטים' : 'יצירת רופא'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function ManualBooking({ onClose }: { onClose: () => void }) {
  const doctors = useQuery({
    queryKey: ['doctors', 'booking'],
    queryFn: () => api.get<Doctor[]>('/doctors'),
  });
  const users = useQuery({
    queryKey: ['admin-patients'],
    queryFn: () => api.get<User[]>('/admin/users'),
  });
  const [doctorId, setDoctorId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [booking, setBooking] = useState(false);
  return (
    <>
      <Dialog open={!booking} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>קביעת תור עבור מטופל</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography color="text.secondary" variant="body2">
              בחרו מטופל ורופא כדי לראות את חלונות הזמן הפנויים.
            </Typography>
            {(doctors.isError || users.isError) && (
              <Alert severity="error">{message(doctors.error || users.error)}</Alert>
            )}
            {doctors.isPending || users.isPending ? (
              <CircularProgress size={28} />
            ) : (
              <>
                <TextField
                  select
                  label="מטופל"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                >
                  {users.data
                    ?.filter((user) => user.role === 'patient' && user.active)
                    .map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.name} · {user.email}
                      </MenuItem>
                    ))}
                </TextField>
                <TextField
                  select
                  label="רופא"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                >
                  {doctors.data
                    ?.filter((doctor) => doctor.active)
                    .map((doctor) => (
                      <MenuItem key={doctor.id} value={doctor.id}>
                        {doctor.name} · {doctor.specialty}
                      </MenuItem>
                    ))}
                </TextField>
                {users.data?.every((user) => user.role !== 'patient' || !user.active) && (
                  <Alert severity="info">אין מטופלים פעילים. הוסיפו מטופל בלשונית המשתמשים.</Alert>
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose}>ביטול</Button>
          <Button
            variant="contained"
            disabled={!doctorId || !patientId}
            onClick={() => setBooking(true)}
          >
            בחירת מועד
            <ArrowBackRounded sx={{ mr: 1 }} fontSize="small" />
          </Button>
        </DialogActions>
      </Dialog>
      {booking && (
        <BookingDialog
          open
          onClose={onClose}
          doctor={doctors.data?.find((doctor) => doctor.id === doctorId)}
          patientId={patientId}
        />
      )}
    </>
  );
}

export default function AdminPage() {
  const cache = useQueryClient();
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [patientForm, setPatientForm] = useState<{ user?: User } | null>(null);
  const [doctorForm, setDoctorForm] = useState<{ doctor?: Doctor } | null>(null);
  const [manualBooking, setManualBooking] = useState(false);
  const [notice, setNotice] = useState('');
  const users = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () =>
      api.get<User[]>(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  });
  const doctors = useQuery({
    queryKey: ['doctors', 'admin'],
    queryFn: () => api.get<Doctor[]>('/doctors?includeInactive=true'),
  });
  const appointments = useQuery({
    queryKey: ['appointments', 'admin'],
    queryFn: () => api.get<Appointment[]>('/appointments'),
  });
  const feedback = useQuery({
    queryKey: ['admin-feedback'],
    queryFn: () => api.get<Feedback[]>('/admin/feedback'),
    enabled: tab === 4,
    staleTime: 0,
  });
  const userStatus = useMutation({
    mutationFn: (user: User) =>
      api.patch<User>(`/admin/users/${user.id}`, { active: !user.active }),
    onSuccess: async () => {
      setNotice('סטטוס המשתמש עודכן');
      await cache.invalidateQueries({ queryKey: ['admin-users'] });
      await cache.invalidateQueries({ queryKey: ['doctors'] });
    },
  });
  const cancel = useMutation({
    mutationFn: (id: string) => api.patch<Appointment>(`/appointments/${id}/cancel`, {}),
    onSuccess: async () => {
      setNotice('התור בוטל');
      await cache.invalidateQueries({ queryKey: ['appointments'] });
      await cache.invalidateQueries({ queryKey: ['availability'] });
    },
  });
  const futureAppointments =
    appointments.data?.filter(
      (item) => item.status === 'scheduled' && new Date(item.startAt) >= new Date(),
    ) ?? [];
  const sortedAppointments = [...(appointments.data ?? [])].sort((a, b) =>
    a.startAt.localeCompare(b.startAt),
  );
  const currentQuery = [appointments, users, doctors, appointments, feedback][tab];

  return (
    <Stack spacing={3.5}>
      <PageHeading
        title="ניהול המרפאה"
        subtitle="כל האנשים, התורים והעדכונים — במקום אחד."
        action={
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={() => setManualBooking(true)}
          >
            קביעת תור למטופל
          </Button>
        }
      />
      {notice && (
        <Alert severity="success" onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}
      {(userStatus.isError || cancel.isError) && (
        <Alert
          severity="error"
          onClose={() => {
            userStatus.reset();
            cancel.reset();
          }}
        >
          {message(userStatus.error || cancel.error)}
        </Alert>
      )}
      <Box
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}
      >
        {[
          {
            label: 'תורים קרובים',
            value: futureAppointments.length,
            icon: <CalendarMonthRounded />,
            color: '#0f766e',
          },
          {
            label: 'רופאים בצוות',
            value: doctors.data?.length ?? '—',
            icon: <MedicalServicesRounded />,
            color: '#4263eb',
          },
          {
            label: 'משתמשים במערכת',
            value: users.data?.length ?? '—',
            icon: <GroupsRounded />,
            color: '#a16207',
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: `${stat.color}12`, color: stat.color }}>{stat.icon}</Avatar>
              <Box>
                <Typography color="text.secondary" variant="body2">
                  {stat.label}
                </Typography>
                <Typography variant="h4" fontWeight={800}>
                  {stat.value}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Card sx={{ overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, value: number) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="ניהול המרפאה"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          {['תמונת מצב', 'משתמשים', 'רופאים ושעות קבלה', 'כל התורים', 'הצעות ומשוב'].map(
            (label) => (
              <Tab label={label} key={label} />
            ),
          )}
        </Tabs>
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {currentQuery?.isPending && (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <CircularProgress aria-label="טוען נתונים" />
            </Box>
          )}
          {currentQuery?.isError && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" onClick={() => void currentQuery.refetch()}>
                  ניסיון נוסף
                </Button>
              }
            >
              {message(currentQuery.error)}
            </Alert>
          )}

          {tab === 0 && !appointments.isPending && !appointments.isError && (
            <Stack spacing={3}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box>
                  <Typography variant="h6" fontWeight={750}>
                    הביקורים הבאים
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    מעקב רציף אחר הפעילות הקרובה במרפאה
                  </Typography>
                </Box>
                <Button onClick={() => setTab(3)}>
                  לכל התורים
                  <ArrowBackRounded sx={{ mr: 1 }} fontSize="small" />
                </Button>
              </Box>
              {!futureAppointments.length ? (
                <EmptyState
                  title="אין תורים קרובים"
                  description="תורים חדשים שייקבעו יופיעו כאן באופן אוטומטי."
                />
              ) : (
                futureAppointments
                  .sort((a, b) => a.startAt.localeCompare(b.startAt))
                  .slice(0, 6)
                  .map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 2,
                        alignItems: 'center',
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'background.default',
                      }}
                    >
                      <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark' }}>
                        {item.patientName.slice(0, 1)}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 150 }}>
                        <Typography fontWeight={700}>{item.patientName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.doctorName} · {item.specialty}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography fontWeight={700}>{formatTime(item.startAt)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(item.startAt)}
                        </Typography>
                      </Box>
                      <StatusChip status={item.status} />
                    </Box>
                  ))
              )}
              <Divider />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  startIcon={<AddRounded />}
                  onClick={() => setPatientForm({})}
                >
                  הוספת מטופל
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<MedicalServicesRounded />}
                  onClick={() => setDoctorForm({})}
                >
                  הוספת רופא
                </Button>
                <Button onClick={() => setTab(4)}>צפייה במשוב שהתקבל</Button>
              </Box>
            </Stack>
          )}

          {tab === 1 && (
            <Stack spacing={2.5}>
              <Box
                sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'space-between' }}
              >
                <TextField
                  size="small"
                  label="חיפוש משתמשים"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  sx={{ minWidth: 250 }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRounded fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Button
                  variant="contained"
                  startIcon={<AddRounded />}
                  onClick={() => setPatientForm({})}
                >
                  הוספת מטופל
                </Button>
              </Box>
              {!users.isPending && !users.isError && !users.data?.length && (
                <EmptyState
                  title="לא נמצאו משתמשים"
                  description="נסו חיפוש אחר או הוסיפו מטופל חדש."
                />
              )}
              {users.data?.map((user) => (
                <Box
                  key={user.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    py: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    flexWrap: 'wrap',
                  }}
                >
                  <Avatar sx={{ bgcolor: 'action.hover', color: 'text.primary' }}>
                    {user.name.slice(0, 1)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Typography fontWeight={700}>{user.name}</Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ overflowWrap: 'anywhere' }}
                    >
                      {user.email} ·{' '}
                      <Box component="span" dir="ltr">
                        {user.phone}
                      </Box>
                    </Typography>
                  </Box>
                  <Chip label={ROLE_LABELS[user.role]} size="small" variant="outlined" />
                  <Chip
                    label={user.active ? 'פעיל' : 'לא פעיל'}
                    size="small"
                    color={user.active ? 'success' : 'default'}
                  />
                  <Tooltip title={`עריכת ${user.name}`}>
                    <IconButton
                      aria-label={`עריכת ${user.name}`}
                      onClick={() => setPatientForm({ user })}
                    >
                      <EditRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Button
                    size="small"
                    color={user.active ? 'inherit' : 'primary'}
                    disabled={userStatus.isPending}
                    onClick={() => userStatus.mutate(user)}
                  >
                    {user.active ? 'השבתה' : 'הפעלה'}
                  </Button>
                </Box>
              ))}
            </Stack>
          )}

          {tab === 2 && !doctors.isPending && !doctors.isError && (
            <Stack spacing={2.5}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Typography color="text.secondary" variant="body2">
                  ניהול הצוות, תחומי ההתמחות וחלונות הקבלה.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddRounded />}
                  onClick={() => setDoctorForm({})}
                >
                  הוספת רופא
                </Button>
              </Box>
              {!doctors.data?.length && (
                <EmptyState
                  title="צוות המרפאה עדיין ריק"
                  description="הוסיפו רופא והגדירו שעות קבלה כדי לאפשר קביעת תורים."
                />
              )}
              <Box
                sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}
              >
                {doctors.data?.map((doctor) => (
                  <Card variant="outlined" key={doctor.id} sx={{ boxShadow: 'none' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                        <Avatar
                          sx={{
                            width: 48,
                            height: 48,
                            bgcolor: 'primary.light',
                            color: 'primary.dark',
                          }}
                        >
                          <MedicalServicesRounded />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={750}>{doctor.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {doctor.specialty}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={doctor.active ? 'פעיל' : 'מושבת'}
                          color={doctor.active ? 'success' : 'default'}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ minHeight: 42 }}>
                        {doctor.bio || 'טרם נוסף תיאור.'}
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Stack spacing={0.7}>
                        {doctor.workingHours.map((row) => (
                          <Box
                            key={row.dayOfWeek}
                            sx={{ display: 'flex', justifyContent: 'space-between' }}
                          >
                            <Typography variant="body2">יום {days[row.dayOfWeek]}</Typography>
                            <Typography variant="body2" dir="ltr">
                              {row.start} – {row.end}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mt: 2.5,
                          gap: 1,
                        }}
                      >
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`${doctor.slotMinutes} דקות לתור`}
                        />
                        <Button
                          size="small"
                          startIcon={<EditRounded />}
                          onClick={() => setDoctorForm({ doctor })}
                        >
                          עריכת שעות ופרטים
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Stack>
          )}

          {tab === 3 && !appointments.isPending && !appointments.isError && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                התורים מוצגים לפי מועד הביקור. ניתן לבטל תור עתידי שטרם התקיים.
              </Typography>
              {!sortedAppointments.length && (
                <EmptyState title="טרם נקבעו תורים" description="קבעו תור למטופל כדי להתחיל." />
              )}
              {sortedAppointments.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                    alignItems: 'center',
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ minWidth: 110 }}>
                    <Typography fontWeight={750}>{formatDate(item.startAt)}</Typography>
                    <Typography color="text.secondary" variant="body2">
                      {formatTime(item.startAt)}–{formatTime(item.endAt)}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 160 }}>
                    <Typography fontWeight={700}>{item.patientName}</Typography>
                    <Typography color="text.secondary" variant="body2">
                      {item.doctorName} · {item.specialty}
                    </Typography>
                  </Box>
                  <StatusChip status={item.status} />
                  {item.status === 'scheduled' && new Date(item.startAt) > new Date() && (
                    <Button
                      size="small"
                      color="error"
                      disabled={cancel.isPending}
                      onClick={() => cancel.mutate(item.id)}
                    >
                      ביטול תור
                    </Button>
                  )}
                </Box>
              ))}
            </Stack>
          )}

          {tab === 4 && !feedback.isPending && !feedback.isError && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                הקשבה למטופלים ולצוות היא חלק מטיפול טוב.
              </Typography>
              {!feedback.data?.length && (
                <EmptyState
                  title="תיבת המשוב ריקה"
                  description="הצעות לשיפור ודיווחים שיישלחו מהאתר יופיעו כאן."
                />
              )}
              {feedback.data?.map((item) => (
                <Card variant="outlined" key={item.id} sx={{ boxShadow: 'none' }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        flexWrap: 'wrap',
                        mb: 2,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: 'action.hover',
                          color: 'text.primary',
                        }}
                      >
                        {item.userName.slice(0, 1)}
                      </Avatar>
                      <Typography fontWeight={700} sx={{ flex: 1 }}>
                        {item.userName}
                      </Typography>
                      <Chip
                        size="small"
                        color={item.category === 'issue' ? 'warning' : 'primary'}
                        label={item.category === 'issue' ? 'דיווח על בעיה' : 'הצעה לשיפור'}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(item.createdAt)}
                      </Typography>
                    </Box>
                    <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                      {item.message}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      </Card>
      {patientForm && (
        <PatientDialog open onClose={() => setPatientForm(null)} user={patientForm.user} />
      )}
      {doctorForm && (
        <DoctorDialog open onClose={() => setDoctorForm(null)} doctor={doctorForm.doctor} />
      )}
      {manualBooking && <ManualBooking onClose={() => setManualBooking(false)} />}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
        <CheckCircleRounded sx={{ fontSize: 16 }} />
        <Typography variant="caption">השינויים ביומנים מתעדכנים בזמן אמת · שעון ישראל</Typography>
      </Box>
    </Stack>
  );
}
