import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import FavoriteBorderRounded from '@mui/icons-material/FavoriteBorderRounded';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import type { Doctor } from '@medtime/shared';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import BookingDialog from '../components/BookingDialog';
import { EmptyState, QueryState } from '../components/Ui';
const colorPairs = [
  ['#e1f3ed', '#237565'],
  ['#e9eafa', '#6265a5'],
  ['#f9eddf', '#ad7842'],
  ['#e4eff7', '#4b7e9a'],
];
export default function HomePage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [selected, setSelected] = useState<Doctor>();
  const doctors = useQuery({
    queryKey: ['doctors', 'public'],
    queryFn: () => api.get<Doctor[]>('/doctors'),
  });
  const specialties = useMemo(
    () => [...new Set(doctors.data?.map((doctor) => doctor.specialty) || [])],
    [doctors.data],
  );
  const filtered = doctors.data?.filter(
    (doctor) =>
      (!specialty || doctor.specialty === specialty) &&
      `${doctor.name} ${doctor.specialty}`.includes(search),
  );
  return (
    <>
      <Box sx={{ bgcolor: '#edf6f5', borderBottom: '1px solid #dfebeb', overflow: 'hidden' }}>
        <Container maxWidth="xl" sx={{ py: { xs: 5, md: 7 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.15fr 0.85fr' },
              gap: 5,
              alignItems: 'center',
            }}
          >
            <Box>
              <Chip
                size="small"
                label="המרפאה שלכם. מחוברים אליכם."
                sx={{ bgcolor: '#dcefea', color: '#216b60', fontWeight: 700, mb: 3 }}
              />
              <Typography
                variant="h2"
                component="h1"
                sx={{
                  fontSize: { xs: 38, sm: 48, lg: 58 },
                  lineHeight: 1.18,
                  letterSpacing: -1.5,
                  maxWidth: 650,
                }}
              >
                יותר זמן לבריאות.
                <br />
                <Box component="span" sx={{ color: 'primary.main' }}>
                  פחות זמן להמתנה.
                </Box>
              </Typography>
              <Typography
                sx={{
                  color: 'text.secondary',
                  fontSize: 18,
                  lineHeight: 1.9,
                  maxWidth: 550,
                  mt: 2.5,
                }}
              >
                הרופא הנכון, בשעה שמתאימה לכם. בחרו מומחה, מצאו תור פנוי וקבלו אישור מיידי — הכל
                במקום אחד.
              </Typography>
              <Stack direction="row" gap={2} mt={3.5}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowBackRounded />}
                  onClick={() =>
                    document.getElementById('doctors')?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  מציאת תור
                </Button>
                {!user && (
                  <Button component={RouterLink} to="/register" size="large" variant="outlined">
                    מצטרפים למרפאה
                  </Button>
                )}
              </Stack>
              <Stack direction="row" spacing={3} sx={{ mt: 4, flexWrap: 'wrap', rowGap: 1 }}>
                {['זמינות בזמן אמת', 'אישור מיידי', 'מידע אישי מוגן'].map((text) => (
                  <Typography
                    key={text}
                    variant="body2"
                    color="text.secondary"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.7 }}
                  >
                    <CheckRounded sx={{ fontSize: 18, color: 'primary.main' }} />
                    {text}
                  </Typography>
                ))}
              </Stack>
            </Box>
            <Box
              sx={{
                position: 'relative',
                maxWidth: 450,
                width: '100%',
                mx: 'auto',
                py: 3,
                display: { xs: 'none', md: 'block' },
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  width: 350,
                  height: 350,
                  borderRadius: '50%',
                  bgcolor: '#d9eeea',
                  top: 0,
                  left: 20,
                }}
              />
              <Paper
                sx={{
                  position: 'relative',
                  borderRadius: 5,
                  p: 3.5,
                  boxShadow: '0 22px 60px #24625f16',
                  transform: 'rotate(-2deg)',
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography fontWeight={800} variant="h6">
                      תור שמותאם לחיים שלכם
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                      קובעים בקלות, ממשיכים ביום
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                    <CalendarMonthRounded />
                  </Avatar>
                </Stack>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 1, my: 3 }}>
                  {['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳'].map((day, i) => (
                    <Box
                      key={day}
                      sx={{
                        textAlign: 'center',
                        bgcolor: i === 2 ? 'primary.main' : '#f5f8f9',
                        color: i === 2 ? 'white' : 'text.secondary',
                        py: 1.5,
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="caption">יום {day}</Typography>
                      <Typography variant="h6" mt={0.5}>
                        {12 + i}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Stack spacing={1.5}>
                  {['09:00', '09:20', '09:40'].map((time, i) => (
                    <Box
                      key={time}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        bgcolor: i === 1 ? '#eaf6f3' : '#fafcfc',
                        borderRadius: 2,
                        p: 1.5,
                        border: i === 1 ? '1px solid #b7ddd6' : '1px solid #edf1f2',
                      }}
                    >
                      <Typography fontWeight={700} color="primary.main">
                        {time}
                      </Typography>
                      <Box sx={{ height: 30, borderRight: '2px solid #beddd5' }} />
                      <Typography variant="body2">
                        {i === 1 ? 'הזמן שלכם לבריאות' : 'חלון זמן פנוי'}
                      </Typography>
                      {i === 1 && <CheckRounded sx={{ mr: 'auto', color: 'primary.main' }} />}
                    </Box>
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary" component="p" mt={2}>
                  המחשה בלבד · הזמינות בפועל מוצגת בבחירת רופא
                </Typography>
              </Paper>
              <Paper
                sx={{
                  position: 'relative',
                  mt: -1,
                  mr: 5,
                  ml: -2,
                  px: 2,
                  py: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  border: '1px solid #e3eeeb',
                  boxShadow: '0 8px 25px #153f4910',
                  transform: 'rotate(2deg)',
                }}
              >
                <Avatar sx={{ bgcolor: '#dff1e5', color: '#357955', width: 34, height: 34 }}>
                  <CheckRounded fontSize="small" />
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={700}>
                    התור הבא שלכם — במרחק כמה לחיצות
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    כל העדכונים מתרכזים ביומן האישי
                  </Typography>
                </Box>
              </Paper>
            </Box>
          </Box>
        </Container>
      </Box>
      <Container maxWidth="xl" sx={{ pt: 4 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' },
            gap: 3,
            mb: 7,
          }}
        >
          {[
            {
              icon: <CalendarMonthRounded />,
              title: 'התור הבא, בדרך שלכם',
              text: 'בחירת מומחה ותאריך מתוך שעות פנויות באמת.',
            },
            {
              icon: <AccessTimeRounded />,
              title: 'תמיד מעודכנים',
              text: 'היומן מתעדכן עם כל קביעה, ביטול ושינוי.',
            },
            {
              icon: <VerifiedUserOutlined />,
              title: 'אישי ומאובטח',
              text: 'חשבון אישי עם הרשאות מותאמות לכל תפקיד.',
            },
          ].map((item) => (
            <Stack key={item.title} direction="row" spacing={2} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  border: '1px solid #e3ecee',
                  width: 50,
                  height: 50,
                  borderRadius: 3,
                }}
              >
                {item.icon}
              </Avatar>
              <Box>
                <Typography fontWeight={700}>{item.title}</Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                  {item.text}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Box>
        <Box id="doctors" sx={{ scrollMarginTop: 110 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="end"
            flexWrap="wrap"
            gap={2}
            mb={3}
          >
            <Box>
              <Typography variant="overline" color="primary.main" fontWeight={800}>
                אנשים שמטפלים באנשים
              </Typography>
              <Typography variant="h4" component="h2" mt={0.5}>
                הצוות הרפואי שלנו
              </Typography>
              <Typography color="text.secondary" mt={1}>
                בחרו את הרופא שמתאים לכם. אנחנו נדאג לתיאום.
              </Typography>
            </Box>
            <Chip label={`${filtered?.length || 0} רופאים בצוות`} variant="outlined" />
          </Stack>
          <Paper variant="outlined" sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="חיפוש רופא או התמחות"
              placeholder="איך נוכל לעזור?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: 1, minWidth: 220 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              select
              label="תחום התמחות"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="">כל ההתמחויות</MenuItem>
              {specialties.map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
          </Paper>
          <QueryState isPending={doctors.isPending} error={doctors.error} />
          {!doctors.isPending && !doctors.error && filtered?.length === 0 && (
            <EmptyState
              title="לא נמצאו רופאים"
              description="נסו לשנות את מילות החיפוש או את תחום ההתמחות."
            />
          )}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', lg: 'repeat(3,1fr)' },
              gap: 3,
            }}
          >
            {filtered?.map((doctor, index) => (
              <Card key={doctor.id} className="doctor-card">
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar
                      sx={{
                        width: 62,
                        height: 62,
                        bgcolor: colorPairs[index % 4][0],
                        color: colorPairs[index % 4][1],
                        fontSize: 25,
                        fontWeight: 700,
                        borderRadius: 3,
                      }}
                    >
                      {doctor.name.replace(/^ד[״"']ר\s*/, '').slice(0, 1)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={800}>
                        {doctor.name}
                      </Typography>
                      <Typography variant="body2" color="primary.main">
                        {doctor.specialty}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography
                    color="text.secondary"
                    variant="body2"
                    sx={{ mt: 2.5, lineHeight: 1.8, minHeight: 52 }}
                  >
                    {doctor.bio || 'טיפול מקצועי ואישי, עם תשומת לב לכל מטופל.'}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={0.8}
                    alignItems="center"
                    sx={{ mt: 2, mb: 2.5, color: 'text.secondary' }}
                  >
                    <FavoriteBorderRounded sx={{ fontSize: 17 }} />
                    <Typography variant="caption">
                      ביקור של {doctor.slotMinutes} דקות · בתיאום מראש
                    </Typography>
                  </Stack>
                  <Button
                    fullWidth
                    variant="outlined"
                    endIcon={<ArrowBackRounded />}
                    onClick={() => setSelected(doctor)}
                  >
                    לזמינות ולקביעת תור
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      </Container>
      <BookingDialog open={!!selected} onClose={() => setSelected(undefined)} doctor={selected} />
    </>
  );
}
