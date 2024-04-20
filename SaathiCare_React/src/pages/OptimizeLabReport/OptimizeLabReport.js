import React, { useState, useRef } from 'react';
import { FaUpload, FaPaperPlane, FaUser, FaRobot, FaFilePdf } from 'react-icons/fa';
import './OptimizeLabReport.css';

const OptimizeLabReport = () => {
  const [chatMessages, setChatMessages] = useState([
    { type: 'bot', content: "Hello! Please upload a PDF or JSON file for analysis.", contentType: 'text' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const fileType = file.type;
      if (fileType === "application/pdf" || fileType === "application/json") {
        setSelectedFile(file.name);
      } else {
        alert("Unsupported file type. Please upload a PDF or JSON file.");
      }
    }
  };

  const handleSendFile = async () => {
    if (!selectedFile || !fileInputRef.current.files[0]) return;

    setIsLoading(true);
    setChatMessages(prevMessages => [
        ...prevMessages, 
        { type: 'user', content: selectedFile, contentType: 'file' }
    ]);

    const formData = new FormData();
    formData.append('file', fileInputRef.current.files[0]);

    setSelectedFile(null); 
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
        const response = await fetch('https://34.93.4.171:9070/pdf_summarizer', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setChatMessages((prevMessages) => [...prevMessages, { type: 'bot', content: result.response, contentType: 'text' }]);

    } catch (error) {
        console.error("Error submitting file:", error);
        setChatMessages(prevMessages => [
            ...prevMessages,
            { type: 'bot', content: "There was a problem analyzing the file.", contentType: 'text' }
        ]);
    }

    setIsLoading(false);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="main-content">
      <div className="chat-area">
        {chatMessages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.type}-message`}>
            <div className={`${msg.type}-icon`}>{msg.type === 'user' ? <FaUser /> : <FaRobot />}</div>
            {msg.contentType === 'file' ? (
              <div className="message-pdf">
                  <FaFilePdf className="pdf-icon" />
                  <span className="pdf-name">{msg.content}</span>
              </div>
            ): (
                <div className="message-text">{msg.content}</div>
            )}
          </div>
        ))}
      </div>
      <div className="input-area">
        <label className="icon upload-icon">
          <FaUpload />
          <input ref={fileInputRef} type="file" accept="application/pdf,application/json" style={{ display: 'none' }} onChange={handleFileChange} />
        </label>
        <div className={`preview-box ${selectedFile ? '' : 'disabled'}`}>
          {selectedFile && (
            <>
              <div className="preview-text">{selectedFile}</div>
              <span className="remove-image-icon" onClick={handleClearFile}>✖</span>
            </>
          )}
        </div>
        <button className={`send-button ${isLoading || !selectedFile ? 'disabled' : ''}`} onClick={handleSendFile} disabled={isLoading || !selectedFile}>
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
};

export default OptimizeLabReport;