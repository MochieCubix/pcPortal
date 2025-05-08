import React, { useState } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';

interface QuickViewPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceNumber?: string;
  pdfUrl: string;
  onDownload?: () => void;
}

const QuickViewPdfModal: React.FC<QuickViewPdfModalProps> = ({
  isOpen,
  onClose,
  invoiceNumber = '',
  pdfUrl,
  onDownload
}) => {
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  
  if (!isOpen) return null;
  
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 2.5));
  };
  
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };
  
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Default download behavior if no callback provided
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Invoice-${invoiceNumber || 'document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="pdf-viewer-modal" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between rounded-t-lg">
            <h2 className="text-lg font-medium">
              {invoiceNumber ? `Invoice #${invoiceNumber}` : 'Document Viewer'}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                className="p-1 rounded-full hover:bg-blue-700 transition-colors"
                title="Zoom Out"
              >
                <MinusIcon className="h-5 w-5" />
              </button>
              <span className="text-sm bg-blue-700 px-2 py-0.5 rounded">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 rounded-full hover:bg-blue-700 transition-colors"
                title="Zoom In"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
              
              <button
                onClick={handleDownload}
                className="p-1 rounded-full hover:bg-blue-700 transition-colors ml-2"
                title="Download PDF"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>
              
              <button 
                onClick={onClose}
                className="p-1 rounded-full hover:bg-blue-700 transition-colors"
                title="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* PDF Viewer */}
          <div className="flex-grow overflow-auto bg-gray-100 p-4 flex justify-center">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            <div 
              className="transform transition-transform duration-200"
              style={{ transform: `scale(${scale})` }}
            >
              <iframe
                src={`${pdfUrl}#toolbar=0`}
                className="w-full h-[70vh] border-none shadow-lg bg-white"
                onLoad={() => setLoading(false)}
                title="PDF Viewer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export a hook for easier modal management
export const useQuickViewPdfModal = () => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    invoiceNumber?: string;
    pdfUrl: string;
    onDownload?: () => void;
  }>({
    isOpen: false,
    pdfUrl: '',
  });
  
  const openPdfModal = (pdfUrl: string, invoiceNumber?: string, onDownload?: () => void) => {
    setModalState({
      isOpen: true,
      pdfUrl,
      invoiceNumber,
      onDownload
    });
  };
  
  const closePdfModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };
  
  return {
    QuickViewPdfModalComponent: () => (
      <QuickViewPdfModal
        isOpen={modalState.isOpen}
        onClose={closePdfModal}
        pdfUrl={modalState.pdfUrl}
        invoiceNumber={modalState.invoiceNumber}
        onDownload={modalState.onDownload}
      />
    ),
    openPdfModal,
    closePdfModal
  };
};

export default QuickViewPdfModal; 