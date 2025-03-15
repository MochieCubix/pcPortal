'use client';

import { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { createPortal } from 'react-dom';

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  title?: string;
}

const PDFViewerModal = ({ 
  isOpen, 
  onClose, 
  pdfUrl,
  title = 'PDF Viewer'
}: PDFViewerModalProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !pdfUrl || typeof window === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] overflow-visible" 
      style={{ pointerEvents: 'auto' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      
      {/* Modal content */}
      <div 
        className="fixed inset-0 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full h-[90vh] flex flex-col overflow-visible"
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="flex items-center justify-between p-4 border-b"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-medium">{title}</h2>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          
          <div 
            className="flex-1 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <embed 
              src={pdfUrl} 
              type="application/pdf"
              className="w-full h-full border-0" 
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PDFViewerModal; 