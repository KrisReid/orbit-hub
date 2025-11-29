import { ReactNode, FormEvent } from 'react';
import { Modal, ModalBody, ModalFooter } from './Modal';
import { Button } from './Button';

export interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  title: string;
  children: ReactNode;
  submitLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  loadingLabel?: string;
}

export function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  submitLabel = 'Create',
  cancelLabel = 'Cancel',
  isLoading = false,
  isDisabled = false,
  size = 'md',
  loadingLabel,
}: FormModalProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <form onSubmit={handleSubmit}>
        <ModalBody>{children}</ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || isDisabled}
            isLoading={isLoading}
          >
            {isLoading && loadingLabel ? loadingLabel : submitLabel}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// Convenience wrapper for edit modals
export interface EditFormModalProps extends Omit<FormModalProps, 'submitLabel'> {
  submitLabel?: string;
}

export function EditFormModal({
  submitLabel = 'Save',
  loadingLabel = 'Saving...',
  ...props
}: EditFormModalProps) {
  return <FormModal submitLabel={submitLabel} loadingLabel={loadingLabel} {...props} />;
}