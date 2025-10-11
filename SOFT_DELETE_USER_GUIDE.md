# Soft Delete User Guide

## What is Soft Delete?

Soft delete is a safety feature that prevents accidental data loss. When you "delete" a project or task, it's not immediately removed from the system. Instead, it's moved to a trash area where it can be recovered.

## For Regular Users

### Deleting Projects and Tasks

1. **Delete a Project:**
   - Go to the Projects page
   - Click the "Delete" button on any project
   - Confirm the deletion in the popup

2. **Delete a Task:**
   - Go to any project's task list
   - Click the "Delete" button on any task
   - Confirm the deletion in the popup

### Undo Feature

After deleting a project or task, you'll see an **undo banner** at the top of the page:

- ⏰ **10-second countdown** - You have 10 seconds to undo
- 🔄 **Undo button** - Click to restore the item immediately
- ❌ **Dismiss button** - Click to close the banner

**Important:** After 10 seconds, the undo banner disappears and you'll need admin help to restore the item.

## For Administrators

### Accessing the Trash

1. **Navigate to Trash:**
   - Go to the Admin section
   - Click on "Trash" in the sidebar
   - You'll see all deleted items from your organization

### Trash Page Features

#### Viewing Deleted Items
- **Pagination:** Use page controls to browse through many items
- **Item Details:** See what was deleted, when, and by whom
- **Filter by Type:** Projects and tasks are clearly labeled

#### Restoring Items

**Single Item Restore:**
1. Find the item you want to restore
2. Click the "Restore" button
3. The item will be restored to its original location

**Bulk Restore:**
1. Check the boxes next to multiple items
2. Click "Restore Selected"
3. All selected items will be restored

#### Permanent Deletion

**Single Item:**
1. Click the "Permanent Delete" button
2. Confirm the action
3. The item is permanently removed (cannot be recovered)

**Empty Entire Trash:**
1. Click "Empty Trash" button
2. Confirm the action
3. All items in trash are permanently deleted

### Trash Statistics

The trash page shows:
- **Total Items:** How many items are in trash
- **By Type:** Breakdown of projects vs tasks
- **Oldest/Newest:** When the first and last items were deleted

## Best Practices

### For Regular Users
- ✅ **Use the undo feature** - You have 10 seconds to change your mind
- ✅ **Be careful with deletions** - Even though items can be restored, it's better to be cautious
- ✅ **Contact admin if needed** - If you miss the undo window, ask an admin to restore the item

### For Administrators
- ✅ **Regular trash cleanup** - Periodically review and clean up old deleted items
- ✅ **Monitor deletions** - Check who's deleting what to identify patterns
- ✅ **Communicate with users** - Let users know about the undo feature
- ✅ **Backup before permanent deletion** - Consider backing up important data before permanent deletion

## Troubleshooting

### "I accidentally deleted a project/task"
- **Within 10 seconds:** Click the "Undo" button in the banner
- **After 10 seconds:** Contact an administrator to restore from trash

### "I can't see the trash page"
- Only administrators can access the trash page
- Contact your system administrator for access

### "The undo banner didn't appear"
- Check your browser's popup blocker settings
- Refresh the page and try deleting again
- Contact support if the issue persists

### "I can't restore an item"
- Make sure you have admin privileges
- Check that the item is still in the trash
- Contact support if you see error messages

## Technical Details

### What Happens During Soft Delete
1. Item is marked as deleted (not actually removed)
2. `deletedAt` timestamp is set
3. `deletedBy` user ID is recorded
4. Item disappears from normal views
5. Item appears in trash for admins

### What Happens During Restore
1. `deletedAt` field is cleared
2. `deletedBy` field is cleared
3. Item reappears in normal views
4. Item is removed from trash

### Data Retention
- Soft-deleted items are kept indefinitely until manually cleaned up
- Administrators can set up automatic cleanup policies
- All operations are logged for audit purposes

## Support

If you have questions or need help with soft delete functionality:

1. **Check this guide first** - Most questions are answered here
2. **Contact your administrator** - For trash access or item restoration
3. **Submit a support ticket** - For technical issues or bugs

---

**Remember:** Soft delete is a safety net, not a replacement for careful data management. Always double-check before deleting important information!





