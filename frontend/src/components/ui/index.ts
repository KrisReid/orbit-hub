// Shared UI Components

// Layout & Structure
export { Modal, ModalBody, ModalFooter } from './Modal';
export { Card, CardWithHeader, InfoCard } from './Card';
export { PageHeader, PrimaryActionButton } from './PageHeader';
export {
  DetailPageLayout,
  ContentCard,
  SidebarCard,
  InfoList,
  DeleteButton,
} from './DetailPageLayout';

// Forms
export { FormModal, EditFormModal } from './FormModal';
export {
  FormLabel,
  TextInput,
  Textarea,
  SelectInput,
  Checkbox,
  UrlInput,
  MultiSelect,
  DateInput,
  NumberInput,
  DynamicField,
  CustomFields,
} from './FormField';
export type { CustomFieldDefinition, FieldType } from './FormField';

// Inline Editable Components
export {
  InlineEditableText,
  InlineEditableTextarea,
  InlineEditableTitle,
  DebouncedInput,
  DebouncedTextarea,
} from './InlineEditable';

// Dropdown Components
export {
  Dropdown,
  BreadcrumbDropdown,
  SimpleSelector,
} from './Dropdown';

// Data Display
export { DataTable, TableCellWithIcon, TableActionsCell, TableFilters } from './DataTable';
export type { Column } from './DataTable';
export { StatusBadge, getStatusColor, AutoStatusBadge } from './StatusBadge';
export { EmptyState } from './EmptyState';

// Linked Items
export {
  LinkedItemsList,
  LinkedItemRow,
  LinkedTaskRow,
  LinkedProjectRow,
} from './LinkedItemsList';

// Loading & Feedback
export { LoadingSpinner, Skeleton, PageLoading } from './LoadingSpinner';

// Navigation & Selection
export { WorkflowSelector, WorkflowSelectorHorizontal } from './WorkflowSelector';

// Buttons & Actions
export { Button, IconButton } from './Button';