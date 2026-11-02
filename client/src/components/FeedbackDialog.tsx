import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
export default function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [category, setCategory] = useState('suggestion');
  const [message, setMessage] = useState('');
  const mutation = useMutation({
    mutationFn: () => api.post('/feedback', { category, message }),
    onSuccess: () => setMessage(''),
  });
  const close = () => {
    mutation.reset();
    onClose();
  };
  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>עוזרים לנו להשתפר</DialogTitle>
      <DialogContent>
        {mutation.isSuccess ? (
          <Alert severity="success">תודה! המשוב נשלח לצוות המרפאה.</Alert>
        ) : (
          <Stack
            component="form"
            id="feedback-form"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            spacing={3}
            sx={{ pt: 1 }}
          >
            <Typography color="text.secondary">
              יש לכם רעיון או נתקלתם בבעיה? נשמח לשמוע.
            </Typography>
            {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
            <TextField
              select
              label="סוג הפנייה"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <MenuItem value="suggestion">הצעה לשיפור</MenuItem>
              <MenuItem value="issue">דיווח על בעיה</MenuItem>
            </TextField>
            <TextField
              label="תוכן הפנייה"
              multiline
              minRows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              slotProps={{ htmlInput: { minLength: 5, maxLength: 2000 } }}
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={close}>סגירה</Button>
        {!mutation.isSuccess && (
          <Button
            variant="contained"
            type="submit"
            form="feedback-form"
            disabled={mutation.isPending}
          >
            שליחת משוב
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
