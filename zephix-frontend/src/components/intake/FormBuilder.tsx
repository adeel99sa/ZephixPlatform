import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  GripVertical,
  Type,
  Hash,
  Calendar,
  List,
  File,
  CheckSquare,
  Radio,
  Mail,
  Phone,
  Link,
  AlignLeft,
  Settings,
  Eye,
  Copy,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { FormBuilderProps, IntakeForm, FormField, FormSection, FORM_FIELD_TYPES } from '../../types/workflow';
import { Button } from '../ui/Button';

const FIELD_TYPE_ICONS = {
  text: Type,
  textarea: AlignLeft,
  number: Hash,
  date: Calendar,
  select: List,
  multiselect: List,
  file: File,
  checkbox: CheckSquare,
  radio: Radio,
  url: Link,
  email: Mail,
  phone: Phone,
};

interface FieldEditorProps {
  field: FormField | null;
  onSave: (field: FormField) => void;
  onCancel: () => void;
}

const FieldEditor: React.FC<FieldEditorProps> = ({ field, onSave, onCancel }) => {
  const [editField, setEditField] = useState<FormField>(() => 
    field || {
      id: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      placeholder: '',
      helpText: '',
    }
  );

  const handleSave = () => {
    if (!editField.label.trim()) return;
    onSave(editField);
  };

  const handleUpdate = (updates: Partial<FormField>) => {
    setEditField({ ...editField, ...updates });
  };

  const handleOptionsUpdate = (optionsString: string) => {
    const options = optionsString.split('\n').map(opt => opt.trim()).filter(Boolean);
    handleUpdate({ options });
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white">
          {field ? 'Edit Field' : 'Add New Field'}
        </h4>
        <div className="flex items-center space-x-2">
          <Button size="sm" onClick={handleSave}>Save</Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Field Label *
          </label>
          <input
            type="text"
            value={editField.label}
            onChange={(e) => handleUpdate({ label: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter field label"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Field Type
          </label>
          <select
            value={editField.type}
            onChange={(e) => handleUpdate({ type: e.target.value as any })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Object.entries(FORM_FIELD_TYPES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Placeholder Text
        </label>
        <input
          type="text"
          value={editField.placeholder || ''}
          onChange={(e) => handleUpdate({ placeholder: e.target.value })}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter placeholder text"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Help Text
        </label>
        <input
          type="text"
          value={editField.helpText || ''}
          onChange={(e) => handleUpdate({ helpText: e.target.value })}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter help text"
        />
      </div>

      {(editField.type === 'select' || editField.type === 'multiselect' || editField.type === 'radio') && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Options (one per line)
          </label>
          <textarea
            value={editField.options?.join('\n') || ''}
            onChange={(e) => handleOptionsUpdate(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Option 1&#10;Option 2&#10;Option 3"
          />
        </div>
      )}

      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="required"
          checked={editField.required}
          onChange={(e) => handleUpdate({ required: e.target.checked })}
          className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
        />
        <label htmlFor="required" className="text-sm text-slate-300">
          Required field
        </label>
      </div>
    </div>
  );
};

interface FieldCardProps {
  field: FormField;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const FieldCard: React.FC<FieldCardProps> = ({
  field,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown
}) => {
  const Icon = FIELD_TYPE_ICONS[field.type] || Type;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 group hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <Icon className="w-5 h-5 text-slate-400 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-medium text-white">{field.label}</h4>
              {field.required && (
                <span className="text-red-400 text-xs">*</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {FORM_FIELD_TYPES[field.type]}
            </p>
            {field.placeholder && (
              <p className="text-xs text-slate-500 mt-1 italic">
                "{field.placeholder}"
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="h-6 w-6 p-0"
          >
            <ArrowUp className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="h-6 w-6 p-0"
          >
            <ArrowDown className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-6 w-6 p-0"
          >
            <Edit3 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {field.options && field.options.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <p className="text-xs text-slate-400 mb-2">Options:</p>
          <div className="flex flex-wrap gap-1">
            {field.options.slice(0, 3).map((option, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded text-xs bg-slate-700 text-slate-300"
              >
                {option}
              </span>
            ))}
            {field.options.length > 3 && (
              <span className="text-xs text-slate-500">
                +{field.options.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const FormBuilder: React.FC<FormBuilderProps> = ({
  form,
  onUpdate,
  readonly = false
}) => {
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);

  if (!form) return null;

  const handleAddField = () => {
    setEditingField(null);
    setShowFieldEditor(true);
  };

  const handleEditField = (field: FormField) => {
    setEditingField(field);
    setShowFieldEditor(true);
  };

  const handleSaveField = (field: FormField) => {
    const updatedFields = editingField
      ? form.formSchema.fields.map(f => f.id === editingField.id ? field : f)
      : [...form.formSchema.fields, field];

    // Update sections if adding new field
    const updatedSections = [...form.formSchema.sections];
    if (!editingField) {
      // Add to first section or create one if none exist
      if (updatedSections.length === 0) {
        updatedSections.push({
          id: 'section_1',
          title: 'Form Fields',
          fields: [field.id],
        });
      } else {
        updatedSections[0].fields.push(field.id);
      }
    }

    onUpdate({
      formSchema: {
        ...form.formSchema,
        fields: updatedFields,
        sections: updatedSections,
      },
    });

    setShowFieldEditor(false);
    setEditingField(null);
  };

  const handleDeleteField = (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this field?')) return;

    const updatedFields = form.formSchema.fields.filter(f => f.id !== fieldId);
    const updatedSections = form.formSchema.sections.map(section => ({
      ...section,
      fields: section.fields.filter(id => id !== fieldId),
    }));

    onUpdate({
      formSchema: {
        ...form.formSchema,
        fields: updatedFields,
        sections: updatedSections,
      },
    });
  };

  const handleMoveField = (fieldId: string, direction: 'up' | 'down') => {
    const fields = [...form.formSchema.fields];
    const currentIndex = fields.findIndex(f => f.id === fieldId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= fields.length) return;
    
    // Swap fields
    [fields[currentIndex], fields[newIndex]] = [fields[newIndex], fields[currentIndex]];
    
    onUpdate({
      formSchema: {
        ...form.formSchema,
        fields,
      },
    });
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Form Header */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Form Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                disabled={readonly}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Enter form name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <textarea
                value={form.description || ''}
                onChange={(e) => onUpdate({ description: e.target.value })}
                disabled={readonly}
                rows={3}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                placeholder="Describe what this form is for"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                URL Slug
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-400">{window.location.origin}/intake/</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => onUpdate({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  disabled={readonly}
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  placeholder="form-slug"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Form Fields</h3>
            {!readonly && (
              <Button onClick={handleAddField}>
                <Plus className="w-4 h-4 mr-2" />
                Add Field
              </Button>
            )}
          </div>

          {showFieldEditor && (
            <div className="mb-6">
              <FieldEditor
                field={editingField}
                onSave={handleSaveField}
                onCancel={() => {
                  setShowFieldEditor(false);
                  setEditingField(null);
                }}
              />
            </div>
          )}

          {form.formSchema.fields.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Type className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-300 mb-2">No Fields Added</h3>
              <p className="text-slate-500 mb-4">Start building your form by adding fields</p>
              {!readonly && (
                <Button onClick={handleAddField}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Field
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {form.formSchema.fields.map((field, index) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  onEdit={() => handleEditField(field)}
                  onDelete={() => handleDeleteField(field.id)}
                  onMoveUp={() => handleMoveField(field.id, 'up')}
                  onMoveDown={() => handleMoveField(field.id, 'down')}
                  canMoveUp={index > 0}
                  canMoveDown={index < form.formSchema.fields.length - 1}
                />
              ))}
            </div>
          )}
        </div>

        {/* Form Settings */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-medium text-white mb-4">Thank You Message</h3>
          <textarea
            value={form.thankYouMessage || ''}
            onChange={(e) => onUpdate({ thankYouMessage: e.target.value })}
            disabled={readonly}
            rows={3}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            placeholder="Message shown to users after they submit the form"
          />
        </div>
      </div>
    </div>
  );
};
