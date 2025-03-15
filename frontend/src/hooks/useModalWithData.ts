'use client';

import { useState, useCallback } from 'react';
import { useModal } from '@/contexts/ModalContext';

/**
 * A hook for managing modals with data
 * @param modalId A unique identifier for the modal
 * @returns An object with functions to open and close the modal, and the current data
 */
export function useModalWithData<T = any>(modalId: string) {
  const { openModal, closeModal, isModalOpen } = useModal();
  const [data, setData] = useState<T | null>(null);

  // Open the modal with data
  const open = useCallback((component: React.ReactNode, modalData?: T) => {
    if (modalData) {
      setData(modalData);
    }
    openModal(modalId, component);
  }, [modalId, openModal]);

  // Close the modal and clear the data
  const close = useCallback(() => {
    closeModal(modalId);
    setData(null);
  }, [modalId, closeModal]);

  // Check if the modal is open
  const isOpen = useCallback(() => {
    return isModalOpen(modalId);
  }, [modalId, isModalOpen]);

  return {
    open,
    close,
    isOpen: isOpen(),
    data
  };
} 