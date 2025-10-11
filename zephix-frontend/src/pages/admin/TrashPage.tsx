import React, { useState, useEffect } from 'react';
import { TrashIcon, ArrowUturnLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { trashService, TrashItem } from '../../services/trashService';
import UndoBanner from '../../components/common/UndoBanner';
import useUndoBanner from '../../hooks/useUndoBanner';

const TrashPage: React.FC = () => {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  
  // Undo banner functionality
  const { isVisible, message, showUndoBanner, handleUndo, handleDismiss } = useUndoBanner();

  useEffect(() => {
    loadTrashItems();
  }, []);

  const loadTrashItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await trashService.getTrashItems();
      setTrashItems(response.items);
    } catch (err: any) {
      console.error('Failed to load trash items:', err);
      setError(err.message || 'Failed to load trash items');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (item: TrashItem) => {
    try {
      await trashService.restoreItem(item.itemType, item.id);
      setTrashItems(trashItems.filter(i => i.id !== item.id));
      
      showUndoBanner(
        `${item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1)} "${item.itemName}" restored`,
        async () => {
          // Re-delete the item
          try {
            // Note: This would require a re-delete API endpoint
            console.log('Re-delete not implemented yet');
          } catch (error) {
            console.error('Failed to re-delete item:', error);
          }
        },
        5000
      );
    } catch (err: any) {
      console.error('Failed to restore item:', err);
      setError(err.message || 'Failed to restore item');
    }
  };

  const handlePermanentDelete = async (item: TrashItem) => {
    if (!confirm(`Are you sure you want to permanently delete this ${item.itemType}? This action cannot be undone.`)) {
      return;
    }

    try {
      await trashService.permanentDelete(item.itemType, item.id);
      setTrashItems(trashItems.filter(i => i.id !== item.id));
    } catch (err: any) {
      console.error('Failed to permanently delete item:', err);
      setError(err.message || 'Failed to permanently delete item');
    }
  };

  const handleBulkRestore = async () => {
    if (selectedItems.size === 0) return;

    const itemsToRestore = trashItems.filter(item => selectedItems.has(item.id));
    const itemTypes = itemsToRestore.map(item => ({ itemType: item.itemType, id: item.id }));

    try {
      await trashService.restoreMultipleItems(itemTypes);
      setTrashItems(trashItems.filter(item => !selectedItems.has(item.id)));
      setSelectedItems(new Set());
      
      showUndoBanner(
        `${itemsToRestore.length} items restored`,
        async () => {
          // Re-delete logic would go here
          console.log('Bulk re-delete not implemented yet');
        },
        5000
      );
    } catch (err: any) {
      console.error('Failed to restore items:', err);
      setError(err.message || 'Failed to restore items');
    }
  };

  const handleEmptyTrash = async () => {
    try {
      const result = await trashService.emptyTrash();
      setTrashItems([]);
      setSelectedItems(new Set());
      setShowEmptyConfirm(false);
      
      showUndoBanner(
        `Trash emptied - ${result.count} items permanently deleted`,
        async () => {
          // Empty trash cannot be undone
          console.log('Empty trash cannot be undone');
        },
        5000
      );
    } catch (err: any) {
      console.error('Failed to empty trash:', err);
      setError(err.message || 'Failed to empty trash');
    }
  };

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    setSelectedItems(new Set(trashItems.map(item => item.id)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getItemTypeColor = (itemType: string) => {
    const colors = {
      project: 'bg-blue-100 text-blue-800',
      task: 'bg-green-100 text-green-800',
      workspace: 'bg-purple-100 text-purple-800',
      team: 'bg-orange-100 text-orange-800',
      risk: 'bg-red-100 text-red-800',
      resource: 'bg-yellow-100 text-yellow-800',
    };
    return colors[itemType as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Undo Banner */}
      <UndoBanner
        visible={isVisible}
        message={message}
        onUndo={handleUndo}
        onDismiss={handleDismiss}
        duration={5000}
      />

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Trash</h1>
          <p className="text-gray-600 mt-2">
            Manage deleted items. Items in trash are automatically purged after 30 days.
          </p>
        </div>
        
        <div className="flex gap-3">
          {selectedItems.size > 0 && (
            <button
              onClick={handleBulkRestore}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <ArrowUturnLeftIcon className="w-4 h-4" />
              Restore Selected ({selectedItems.size})
            </button>
          )}
          
          <button
            onClick={() => setShowEmptyConfirm(true)}
            disabled={trashItems.length === 0}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <TrashIcon className="w-4 h-4" />
            Empty Trash
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {trashItems.length === 0 ? (
        <div className="text-center py-12">
          <TrashIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Trash is empty</h3>
          <p className="text-gray-600">No deleted items found.</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectedItems.size === trashItems.length && trashItems.length > 0}
                  onChange={selectedItems.size === trashItems.length ? deselectAll : selectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  {selectedItems.size > 0 ? `${selectedItems.size} selected` : 'Select all'}
                </span>
              </div>
              <span className="text-sm text-gray-600">
                {trashItems.length} item{trashItems.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {trashItems.map((item) => (
              <div key={`${item.itemType}-${item.id}`} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleItemSelection(item.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getItemTypeColor(item.itemType)}`}>
                          {item.itemType}
                        </span>
                        <h3 className="text-lg font-medium text-gray-900">{item.itemName}</h3>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <p>
                          Deleted by: {item.deletedByUser?.name || 'Unknown'} ({item.deletedByUser?.email || 'No email'})
                        </p>
                        <p>Deleted at: {formatDate(item.deletedAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestore(item)}
                      className="text-green-600 hover:text-green-800 p-2 rounded-lg hover:bg-green-50 transition-colors"
                      title="Restore"
                    >
                      <ArrowUturnLeftIcon className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => handlePermanentDelete(item)}
                      className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Permanently delete"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty Trash Confirmation Modal */}
      {showEmptyConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <TrashIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Empty Trash</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to permanently delete all {trashItems.length} items in trash? 
              This action cannot be undone.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEmptyConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEmptyTrash}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Empty Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrashPage;

