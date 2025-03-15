import React, { useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { Resizable, ResizableBox } from 'react-resizable';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useEmail } from '../contexts/EmailContext';
import { XMarkIcon, PaperClipIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

const EmailComposer: React.FC = () => {
  const {
    emailState,
    closeEmailComposer,
    updatePosition,
    updateSize,
    setSubject,
    setBody,
    removeInvoice,
    removeRecipient,
    sendEmail,
  } = useEmail();

  const nodeRef = useRef(null);

  if (!emailState.isOpen) {
    return null;
  }

  const handleDragStop = (e: any, data: { x: number; y: number }) => {
    updatePosition({ x: data.x, y: data.y });
  };

  const handleResize = (e: any, { size }: { size: { width: number; height: number } }) => {
    updateSize({ width: size.width, height: size.height });
  };

  // Rich text editor modules configuration
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link'],
      ['clean']
    ],
  };
  
  // Rich text editor formats configuration
  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Draggable
        nodeRef={nodeRef}
        handle=".email-composer-header"
        defaultPosition={emailState.position}
        position={undefined}
        onStop={handleDragStop}
        bounds="parent"
      >
        <ResizableBox
          ref={nodeRef}
          width={emailState.size.width}
          height={emailState.size.height}
          minConstraints={[400, 400]}
          maxConstraints={[800, 800]}
          onResizeStop={handleResize}
          resizeHandles={['se']}
          className="bg-white rounded-lg shadow-xl overflow-hidden flex flex-col"
        >
          {/* Email Composer Header */}
          <div className="email-composer-header px-4 py-3 bg-gray-100 flex justify-between items-center border-b border-gray-200 cursor-move">
            <h3 className="font-medium">Compose Email</h3>
            <button 
              onClick={closeEmailComposer}
              className="text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Email Composer Body */}
          <div className="flex-grow p-4 flex flex-col overflow-auto">
            {/* Recipients */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">To:</label>
              <div className="flex flex-wrap gap-2 border rounded-md p-2 min-h-[40px]">
                {emailState.recipients.map((email) => (
                  <div 
                    key={email} 
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                  >
                    <span className="mr-1">{email}</span>
                    <button 
                      onClick={() => removeRecipient(email)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject:</label>
              <input
                type="text"
                value={emailState.subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter email subject"
              />
            </div>

            {/* Selected Invoices */}
            {emailState.selectedInvoices.length > 0 && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Attachments:</label>
                <div className="flex flex-wrap gap-2 border rounded-md p-2">
                  {emailState.selectedInvoices.map((invoice) => (
                    <div 
                      key={invoice.id} 
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                    >
                      <PaperClipIcon className="h-3 w-3 mr-1" />
                      <span className="mr-1">
                        Invoice #{invoice.invoiceNumber} ({invoice.jobName || invoice.jobId})
                      </span>
                      <button 
                        onClick={() => removeInvoice(invoice.id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rich Text Editor */}
            <div className="flex-grow">
              <ReactQuill
                theme="snow"
                value={emailState.body}
                onChange={setBody}
                modules={modules}
                formats={formats}
                className="h-[calc(100%-50px)]"
              />
            </div>
          </div>

          {/* Email Composer Footer */}
          <div className="px-4 py-3 bg-gray-100 border-t border-gray-200 flex justify-between items-center">
            {/* Error and Success Messages */}
            <div>
              {emailState.error && (
                <p className="text-red-500 text-sm">{emailState.error}</p>
              )}
              {emailState.success && (
                <p className="text-green-500 text-sm">{emailState.success}</p>
              )}
            </div>
            
            {/* Send Button */}
            <button
              onClick={sendEmail}
              disabled={emailState.isLoading || emailState.recipients.length === 0 || !emailState.subject}
              className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white 
                ${emailState.isLoading || emailState.recipients.length === 0 || !emailState.subject
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {emailState.isLoading ? (
                <span>Sending...</span>
              ) : (
                <>
                  <PaperAirplaneIcon className="h-4 w-4 mr-1" />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
        </ResizableBox>
      </Draggable>
    </div>
  );
};

export default EmailComposer; 