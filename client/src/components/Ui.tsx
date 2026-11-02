import type { ReactNode } from 'react';
import { Alert, Box, Chip, CircularProgress, Paper, Typography } from '@mui/material';
import EventAvailableRounded from '@mui/icons-material/EventAvailableRounded';
import { STATUS_LABELS, type AppointmentStatus } from '@medtime/shared';
export function PageHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
        mb: 4,
        flexWrap: 'wrap',
      }}
    >
      <Box>
        <Typography variant="h4" component="h1" fontWeight={800}>
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" mt={1}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 5, textAlign: 'center', borderStyle: 'dashed', bgcolor: '#f8fbfb' }}
    >
      <EventAvailableRounded sx={{ fontSize: 42, color: 'primary.main', mb: 1 }} />
      <Typography variant="h6">{title}</Typography>
      {description && (
        <Typography color="text.secondary" mt={1}>
          {description}
        </Typography>
      )}
    </Paper>
  );
}
export function QueryState({ isPending, error }: { isPending: boolean; error?: Error | null }) {
  if (error)
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error.message}
      </Alert>
    );
  if (isPending)
    return (
      <Box role="status" aria-label="טוען נתונים" sx={{ py: 5, textAlign: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  return null;
}
export function StatusChip({ status }: { status: AppointmentStatus }) {
  const color =
    status === 'completed'
      ? 'success'
      : status === 'scheduled'
        ? 'primary'
        : status === 'no_show'
          ? 'warning'
          : 'default';
  return (
    <Chip
      size="small"
      label={STATUS_LABELS[status]}
      color={color}
      variant={status === 'scheduled' ? 'filled' : 'outlined'}
    />
  );
}
