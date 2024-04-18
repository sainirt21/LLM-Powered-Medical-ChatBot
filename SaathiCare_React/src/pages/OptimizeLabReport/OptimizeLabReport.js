import React, { useState, useRef } from 'react';
import { FaUpload, FaPaperPlane, FaUser, FaRobot, FaFilePdf } from 'react-icons/fa';
import './OptimizeLabReport.css';

const OptimizeLabReport = () => {
  const [chatMessages, setChatMessages] = useState([
    { type: 'bot', content: "Hello! Please upload pdf for analysis.", contentType: 'text' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState(null);
  const fileInputRef = useRef(null);

  const handlePDFChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      const pdfFile = event.target.files[0];
      setSelectedPDF(pdfFile.name);
    }
  };

const handleSendPDF = async () => {
    if (!selectedPDF || !fileInputRef.current.files[0]) return;

    setIsLoading(true);
setChatMessages(prevMessages => [
    ...prevMessages, 
    { type: 'user', content: selectedPDF, contentType: 'pdf' }
]);

    const formData = new FormData();
    formData.append('file', fileInputRef.current.files[0]);

        setSelectedPDF(null); 
        if (fileInputRef.current) fileInputRef.current.value = '';

    try {
        const response = await fetch('http://34.29.182.251:9080/predict', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        let analysisResult = `<strong>Analysis Result: </strong>`;
        switch (result.prediction_class) {
            case "No DR":
                analysisResult += "No Diabetic Retinopathy detected";
                break;
            case "Mild":
                analysisResult += "Mild Diabetic Retinopathy";
                break;
            case "Moderate":
                analysisResult += "Moderate Diabetic Retinopathy";
                break;
            case "Severe":
                analysisResult += "Severe Diabetic Retinopathy";
                break;
            case "Proliferative DR":
                analysisResult += "Proliferative Diabetic Retinopathy detected";
                break;
            default:
                analysisResult += "Analysis Result: Unknown";
                break;
        }

        setChatMessages(prevMessages => [
            ...prevMessages,
            { type: 'bot', content: analysisResult, contentType: 'html', prediction: result.prediction }
        ]);

    } catch (error) {
        console.error("Error submitting image:", error);
        setChatMessages(prevMessages => [
            ...prevMessages,
            { type: 'bot', content: "There was a problem analyzing the pdf.", contentType: 'text', }
        ]);
    }

    setIsLoading(false);
};  

  const handleClearImage = () => {
    setSelectedPDF(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="main-content">
      <div className="chat-area">
      {chatMessages.map((msg, index) => (
        <div key={index} className={`chat-message ${msg.type}-message`}>
          <div className={`${msg.type}-icon`}>{msg.type === 'user' ? <FaUser /> : <FaRobot />}</div>
          {msg.contentType === 'pdf' ? (
            <div className="message-pdf">
                <FaFilePdf className="pdf-icon" />
                <span className="pdf-name">{msg.content}</span>
            </div>
          ) : msg.contentType === 'html' ? (
              <div className={`message-text prediction-${msg.prediction}`} dangerouslySetInnerHTML={{ __html: msg.content }}></div> 
          ) : (
              <div className="message-text">{msg.content}</div>
          )}
        </div>
      ))}

      </div>
      <div className="input-area">
        <label className="icon upload-icon">
          <FaUpload />
          <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handlePDFChange} />
        </label>
        <div className={`preview-box ${selectedPDF ? '' : 'disabled'}`}>
          {selectedPDF && (
            <>
              <div className="preview-text">{selectedPDF}</div>
              <span className="remove-image-icon" onClick={handleClearImage}>✖</span>
            </>
          )}
        </div>
        <button className={`send-button ${isLoading || !selectedPDF ? 'disabled' : ''}`} onClick={handleSendPDF} disabled={isLoading || !selectedPDF}>
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
};

export default OptimizeLabReport;
