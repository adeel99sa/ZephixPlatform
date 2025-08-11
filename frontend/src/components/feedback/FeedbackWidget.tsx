import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Rating,
  Typography,
  IconButton,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Collapse,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Zoom,
  FormHelperText,
} from '@mui/material';
import {
  Feedback as FeedbackIcon,
  BugReport as BugIcon,
  Lightbulb as IdeaIcon,
  Help as QuestionIcon,
  Close as CloseIcon,
  Screenshot as ScreenshotIcon,
  Send as SendIcon,
  Delete as DeleteIcon,
  ThumbDown as ComplaintIcon,
  ThumbUp as PraiseIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { useForm, Controller } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '@/hooks/useAuth';
import { useUserJourney } from '@/hooks/useUserJourney';
import { feedbackService } from '@/services/feedbackService';
import { FeedbackType, FeedbackPriority } from '@/types';

interface FeedbackFormData {
  type: FeedbackType;
  title: string;
  description: string;
  priority?: FeedbackPriority;
  rating?: number;
}

const feedbackTypes = [
  { value: FeedbackType.BUG, label: 'Bug Report', icon: BugIcon, color: 'error' },
  { value: FeedbackType.ENHANCEMENT, label: 'Feature Request', icon: IdeaIcon, color: 'info' },
  { value: FeedbackType.QUESTION, label: 'Question', icon: QuestionIcon, color: 'warning' },
  { value: FeedbackType.COMPLAINT, label: 'Complaint', icon: ComplaintIcon, color: 'error' },
  { value: FeedbackType.PRAISE, label: 'Praise', icon: PraiseIcon, color: 'success' },
];

export const FeedbackWidget: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { getUserJourney } = useUserJourney();
  
  const [open, setOpen] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<FeedbackFormData>({
    defaultValues: {
      type: FeedbackType.BUG,
      title: '',
      description: '',
      rating: 0,
    },
  });

  const selectedType = watch('type');

  useEffect(() => {
    // Show rating for specific feedback types
    setShowRating([FeedbackType.PRAISE, FeedbackType.COMPLAINT].includes(selectedType));
  }, [selectedType]);

  const captureScreenshot = useCallback(async () => {
    setIsCapturing(true);
    setOpen(false); // Hide dialog during capture

    try {
      // Wait for dialog to close
      await new Promise(resolve => setTimeout(resolve, 300));

      // Capture the screenshot
      const canvas = await html2canvas(document.body, {
        logging: false,
        useCORS: true,
        allowTaint: true,
        scale: 1,
        width: window.innerWidth,
        height: window.innerHeight,
      });

      // Convert to base64
      const base64Image = canvas.toDataURL('image/png');
      setScreenshot(base64Image);
      
      toast.success('Screenshot captured!');
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      toast.error('Failed to capture screenshot');
    } finally {
      setIsCapturing(false);
      setOpen(true); // Reopen dialog
    }
  }, []);

  const removeScreenshot = () => {
    setScreenshot(null);
  };

  const onSubmit = async (data: FeedbackFormData) => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      // Gather metadata
      const metadata = {
        page: location.pathname,
        feature: getFeatureFromPath(location.pathname),
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        sessionId: getSessionId(),
        userJourney: getUserJourney(),
        systemInfo: {
          browser: getBrowserInfo(),
          os: getOSInfo(),
          device: getDeviceType(),
        },
      };

      // Submit feedback
      await feedbackService.submitFeedback({
        ...data,
        screenshot: screenshot || undefined,
        metadata,
      });

      toast.success('Thank you for your feedback!');
      
      // Reset form
      reset();
      setScreenshot(null);
      setOpen(false);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setOpen(false);
      reset();
      setScreenshot(null);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!minimized && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1000,
            }}
          >
            <Tooltip title="Send Feedback" placement="left">
              <Fab
                color="primary"
                onClick={() => setOpen(true)}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    transform: 'scale(1.1)',
                  },
                  transition: 'transform 0.2s',
                }}
              >
                <FeedbackIcon />
              </Fab>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Zoom}
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 2,
            overflow: 'visible',
          },
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle sx={{ pb: 1 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">Send Feedback</Typography>
              <IconButton onClick={handleClose} size="small" disabled={isSubmitting}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ pb: 2 }}>
            <Stack spacing={3}>
              {/* Feedback Type Selection */}
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <ToggleButtonGroup
                    {...field}
                    exclusive
                    fullWidth
                    size="small"
                    sx={{ flexWrap: 'wrap', gap: 1 }}
                  >
                    {feedbackTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <ToggleButton
                          key={type.value}
                          value={type.value}
                          sx={{
                            flex: '1 1 30%',
                            border: 1,
                            borderColor: 'divider',
                            '&.Mui-selected': {
                              borderColor: `${type.color}.main`,
                              backgroundColor: `${type.color}.lighter`,
                            },
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Icon fontSize="small" />
                            <Typography variant="caption">{type.label}</Typography>
                          </Stack>
                        </ToggleButton>
                      );
                    })}
                  </ToggleButtonGroup>
                )}
              />

              {/* Title */}
              <Controller
                name="title"
                control={control}
                rules={{ required: 'Title is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Title"
                    variant="outlined"
                    fullWidth
                    error={!!errors.title}
                    helperText={errors.title?.message}
                  />
                )}
              />

              {/* Description */}
              <Controller
                name="description"
                control={control}
                rules={{ 
                  required: 'Description is required',
                  minLength: { value: 10, message: 'Please provide more details (min 10 characters)' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    variant="outlined"
                    fullWidth
                    multiline
                    rows={4}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                    placeholder="Please describe the issue or suggestion in detail..."
                  />
                )}
              />

              {/* Priority (for bugs) */}
              {selectedType === FeedbackType.BUG && (
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth size="small">
                      <InputLabel>Priority</InputLabel>
                      <Select {...field} label="Priority">
                        <MenuItem value={FeedbackPriority.LOW}>Low</MenuItem>
                        <MenuItem value={FeedbackPriority.MEDIUM}>Medium</MenuItem>
                        <MenuItem value={FeedbackPriority.HIGH}>High</MenuItem>
                        <MenuItem value={FeedbackPriority.CRITICAL}>Critical</MenuItem>
                      </Select>
                      <FormHelperText>How urgent is this issue?</FormHelperText>
                    </FormControl>
                  )}
                />
              )}

              {/* Rating (for praise/complaints) */}
              <Collapse in={showRating}>
                <Box>
                  <Typography variant="body2" gutterBottom>
                    How would you rate your experience?
                  </Typography>
                  <Controller
                    name="rating"
                    control={control}
                    render={({ field }) => (
                      <Rating
                        {...field}
                        size="large"
                        sx={{ mt: 1 }}
                      />
                    )}
                  />
                </Box>
              </Collapse>

              {/* Screenshot */}
              <Box>
                <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                  <Button
                    variant="outlined"
                    startIcon={isCapturing ? <CircularProgress size={16} /> : <ScreenshotIcon />}
                    onClick={captureScreenshot}
                    disabled={isCapturing || isSubmitting}
                    size="small"
                  >
                    {isCapturing ? 'Capturing...' : 'Capture Screenshot'}
                  </Button>
                  {screenshot && (
                    <Chip
                      label="Screenshot attached"
                      onDelete={removeScreenshot}
                      size="small"
                      color="success"
                    />
                  )}
                </Stack>
                
                {screenshot && (
                  <Box
                    sx={{
                      mt: 1,
                      position: 'relative',
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <img
                      src={screenshot}
                      alt="Screenshot"
                      style={{
                        width: '100%',
                        maxHeight: 200,
                        objectFit: 'cover',
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={removeScreenshot}
                      sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        bgcolor: 'background.paper',
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>

              {/* Info Alert */}
              <Alert severity="info" variant="outlined">
                <Typography variant="caption">
                  Your feedback helps us improve. We'll notify you when it's addressed.
                </Typography>
              </Alert>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={isSubmitting ? <CircularProgress size={16} /> : <SendIcon />}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Feedback'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
};

// Helper functions
function getFeatureFromPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments[0] || 'home';
}

function getSessionId(): string {
  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}

function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Unknown';
}

function getOSInfo(): string {
  const platform = navigator.platform;
  if (platform.includes('Win')) return 'Windows';
  if (platform.includes('Mac')) return 'macOS';
  if (platform.includes('Linux')) return 'Linux';
  return 'Unknown';
}

function getDeviceType(): string {
  const width = window.innerWidth;
  if (width < 768) return 'Mobile';
  if (width < 1024) return 'Tablet';
  return 'Desktop';
}