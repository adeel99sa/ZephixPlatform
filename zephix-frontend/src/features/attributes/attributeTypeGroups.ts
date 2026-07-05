import type { AttributeDataType } from './attributes.types';
import { ATTRIBUTE_CREATABLE_DATA_TYPES } from './attributes.types';

export const ATTRIBUTE_POPULAR_TYPES: AttributeDataType[] = [
  'text',
  'number',
  'single_select',
  'date',
  'people',
  'currency',
];

export const ATTRIBUTE_TYPE_LABELS: Record<AttributeDataType, string> = {
  text: 'Text',
  long_text: 'Long text',
  number: 'Number',
  integer: 'Integer',
  decimal: 'Decimal',
  currency: 'Currency',
  percentage: 'Percentage',
  date: 'Date',
  datetime: 'Date & time',
  duration: 'Duration',
  boolean: 'Checkbox',
  single_select: 'Single select',
  multi_select: 'Multi select',
  people: 'People',
  relationship: 'Relationship',
  url: 'URL',
  email: 'Email',
  file_reference: 'File',
  computed: 'Computed',
  rating: 'Rating',
};

export function creatableTypesGrouped(): {
  popular: AttributeDataType[];
  all: AttributeDataType[];
} {
  const all = [...ATTRIBUTE_CREATABLE_DATA_TYPES];
  const popular = ATTRIBUTE_POPULAR_TYPES.filter((t) =>
    (all as readonly AttributeDataType[]).includes(t),
  );
  return { popular, all };
}
