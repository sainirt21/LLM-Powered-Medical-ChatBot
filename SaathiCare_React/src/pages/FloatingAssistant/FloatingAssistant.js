import React, { useState } from 'react';
import './FloatingAssistant.css';

const FloatingAssistant = () => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('http://34.29.182.251:9090/process_query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userInput: query }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setAnswer(data.response);
    } catch (error) {
      console.error('Error:', error);
      setAnswer('Error fetching data');
    }
    setIsLoading(false);
  };

  const handleClear = () => {
    setQuery('');
    setAnswer('');
  };

  if (isMinimized) {
    return (
      <div className="assistant-minimized" onClick={toggleMinimize}>
        <span>+</span>
      </div>
    );
  }

  return (
    <div className="assistant-maximized">
      <div className="minimize-button" onClick={toggleMinimize}>—</div>
      <div className="content">
        <p>How can I help you?</p>
        <form onSubmit={handleSubmit}>
          <input type="text" value={query} onChange={handleQueryChange} placeholder="Ask me anything..." />
          <div className="form-actions">
            <button type="submit" disabled={isLoading}>Submit</button>
            {isLoading && <div className="loader"></div>}
            <button type="button" onClick={handleClear}>Clear</button>
          </div>
        </form>
      </div>
      {answer && (
        <div className="response-section">
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
};

export default FloatingAssistant;
