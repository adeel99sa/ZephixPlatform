import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Chip,
  Avatar,
  AvatarGroup,
  IconButton,
  Tooltip,
  Divider,
  Stack,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  Badge,
  Fade,
  Grow,
} from '@mui/material';
import {
  AutoAwesome as AIIcon,
  Save as SaveIcon,
  History as HistoryIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  MoreVert as MoreIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Assessment as AnalyticsIcon,
  Group as CollaboratorsIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import { documentService } from '@/services/documentService';
import { aiService } from '@/services/aiService';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { FieldRenderer } from '@/components/fields/FieldRenderer';
import { CommentThread } from '@/components/collaboration/CommentThread';
import { VersionHistory } from '@/components/collaboration/VersionHistory';
import { UserPresence } from '@/components/collaboration/UserPresence';
import { AIAssistant } from '@/components/ai/AIAssistant';
import { ApprovalWorkflow } from '@/components/workflow/ApprovalWorkflow';
import { DocumentStatus } from '@/components/document/DocumentStatus';

import {
  BRDDocument,
  TemplateField,
  Comment,
  UserPresence as UserPresenceType,
  RealtimeEventType,
  FieldType,
} from '@/types';

interface FieldWithSuggestion extends TemplateField {
  suggestion?: string;
  isLoading?: boolean;
}

export const DocumentEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  
  const [activeField, setActiveField] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeUsers, setActiveUsers] = useState<UserPresenceType[]>([]);
  const [fieldSuggestions, setFieldSuggestions] = useState<Record<string, string>>({});

  const { control, handleSubmit, setValue, watch, formState: { isDirty } } = useForm();
  const formValues = watch();

  // Fetch document data
  const { data: document, isLoading, refetch } = useQuery(
    ['document', id],
    () => documentService.getDocument(id!),
    {
      enabled: !!id,
      onSuccess: (data) => {
        // Set initial form values
        if (data.data) {
          Object.entries(data.data).forEach(([key, value]) => {
            setValue(key, value);
          });
        }
      },
    }
  );

  // Save document mutation
  const saveMutation = useMutation(
    (data: any) => documentService.updateDocument(id!, data),
    {
      onSuccess: () => {
        toast.success('Document saved successfully');
        refetch();
      },
      onError: () => {
        toast.error('Failed to save document');
      },
    }
  );

  // Socket.io event handlers
  useEffect(() => {
    if (!socket || !id) return;

    // Join document room
    socket.emit('join-document', id);

    // Handle real-time events
    socket.on('realtime-event', (event) => {
      switch (event.type) {
        case RealtimeEventType.FIELD_UPDATED:
          if (event.userId !== user?.id) {
            setValue(event.data.fieldId, event.data.value);
            toast(`${event.data.userName} updated ${event.data.fieldId}`, {
              icon: '✏️',
            });
          }
          break;
        case RealtimeEventType.USER_JOINED:
        case RealtimeEventType.USER_LEFT:
          refetchActiveUsers();
          break;
        case RealtimeEventType.COMMENT_ADDED:
          refetch();
          break;
      }
    });

    // Handle active users
    socket.on('active-users', (users: UserPresenceType[]) => {
      setActiveUsers(users);
    });

    // Handle cursor positions
    socket.on('user-cursor', ({ userId, cursor }) => {
      // Update cursor position for collaborative editing
    });

    return () => {
      socket.emit('leave-document');
      socket.off('realtime-event');
      socket.off('active-users');
      socket.off('user-cursor');
    };
  }, [socket, id, user, setValue]);

  // Field change handler with real-time sync
  const handleFieldChange = useCallback(
    (fieldId: string, value: any) => {
      setValue(fieldId, value, { shouldDirty: true });
      
      // Emit change to other users
      if (socket && document) {
        socket.emit('field-update', {
          fieldId,
          value,
          version: document.version,
        });
      }
    },
    [socket, document, setValue]
  );

  // AI field suggestion
  const handleAISuggestion = async (fieldId: string, fieldType: FieldType) => {
    setFieldSuggestions(prev => ({ ...prev, [fieldId]: 'loading' }));
    
    try {
      const suggestion = await aiService.getFieldSuggestion(
        id!,
        fieldId,
        fieldType,
        formValues
      );
      
      setFieldSuggestions(prev => ({ ...prev, [fieldId]: suggestion.suggestion }));
      
      // Show suggestion in a toast with action
      toast(
        (t) => (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              AI Suggestion for {fieldId}:
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {suggestion.suggestion}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                onClick={() => {
                  handleFieldChange(fieldId, suggestion.suggestion);
                  toast.dismiss(t.id);
                }}
              >
                Apply
              </Button>
              <Button
                size="small"
                color="inherit"
                onClick={() => toast.dismiss(t.id)}
              >
                Dismiss
              </Button>
            </Stack>
          </Box>
        ),
        { duration: 10000 }
      );
    } catch (error) {
      toast.error('Failed to get AI suggestion');
    } finally {
      setFieldSuggestions(prev => {
        const newState = { ...prev };
        delete newState[fieldId];
        return newState;
      });
    }
  };

  // Save document
  const handleSave = async (data: any) => {
    await saveMutation.mutateAsync(data);
  };

  // Auto-save
  useEffect(() => {
    if (!isDirty) return;
    
    const timeout = setTimeout(() => {
      handleSubmit(handleSave)();
    }, 3000); // Auto-save after 3 seconds of inactivity

    return () => clearTimeout(timeout);
  }, [formValues, isDirty]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!document) {
    return (
      <Container>
        <Alert severity="error">Document not found</Alert>
      </Container>
    );
  }

  const template = document.template;
  const fields = template.fields || [];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Grid container spacing={3}>
        {/* Main content */}
        <Grid item xs={12} lg={showComments || showHistory || showAI ? 8 : 12}>
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 2,
              position: 'relative',
              minHeight: 'calc(100vh - 200px)',
            }}
          >
            {/* Header */}
            <Box mb={4}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                mb={2}
              >
                <Box>
                  <Typography variant="h4" gutterBottom>
                    {document.title}
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <DocumentStatus status={document.status} />
                    <Chip
                      label={template.name}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Typography variant="body2" color="text.secondary">
                      Version {document.version} • Last updated{' '}
                      {format(new Date(document.updatedAt), 'PPp')}
                    </Typography>
                  </Stack>
                </Box>

                <Stack direction="row" spacing={1}>
                  {/* Active users */}
                  <AvatarGroup max={4} sx={{ mr: 2 }}>
                    {activeUsers.map((user) => (
                      <Tooltip key={user.userId} title={user.userId}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: 'primary.main',
                          }}
                        >
                          {user.userId.charAt(0).toUpperCase()}
                        </Avatar>
                      </Tooltip>
                    ))}
                  </AvatarGroup>

                  {/* Action buttons */}
                  <Tooltip title="AI Assistant">
                    <IconButton onClick={() => setShowAI(!showAI)} color={showAI ? 'primary' : 'default'}>
                      <Badge variant="dot" color="success">
                        <AIIcon />
                      </Badge>
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Comments">
                    <IconButton onClick={() => setShowComments(!showComments)}>
                      <Badge badgeContent={document.comments?.length || 0} color="primary">
                        <CommentIcon />
                      </Badge>
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Version History">
                    <IconButton onClick={() => setShowHistory(!showHistory)}>
                      <HistoryIcon />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Share">
                    <IconButton>
                      <ShareIcon />
                    </IconButton>
                  </Tooltip>

                  <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                    <MoreIcon />
                  </IconButton>
                </Stack>
              </Stack>

              <Divider />
            </Box>

            {/* Form fields */}
            <form onSubmit={handleSubmit(handleSave)}>
              <Stack spacing={3}>
                {fields.map((field, index) => (
                  <Fade in key={field.id} timeout={300 * (index + 1)}>
                    <Box>
                      <Controller
                        name={field.name}
                        control={control}
                        defaultValue={field.defaultValue || ''}
                        render={({ field: controllerField }) => (
                          <Box position="relative">
                            <FieldRenderer
                              field={field}
                              value={controllerField.value}
                              onChange={(value) => handleFieldChange(field.name, value)}
                              onFocus={() => setActiveField(field.id)}
                              onBlur={() => setActiveField(null)}
                            />
                            
                            {/* AI suggestion button */}
                            {field.aiSuggestionEnabled && (
                              <Box
                                position="absolute"
                                top={0}
                                right={0}
                                sx={{
                                  opacity: activeField === field.id ? 1 : 0,
                                  transition: 'opacity 0.2s',
                                }}
                              >
                                <Tooltip title="Get AI suggestion">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleAISuggestion(field.name, field.type)}
                                    disabled={fieldSuggestions[field.name] === 'loading'}
                                  >
                                    {fieldSuggestions[field.name] === 'loading' ? (
                                      <CircularProgress size={16} />
                                    ) : (
                                      <AIIcon fontSize="small" />
                                    )}
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            )}
                          </Box>
                        )}
                      />
                    </Box>
                  </Fade>
                ))}
              </Stack>

              {/* Save button */}
              <Box mt={4} display="flex" justifyContent="flex-end">
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<SaveIcon />}
                  onClick={handleSubmit(handleSave)}
                  disabled={saveMutation.isLoading || !isDirty}
                >
                  {saveMutation.isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </form>

            {/* Approval workflow */}
            {document.status === 'pending_approval' && (
              <Box mt={4}>
                <ApprovalWorkflow
                  document={document}
                  onApprove={() => refetch()}
                  onReject={() => refetch()}
                />
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Side panels */}
        <AnimatePresence>
          {(showComments || showHistory || showAI) && (
            <Grid item xs={12} lg={4}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <Paper elevation={0} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
                  {showComments && (
                    <CommentThread
                      documentId={document.id}
                      comments={document.comments || []}
                      onAddComment={(comment) => {
                        socket?.emit('add-comment', comment);
                        refetch();
                      }}
                    />
                  )}

                  {showHistory && (
                    <VersionHistory
                      documentId={document.id}
                      currentVersion={document.version}
                    />
                  )}

                  {showAI && (
                    <AIAssistant
                      document={document}
                      template={template}
                      onAnalyze={() => refetch()}
                    />
                  )}
                </Paper>
              </motion.div>
            </Grid>
          )}
        </AnimatePresence>
      </Grid>

      {/* More options menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => navigate(`/analytics?documentId=${id}`)}>
          <AnalyticsIcon sx={{ mr: 1 }} /> View Analytics
        </MenuItem>
        <MenuItem onClick={() => navigate(`/collaboration/${id}`)}>
          <CollaboratorsIcon sx={{ mr: 1 }} /> Manage Collaborators
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {}}>Export as PDF</MenuItem>
        <MenuItem onClick={() => {}}>Export as Word</MenuItem>
      </Menu>
    </Container>
  );
};