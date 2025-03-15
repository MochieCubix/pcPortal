import { useState, useRef } from 'react';
import Head from 'next/head';
import { FiUpload, FiFileText, FiAlertCircle, FiCheck, FiRefreshCw } from 'react-icons/fi';

export default function TextractPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [humanReviewRequired, setHumanReviewRequired] = useState(false);
  const [humanReviewUrl, setHumanReviewUrl] = useState(null);
  const [fileId, setFileId] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setFile(null);
      setError('Please select a valid PDF file');
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError(null);
    } else {
      setFile(null);
      setError('Please drop a valid PDF file');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setHumanReviewRequired(false);
    setHumanReviewUrl(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'upload');

      const response = await fetch('/api/textract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process file');
      }

      const data = await response.json();
      setResults(data.extractedData);
      setFileId(data.fileId);
      
      if (data.requiresHumanReview) {
        setHumanReviewRequired(true);
        setHumanReviewUrl(data.humanReviewUrl);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'An error occurred during processing');
    } finally {
      setLoading(false);
    }
  };

  const handleReprocess = async () => {
    if (!fileId) {
      setError('No file to reprocess');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('fileId', fileId);
      formData.append('action', 'reprocess');

      const response = await fetch('/api/textract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reprocess file');
      }

      const data = await response.json();
      setResults(data.extractedData);
      
      if (data.requiresHumanReview) {
        setHumanReviewRequired(true);
        setHumanReviewUrl(data.humanReviewUrl);
      } else {
        setHumanReviewRequired(false);
        setHumanReviewUrl(null);
      }
    } catch (err) {
      console.error('Reprocessing error:', err);
      setError(err.message || 'An error occurred during reprocessing');
    } finally {
      setLoading(false);
    }
  };

  const handleTrainModel = async () => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('action', 'sagemaker-train');

      const response = await fetch('/api/textract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start training');
      }

      const data = await response.json();
      alert(`Training job started: ${data.trainingJobName}`);
    } catch (err) {
      console.error('Training error:', err);
      setError(err.message || 'An error occurred while starting training');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>AWS Textract Document Processing</title>
        <meta name="description" content="Process documents with AWS Textract and A2I" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto py-10 px-4 max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          AWS Textract Document Processing
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload Timesheet</h2>
          
          {/* File upload area */}
          <div
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer ${
              file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleFileDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="application/pdf"
            />
            
            {file ? (
              <div className="flex flex-col items-center">
                <FiFileText className="w-12 h-12 text-green-500 mb-2" />
                <p className="text-green-600 font-medium">{file.name}</p>
                <p className="text-gray-500 text-sm">
                  {(file.size / 1024).toFixed(2)} KB • PDF
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <FiUpload className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-gray-600 font-medium">
                  Drag & drop your PDF file here or click to browse
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Supported format: PDF
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
              <div className="flex items-center">
                <FiAlertCircle className="w-5 h-5 mr-2" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-4">
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className={`py-2 px-6 rounded-md flex items-center ${
                !file || loading
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-r-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <FiUpload className="mr-2" />
                  Process with Textract
                </>
              )}
            </button>

            {results && (
              <button
                onClick={handleReprocess}
                disabled={loading}
                className={`py-2 px-6 rounded-md flex items-center ${
                  loading
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <FiRefreshCw className="mr-2" />
                Reprocess
              </button>
            )}

            {results && (
              <button
                onClick={handleTrainModel}
                disabled={loading}
                className={`py-2 px-6 rounded-md flex items-center ${
                  loading
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                <FiCheck className="mr-2" />
                Train SageMaker Model
              </button>
            )}
          </div>
        </div>

        {/* Human review notification */}
        {humanReviewRequired && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiAlertCircle className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Human review required
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Some fields had low confidence scores (below 80%). The document has been sent for human review to improve accuracy.
                  </p>
                  {humanReviewUrl && (
                    <a
                      href={humanReviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-yellow-800 hover:text-yellow-600 underline"
                    >
                      View human review task
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results section */}
        {results && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Extracted Data</h2>
            
            {/* Key-Value Pairs */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Form Fields</h3>
              <div className="overflow-x-auto bg-gray-50 rounded-lg p-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Field
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Confidence
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(results.keyValuePairs || {}).map(([key, value], index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {key}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {value}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {results.confidenceScores && results.confidenceScores[key] ? (
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                  className={`h-2.5 rounded-full ${
                                    results.confidenceScores[key] >= 80
                                      ? 'bg-green-500'
                                      : 'bg-yellow-500'
                                  }`}
                                  style={{
                                    width: `${results.confidenceScores[key]}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="ml-2">
                                {results.confidenceScores[key].toFixed(2)}%
                              </span>
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </td>
                      </tr>
                    ))}
                    {(!results.keyValuePairs || Object.keys(results.keyValuePairs).length === 0) && (
                      <tr>
                        <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">
                          No form fields found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Tables */}
            {results.tables && results.tables.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-3">Tables</h3>
                {results.tables.map((table, tableIndex) => (
                  <div key={tableIndex} className="mb-6 overflow-x-auto bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-600 mb-2">
                      Table {tableIndex + 1}
                    </h4>
                    <table className="min-w-full divide-y divide-gray-200">
                      <tbody className="bg-white divide-y divide-gray-200">
                        {table.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <td
                                key={cellIndex}
                                className={`px-6 py-4 text-sm ${
                                  rowIndex === 0
                                    ? 'font-medium text-gray-900 bg-gray-50'
                                    : 'text-gray-500'
                                } border`}
                              >
                                {cell?.text || ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-auto py-6 border-t border-gray-200">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          <p>Powered by AWS Textract, Amazon A2I, and SageMaker</p>
        </div>
      </footer>
    </div>
  );
} 