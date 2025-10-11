import React, { useState, useEffect } from 'react';
import { Save, Download, Share2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Select } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { ProjectDocument } from '../../../services/documentService';
import { toast } from 'sonner';

interface DocumentEditorProps {
  document: ProjectDocument;
  onSave: (content: any) => Promise<void>;
  onClose: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({ document, onSave, onClose }) => {
  const [content, setContent] = useState(document.content);
  const [hasChanges, setHasChanges] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Auto-save every 30 seconds if changes exist
    if (hasChanges && autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    if (hasChanges) {
      const timer = setTimeout(() => {
        handleSave();
      }, 30000);
      setAutoSaveTimer(timer);
    }

    return () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
    };
  }, [hasChanges, content]);

  const handleFieldChange = (sectionId: string, fieldId: string, value: any) => {
    const updatedContent = { ...content };
    const section = updatedContent.sections.find((s: any) => s.id === sectionId);
    const field = section.fields.find((f: any) => f.id === fieldId);
    field.value = value;
    
    setContent(updatedContent);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await onSave(content);
      setHasChanges(false);
      toast.success('Document saved');
    } catch (error) {
      toast.error('Failed to save document');
    }
  };

  const renderField = (field: any, sectionId: string) => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            value={field.value || ''}
            onChange={(e) => handleFieldChange(sectionId, field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      
      case 'textarea':
        return (
          <Textarea
            value={field.value || ''}
            onChange={(e) => handleFieldChange(sectionId, field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
          />
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={field.value || ''}
            onChange={(e) => handleFieldChange(sectionId, field.id, e.target.value)}
            required={field.required}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={field.value || ''}
            onChange={(e) => handleFieldChange(sectionId, field.id, e.target.value)}
            min={field.min}
            max={field.max}
            required={field.required}
          />
        );
      
      case 'select':
        return (
          <Select
            value={field.value || ''}
            onChange={(value) => handleFieldChange(sectionId, field.id, value)}
            options={field.options}
            required={field.required}
          />
        );
      
      case 'list':
        return (
          <ListField
            value={field.value || []}
            onChange={(value) => handleFieldChange(sectionId, field.id, value)}
            required={field.required}
          />
        );
      
      case 'table':
      case 'dynamic_table':
        return (
          <TableField
            value={field.value || []}
            columns={field.columns}
            onChange={(value) => handleFieldChange(sectionId, field.id, value)}
            required={field.required}
          />
        );
      
      case 'date_range':
        return (
          <DateRangeField
            value={field.value || { start: '', end: '' }}
            onChange={(value) => handleFieldChange(sectionId, field.id, value)}
            required={field.required}
          />
        );
      
      case 'signature':
        return (
          <SignatureField
            value={field.value || ''}
            onChange={(value) => handleFieldChange(sectionId, field.id, value)}
            required={field.required}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center p-4 border-b bg-white">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{document.documentName}</h2>
            <div className="flex items-center space-x-4 mt-2">
              <span className="text-sm text-gray-500">
                Version {document.version}
              </span>
              <Badge variant={document.status === 'approved' ? 'default' : 'secondary'}>
                {document.status}
              </Badge>
              <span className="text-sm text-gray-500">
                Last modified: {new Date(document.updatedAt).toLocaleDateString()}
              </span>
              {hasChanges && (
                <span className="text-sm text-amber-600">Unsaved changes</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges}
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          {content.sections.map((section: any) => (
            <Card key={section.id} className="mb-8 p-6">
              <h3 className="text-lg font-semibold mb-4">{section.title}</h3>
              <div className="space-y-4">
                {section.fields.map((field: any) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium mb-2">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderField(field, section.id)}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="p-4 border-t bg-white">
        <div className="flex justify-between">
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              Save as Draft
            </Button>
            <Button variant="outline" size="sm">
              Submit for Review
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button variant="default" size="sm">
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
            <Button variant="destructive" size="sm">
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper components
const ListField: React.FC<{ value: string[]; onChange: (value: string[]) => void; required?: boolean }> = ({ 
  value, 
  onChange, 
  required 
}) => {
  const addItem = () => {
    onChange([...value, '']);
  };

  const updateItem = (index: number, newValue: string) => {
    const newList = [...value];
    newList[index] = newValue;
    onChange(newList);
  };

  const removeItem = (index: number) => {
    const newList = value.filter((_, i) => i !== index);
    onChange(newList);
  };

  return (
    <div className="space-y-2">
      {value.map((item, index) => (
        <div key={index} className="flex space-x-2">
          <Input
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
            placeholder={`Item ${index + 1}`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removeItem(index)}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        Add Item
      </Button>
    </div>
  );
};

const TableField: React.FC<{ 
  value: any[]; 
  columns: any[]; 
  onChange: (value: any[]) => void; 
  required?: boolean 
}> = ({ value, columns, onChange, required }) => {
  const addRow = () => {
    const newRow: any = {};
    columns.forEach(col => {
      newRow[col.id] = '';
    });
    onChange([...value, newRow]);
  };

  const updateCell = (rowIndex: number, columnId: string, newValue: any) => {
    const newData = [...value];
    newData[rowIndex][columnId] = newValue;
    onChange(newData);
  };

  const removeRow = (rowIndex: number) => {
    const newData = value.filter((_, i) => i !== rowIndex);
    onChange(newData);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th key={col.id} className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {value.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t">
                {columns.map((col) => (
                  <td key={col.id} className="px-4 py-2">
                    {col.type === 'select' ? (
                      <Select
                        value={row[col.id] || ''}
                        onChange={(val) => updateCell(rowIndex, col.id, val)}
                        options={col.options}
                      />
                    ) : (
                      <Input
                        value={row[col.id] || ''}
                        onChange={(e) => updateCell(rowIndex, col.id, e.target.value)}
                        placeholder={col.label}
                      />
                    )}
                  </td>
                ))}
                <td className="px-4 py-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeRow(rowIndex)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        Add Row
      </Button>
    </div>
  );
};

const DateRangeField: React.FC<{ 
  value: { start: string; end: string }; 
  onChange: (value: { start: string; end: string }) => void; 
  required?: boolean 
}> = ({ value, onChange, required }) => {
  return (
    <div className="flex space-x-4">
      <div>
        <label className="block text-sm font-medium mb-1">Start Date</label>
        <Input
          type="date"
          value={value.start}
          onChange={(e) => onChange({ ...value, start: e.target.value })}
          required={required}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">End Date</label>
        <Input
          type="date"
          value={value.end}
          onChange={(e) => onChange({ ...value, end: e.target.value })}
          required={required}
        />
      </div>
    </div>
  );
};

const SignatureField: React.FC<{ 
  value: string; 
  onChange: (value: string) => void; 
  required?: boolean 
}> = ({ value, onChange, required }) => {
  return (
    <div className="space-y-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter signature"
        required={required}
      />
      <p className="text-sm text-gray-500">
        Digital signature will be implemented in future versions
      </p>
    </div>
  );
};


