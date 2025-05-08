import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';

interface DualPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceUrl: string;
  invoiceTitle?: string;
  timesheets: Array<{
    id: string;
    url: string;
    name: string;
    type: string;
  }>;
}

const DualPreviewModal: React.FC<DualPreviewModalProps> = ({
  isOpen,
  onClose,
  invoiceUrl,
  invoiceTitle = 'Invoice',
  timesheets
}) => {
  const [leftPanelExpanded, setLeftPanelExpanded] = useState(false);
  const [rightPanelExpanded, setRightPanelExpanded] = useState(false);
  const [currentTimesheetIndex, setCurrentTimesheetIndex] = useState(0);
  const [initialWidth, setInitialWidth] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Set initial width based on screen size
  useEffect(() => {
    if (isOpen && modalRef.current && !initialWidth) {
      const modalWidth = modalRef.current.clientWidth - 40; // Accounting for padding
      setInitialWidth(modalWidth / 2);
    }
  }, [isOpen, initialWidth]);

  // Reset expanded states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLeftPanelExpanded(false);
      setRightPanelExpanded(false);
    }
  }, [isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  // Navigate between timesheets
  const goToNextTimesheet = () => {
    if (timesheets.length > 1) {
      setCurrentTimesheetIndex((prev) => (prev + 1) % timesheets.length);
    }
  };

  const goToPreviousTimesheet = () => {
    if (timesheets.length > 1) {
      setCurrentTimesheetIndex((prev) => (prev === 0 ? timesheets.length - 1 : prev - 1));
    }
  };

  const handleTimesheetSelection = (index: number) => {
    setCurrentTimesheetIndex(index);
  };

  // Function to render the appropriate preview based on file type
  const renderFilePreview = (url: string, type: string) => {
    const fileType = type.toLowerCase();
    
    if (fileType.includes('pdf')) {
      return (
        <iframe 
          src={`${url}#toolbar=0&navpanes=0`} 
          className="w-full h-full border-0"
          title="PDF Preview"
        />
      );
    } else if (fileType.includes('image') || 
              fileType.endsWith('jpg') || 
              fileType.endsWith('jpeg') || 
              fileType.endsWith('png') || 
              fileType.endsWith('gif') ||
              fileType.endsWith('heic')) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <img 
            src={url} 
            alt="Preview" 
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    } else {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <div className="text-center p-4">
            <p className="text-gray-700 mb-2">Cannot preview this file type</p>
            <a 
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Download File
            </a>
          </div>
        </div>
      );
    }
  };

  if (!isOpen) return null;

  // Current timesheet
  const currentTimesheet = timesheets[currentTimesheetIndex] || null;

  // Determine which panels to show based on expansion states
  const showLeftPanel = !rightPanelExpanded;
  const showRightPanel = !leftPanelExpanded && timesheets.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-60" onClick={onClose}></div>
      
      <div 
        className="absolute inset-5 bg-white rounded-lg shadow-xl flex flex-col"
        ref={modalRef}
      >
        {/* Modal header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">
            {invoiceTitle} {currentTimesheet && `| ${currentTimesheet.name}`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* Modal content - dual panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel - Invoice */}
          {showLeftPanel && initialWidth && (
            <div className={`relative ${leftPanelExpanded ? 'w-full' : 'flex-1'}`}>
              <div className="absolute top-2 right-2 z-10 flex space-x-2">
                <button
                  onClick={() => setLeftPanelExpanded(!leftPanelExpanded)}
                  className="p-1 rounded-md bg-white bg-opacity-75 hover:bg-opacity-100 shadow"
                  title={leftPanelExpanded ? "Minimize" : "Maximize"}
                >
                  {leftPanelExpanded ? (
                    <ArrowsPointingInIcon className="h-4 w-4 text-gray-600" />
                  ) : (
                    <ArrowsPointingOutIcon className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              </div>
              <div className="h-full overflow-auto">
                {renderFilePreview(invoiceUrl, 'application/pdf')}
              </div>
            </div>
          )}
          
          {/* Resizable divider */}
          {showLeftPanel && showRightPanel && initialWidth && (
            <ResizableBox
              width={initialWidth}
              height={Infinity}
              axis="x"
              handle={
                <div className="absolute inset-y-0 right-0 w-3 cursor-col-resize z-10 border-r-4 border-transparent hover:border-blue-400">
                  <div className="h-full w-1 mx-auto bg-gray-300"></div>
                </div>
              }
              resizeHandles={['e']}
              minConstraints={[200, Infinity]}
              maxConstraints={[modalRef.current ? modalRef.current.clientWidth - 200 : 800, Infinity]}
              onResize={(e, data) => {
                setInitialWidth(data.size.width);
              }}
              className={`relative border-l border-gray-200 ${leftPanelExpanded || rightPanelExpanded ? 'hidden' : 'block'}`}
            >
              <div className="sr-only">Resize handle</div>
            </ResizableBox>
          )}
          
          {/* Right panel - Timesheets */}
          {showRightPanel && timesheets.length > 0 && currentTimesheet && (
            <div className={`relative ${rightPanelExpanded ? 'w-full' : 'flex-1'}`}>
              {/* Timesheet navigation controls */}
              <div className="absolute top-2 left-2 z-10 flex space-x-2">
                {timesheets.length > 1 && (
                  <>
                    <button
                      onClick={goToPreviousTimesheet}
                      className="p-1 rounded-md bg-white bg-opacity-75 hover:bg-opacity-100 shadow"
                      title="Previous timesheet"
                    >
                      <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
                    </button>
                    <span className="p-1 rounded-md bg-white bg-opacity-75 text-xs">
                      {currentTimesheetIndex + 1} / {timesheets.length}
                    </span>
                    <button
                      onClick={goToNextTimesheet}
                      className="p-1 rounded-md bg-white bg-opacity-75 hover:bg-opacity-100 shadow"
                      title="Next timesheet"
                    >
                      <ChevronRightIcon className="h-4 w-4 text-gray-600" />
                    </button>
                  </>
                )}
              </div>
              
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={() => setRightPanelExpanded(!rightPanelExpanded)}
                  className="p-1 rounded-md bg-white bg-opacity-75 hover:bg-opacity-100 shadow"
                  title={rightPanelExpanded ? "Minimize" : "Maximize"}
                >
                  {rightPanelExpanded ? (
                    <ArrowsPointingInIcon className="h-4 w-4 text-gray-600" />
                  ) : (
                    <ArrowsPointingOutIcon className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              </div>
              
              <div className="h-full overflow-auto">
                {renderFilePreview(currentTimesheet.url, currentTimesheet.type)}
              </div>
            </div>
          )}
          
          {/* Empty state when no timesheets */}
          {showRightPanel && timesheets.length === 0 && (
            <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
              <div className="text-center">
                <p className="text-gray-500">No timesheets attached to this invoice</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Thumbnails for multiple timesheets */}
        {timesheets.length > 1 && (
          <div className="p-3 border-t border-gray-200 overflow-x-auto">
            <div className="flex space-x-2">
              {timesheets.map((timesheet, index) => (
                <button
                  key={timesheet.id}
                  onClick={() => handleTimesheetSelection(index)}
                  className={`
                    flex-shrink-0 h-16 w-16 border-2 rounded overflow-hidden focus:outline-none
                    ${currentTimesheetIndex === index ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'}
                  `}
                  title={timesheet.name}
                >
                  {timesheet.type.includes('image') || 
                   timesheet.type.endsWith('jpg') || 
                   timesheet.type.endsWith('jpeg') || 
                   timesheet.type.endsWith('png') || 
                   timesheet.type.endsWith('gif') ? (
                    <img 
                      src={timesheet.url} 
                      alt={timesheet.name} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gray-100 text-xs text-gray-500">
                      {timesheet.type.includes('pdf') ? 'PDF' : 'File'}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DualPreviewModal; 