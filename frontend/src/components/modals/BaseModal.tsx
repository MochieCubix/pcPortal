'use client';

import { ReactNode, useEffect, useId } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useModal } from '@/contexts/ModalContext';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  showCloseButton?: boolean;
  preventOutsideClose?: boolean;
}

export default function BaseModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'lg',
  showCloseButton = true,
  preventOutsideClose = false
}: BaseModalProps) {
  // Generate a unique ID for this modal instance
  const modalId = useId();
  const { openModal, closeModal, isModalOpen } = useModal();

  // Map of max width classes
  const maxWidthClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
    '5xl': 'sm:max-w-5xl',
    'full': 'sm:max-w-full'
  };

  // Create the modal content
  const ModalContent = (
    <div className={`relative rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl sm:my-8 sm:w-full ${maxWidthClasses[maxWidth]} sm:p-6`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold leading-6 text-gray-900">
          {title}
        </h3>
        {showCloseButton && (
          <button
            type="button"
            className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={onClose}
          >
            <span className="sr-only">Close</span>
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="mt-2">
        {children}
      </div>
    </div>
  );

  // Open or close the modal when isOpen changes
  useEffect(() => {
    if (isOpen && !isModalOpen(modalId)) {
      openModal(modalId, ModalContent);
    } else if (!isOpen && isModalOpen(modalId)) {
      closeModal(modalId);
    }
  }, [isOpen, modalId, openModal, closeModal, isModalOpen, ModalContent]);

  // Close the modal when the component unmounts
  useEffect(() => {
    return () => {
      if (isModalOpen(modalId)) {
        closeModal(modalId);
      }
    };
  }, [closeModal, isModalOpen, modalId]);

  // This component doesn't render anything directly
  // All rendering is handled by the ModalContext
  return null;
} 