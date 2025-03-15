'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import FocusLock from 'react-focus-lock';
import { AnimatePresence, motion } from 'framer-motion';

// Define the Modal type
type Modal = {
  id: string;
  component: ReactNode;
  props?: Record<string, any>;
};

// Define the ModalContext type
type ModalContextType = {
  modals: Modal[];
  openModal: (id: string, component: ReactNode, props?: Record<string, any>) => void;
  closeModal: (id: string) => void;
  isModalOpen: (id: string) => boolean;
};

// Create the context with undefined as default value
const ModalContext = createContext<ModalContextType | undefined>(undefined);

// Animation variants for Framer Motion
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 0.5 }
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } }
};

/**
 * ModalProvider component that manages the modal state and rendering
 */
export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modals, setModals] = useState<Modal[]>([]);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const previousBodyOverflow = useRef<string>('');

  // Create a portal container when the component mounts
  useEffect(() => {
    // Create a container for the modals if it doesn't exist
    if (!document.getElementById('modal-root')) {
      const modalRoot = document.createElement('div');
      modalRoot.id = 'modal-root';
      document.body.appendChild(modalRoot);
      setPortalContainer(modalRoot);
    } else {
      setPortalContainer(document.getElementById('modal-root'));
    }

    return () => {
      const modalRoot = document.getElementById('modal-root');
      if (modalRoot) {
        document.body.removeChild(modalRoot);
      }
    };
  }, []);

  // Prevent body scrolling when modals are open
  useEffect(() => {
    if (modals.length > 0) {
      // Save the current overflow style
      previousBodyOverflow.current = document.body.style.overflow;
      // Prevent scrolling on the body
      document.body.style.overflow = 'hidden';
    } else {
      // Restore the overflow style when no modals are open
      document.body.style.overflow = previousBodyOverflow.current;
    }

    return () => {
      // Ensure we restore the overflow style when the component unmounts
      document.body.style.overflow = previousBodyOverflow.current;
    };
  }, [modals.length]);

  // Open a modal
  const openModal = useCallback((id: string, component: ReactNode, props?: Record<string, any>) => {
    setModals((prevModals) => {
      // Check if a modal with this ID already exists
      const existingModalIndex = prevModals.findIndex(modal => modal.id === id);
      
      // If it exists, replace it
      if (existingModalIndex >= 0) {
        const newModals = [...prevModals];
        newModals[existingModalIndex] = { id, component, props };
        return newModals;
      }
      
      // Otherwise, add it to the stack
      return [...prevModals, { id, component, props }];
    });
  }, []);

  // Close a modal
  const closeModal = useCallback((id: string) => {
    setModals((prevModals) => {
      // If no specific ID is provided or it matches the last modal, remove the last one
      if (!id || id === prevModals[prevModals.length - 1]?.id) {
        return prevModals.slice(0, -1);
      }
      // Otherwise, remove the specific modal
      return prevModals.filter((modal) => modal.id !== id);
    });
  }, []);

  // Check if a modal is open
  const isModalOpen = useCallback((id: string) => {
    return modals.some((modal) => modal.id === id);
  }, [modals]);

  // If the portal container doesn't exist yet, just render the children
  if (!portalContainer) {
    return <>{children}</>;
  }

  return (
    <ModalContext.Provider value={{ modals, openModal, closeModal, isModalOpen }}>
      {children}
      {createPortal(
        <AnimatePresence>
          {modals.map((modal, index) => (
            <div 
              key={modal.id}
              className="fixed inset-0 z-[1000]"
              style={{ 
                zIndex: 1050 + index * 10,
              }}
              data-modal-id={modal.id}
            >
              {/* Backdrop */}
              <motion.div 
                className="fixed inset-0 bg-black"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={backdropVariants}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                style={{ zIndex: -1 }}
              />
              
              {/* Modal Content */}
              <FocusLock autoFocus={false} returnFocus>
                <div 
                  className="fixed inset-0 overflow-y-auto"
                >
                  <div 
                    className="flex min-h-full items-center justify-center p-4 text-center"
                  >
                    <motion.div
                      className="modal-content-wrapper"
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      variants={modalVariants}
                    >
                      {React.isValidElement(modal.component)
                        ? React.cloneElement(modal.component as React.ReactElement, {
                            ...modal.props,
                            onClose: () => closeModal(modal.id),
                          })
                        : modal.component}
                    </motion.div>
                  </div>
                </div>
              </FocusLock>
            </div>
          ))}
        </AnimatePresence>,
        portalContainer
      )}
    </ModalContext.Provider>
  );
};

/**
 * Custom hook to use the modal context
 */
export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}; 