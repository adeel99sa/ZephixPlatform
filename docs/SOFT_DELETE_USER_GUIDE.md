# Soft Delete Feature Guide

## For Project Managers

### Deleting a Project
1. Find your project in the projects list
2. Click the three-dot menu (⋮)
3. Click "Delete"
4. A modern confirmation dialog appears asking "Are you sure you want to delete [Project Name]? You can undo this action within 10 seconds."
5. Click "Delete" to confirm
6. The project moves to trash and an undo banner appears at the bottom-left

### Undoing a Delete
- **Within 10 seconds**: Click "UNDO" in the bottom-left banner
- The project is immediately restored with all data intact
- The banner disappears automatically

### What Happens After 10 Seconds
- The undo banner disappears
- The project remains in the organization's trash
- Only organization admins can restore it from trash

### Deleting Tasks
1. Find the task in your project or task list
2. Click the trash icon (🗑️)
3. Confirm deletion in the dialog
4. Use the undo banner to restore within 10 seconds

## For Administrators

### Accessing Trash
- Navigate to Settings → Trash
- Or go directly to `/admin/trash`

### Restoring Projects
- **Single restore**: Click "Restore" button on a project
- **Bulk restore**: Select multiple projects, click "Bulk Restore"

### Permanent Deletion
- **Single**: Click "Permanent Delete" (requires confirmation)
- **Bulk**: Click "Empty Trash" to permanently delete all items

### Trash Management
- View all deleted items across the organization
- See who deleted what and when
- Filter by item type (projects, tasks, etc.)
- Search for specific deleted items

## Technical Details

### What Gets Soft Deleted
- Projects (and all associated data)
- Tasks (and all associated data)
- All related data (assignments, comments, etc.)

### What Does NOT Get Soft Deleted
- Users
- Organizations
- Workspaces
- Templates

### Database Behavior
- Soft delete sets `deleted_at` timestamp
- Soft delete records `deleted_by` user ID
- All queries automatically filter out deleted items
- Trash page queries explicitly include deleted items

### Data Retention
- Deleted items remain in trash indefinitely
- Admins can configure auto-purge (optional)
- Audit trail is preserved for compliance

## Troubleshooting

### "Failed to restore project" Error
- Check if you have admin permissions
- Verify the project still exists in trash
- Try refreshing the page and attempting again

### Undo Banner Not Appearing
- Check if JavaScript is enabled
- Verify you're using a supported browser
- Try refreshing the page

### Can't Access Trash Page
- Ensure you have admin role
- Check organization permissions
- Contact your system administrator

## Best Practices

### For Project Managers
- Use the 10-second undo window to double-check deletions
- Don't delete projects unless you're certain
- Check with team members before deleting shared projects

### For Administrators
- Regularly review trash for accidentally deleted items
- Set up auto-purge policies for data retention compliance
- Monitor analytics for delete/undo patterns

## Analytics & Insights

The system tracks:
- How often items are deleted
- How often deletions are undone
- Time to undo (how quickly users change their mind)
- Delete patterns by user and organization

This data helps improve the platform and user experience.

## Support

If you encounter issues with soft delete:
1. Check this guide first
2. Try refreshing the page
3. Contact your system administrator
4. Submit a support ticket with details

## Version History

- **v1.0** (Current): Initial soft delete implementation
  - Modern confirmation dialogs
  - Bottom-left undo banner with countdown
  - Comprehensive analytics tracking
  - Admin trash management
  - Bulk restore operations





