import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FaRobot, FaUser, FaPlay, FaMicrophone, FaPaperPlane, FaHourglassHalf, FaVolumeUp } from 'react-icons/fa';
import hark from 'hark';
import './MainContent.css';

const MainContent = () => {
  const [chatStarted, setChatStarted] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentTagIndex, setCurrentTagIndex] = useState(-1);
  const [userInput, setUserInput] = useState('');
  const [shuffledTags, setShuffledTags] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en-US');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [translatedInput, setTranslatedInput] = useState('');
  const [lastInputMethod, setLastInputMethod] = useState('typing');
  const inputRef = useRef(null);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [userName, setUserName] = useState('');
  const [userAge, setUserAge] = useState('');
  const [userGender, setUserGender] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [collectingUserInfo, setCollectingUserInfo] = useState(false);
  const [userInfoStep, setUserInfoStep] = useState('');
  const chatAreaRef = useRef(null);
  const [showFeedbackOptions, setShowFeedbackOptions] = useState(false);
  const [finalBotMessageShown, setFinalBotMessageShown] = useState(false);
  const [reportUploadAsked, setReportUploadAsked] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [waitingForReportUploadResponse, setWaitingForReportUploadResponse] = useState(false);
  const [shouldCallApiForReport, setShouldCallApiForReport] = useState(false);
  const [reportContext, setReportContext] = useState('');
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [yesOption, setYesOption] = useState('Yes');
  const [noOption, setNoOption] = useState('No');

  const initialTags = ['symptom', 'lifestyle', 'genetic', 'ongoing_medications'];

  const simplifyLanguageCode = (languageCode) => {
    const languageMap = {
      'en-US': 'en',
      'hi-IN': 'hi'
    };
    return languageMap[languageCode] || languageCode.split('-')[0];
  };  

  useEffect(() => {
    if (chatStarted && !collectingUserInfo && currentTagIndex >= 0 && shuffledTags.length > currentTagIndex) {
        handleApiCall(shuffledTags[currentTagIndex]);
    }
    // eslint-disable-next-line
  }, [chatStarted, collectingUserInfo, shuffledTags, currentTagIndex]);

  const translateText = async (text, languageCode) => {
    if (!text || !languageCode) {
      console.error("Missing text or language for translation:", { text, languageCode });
      return text;
    }
    const simpleLanguageCode = simplifyLanguageCode(languageCode);
    try {
      const response = await fetch('https://34.93.4.171:9070/translate_to_language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, target_language: simpleLanguageCode })
      });
      const data = await response.json();
      if (data.error) {
        console.error('Translation API error:', data.error);
        return text;
      }
      return data.translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text; 
    }
  };  

      // eslint-disable-next-line
  const handleBotMessage = async (message) => {
    setIsLoading(true);
    const translatedMessage = await translateText(message, language);
    const textMessage = typeof translatedMessage === 'string' ? translatedMessage : 'Invalid message format';
    setChatMessages((prevMessages) => [...prevMessages, { type: 'bot', text: textMessage }]);
    setIsLoading(false);
};

      // eslint-disable-next-line
      const handleUserMessage = async (message) => {
        setIsLoading(true);
        const translatedMessage = await translateText(message, language);
        const textMessage = typeof translatedMessage === 'string' ? translatedMessage : 'Invalid message format';
        setChatMessages((prevMessages) => [...prevMessages, { type: 'user', text: textMessage }]);
        setIsLoading(false);
    };

  const stopisListening = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const startisListening = useCallback(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const speechEvents = hark(stream, {});

        speechEvents.on('speaking', () => {
          console.log('speaking');
        });

        let silenceTimer = null;
        speechEvents.on('stopped_speaking', () => {
          if (silenceTimer) clearTimeout(silenceTimer);
          silenceTimer = setTimeout(() => {
            console.log('Silence for 3 seconds, stopping recording');
            stopisListening();
            speechEvents.stop();
          }, 3000);
        });

        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.addEventListener("dataavailable", (event) => {
          audioChunksRef.current.push(event.data);
        });

        mediaRecorderRef.current.addEventListener("stop", async () => {
          if (audioChunksRef.current && audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append("audio", audioBlob);
            formData.append("language", language);

            try {
              const response = await fetch('https://34.93.4.171:9070/speech_to_text', {
                method: 'POST',
                body: formData,
              });
              const data = await response.json();
              if (data.transcribedText && data.translatedText) {
                setUserInput(data.transcribedText);
                setTranslatedInput(data.translatedText.replace(/[.|]\s*/g, ''));
                setLastInputMethod('speech'); 
              } else {
                console.error('No transcription available:', data);
              }
            } catch (error) {
              console.error('Error:', error);
            }
          } else {
            console.log('No audio data available to send.');
          }
        });

        mediaRecorderRef.current.start();
        setIsListening(true);
      })
      .catch(error => console.log('Error accessing the microphone:', error));
  }, [language, stopisListening]);

  const toggleListening = useCallback(() => {
    if (!isListening) {
      startisListening();
    } else {
      stopisListening();
    }
    inputRef.current.focus();
  }, [isListening, startisListening, stopisListening]);

  const startChat = () => {
    setCollectingUserInfo(true);
    setUserInfoStep('name');
    handleBotMessage("Type your name");
    setChatStarted(true);
  };

  const stateMappings = useMemo(() => ({
    symptom: 'symptom_questions',
    lifestyle: 'lifestyle_questions',
    genetic: 'genetic_questions',
    ongoing_medications: 'medications_questions',
    report: 'report_questions',
  }), []);

  const userStateMappings = {
    symptom: 'user_symptoms',
    lifestyle: 'user_lifestyle',
    genetic: 'user_genetic',
    ongoing_medications: 'user_medications',
    report: 'user_report',
  };

  const [apiStates, setApiStates] = useState({
    greeting_response: "", 
    symptom_questions: [],
    lifestyle_questions: [],
    genetic_questions: [],
    medications_questions: [],
    report_questions: [],
    user_symptoms: [],
    user_lifestyle: [],
    user_genetic: [],
    user_medications: [],
    user_report: [],
  });

  const fetchContext = async (userResponses) => {
    console.log('Current report context:', reportContext);
    try {
      setIsLoading(false);
      setInputDisabled(true);
      setIsListening(false); 
      const response = await fetch('https://34.93.4.171:9070/process_responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_responses: userResponses }),
      });
      const data = await response.json();
      let context= data.response;
      if (reportContext) {
        console.log(reportContext);
        context += `\nPatients Lab Reports: ${reportContext}`;
      }
      return context;
    } catch (error) {
      return "ERROR";
    }
  };

  const fetchClinicSuggestions = async (userAddress) => {
    try {
      const response = await fetch('https://34.93.4.171:9070/nearest_clinic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: userAddress }),
      });
      const data = await response.json();
      return data.nearest_clinic.join(",\n");
    } catch (error) {
      return "Error fetching clinic suggestions";
    }
  };

  const handleApiCall = useCallback(async (tag) => {
    if (waitingForReportUploadResponse) return;
    setIsLoading(true);
    let context = '';
    if (tag === 'report') {
      const userResponses = {
        lifestyle: apiStates.user_lifestyle.join(", "),
        symptom: apiStates.user_symptoms.join(", "),
        genetic: apiStates.user_genetic.join(", "),
        ongoing_medications: apiStates.user_medications.join(", ")
      };
      setInputDisabled(false);
      context = await fetchContext(userResponses);
      let prompt = await generatePromptForTag(userName, tag, currentTagIndex, shuffledTags, apiStates, stateMappings, userStateMappings, context);
      try {
        const response = await fetch('https://34.93.4.171:9070/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: prompt, tag: tag, context: context}),
        });
        const data = await response.json();
        await handleBotMessage(data.response);
        setTimeout(async () => {
          const clinicSuggestions = await fetchClinicSuggestions(userAddress);
          await handleBotMessage(`You can visit any of the following clinics:\n ${clinicSuggestions}`);
          setShowFeedbackOptions(true);
        }, 2000);
      } catch (error) {
        await handleBotMessage('There was an error processing your request.');
      }
    }
    else{
      let prompt = await generatePromptForTag(userName,tag, currentTagIndex, shuffledTags, apiStates, stateMappings, userStateMappings, context);
      try {
        const response = await fetch('https://34.93.4.171:9070/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: prompt, tag: tag, context: context}),
        });
        const data = await response.json();
        await handleBotMessage(data.response);
        setApiStates((prevStates) => ({
          ...prevStates,
          [stateMappings[tag]]: [...prevStates[stateMappings[tag]], data.response],
        }));
      } catch (error) {
        await handleBotMessage('There was an error processing your request.');
      }
    }
    setIsLoading(false);
    // eslint-disable-next-line
  }, [userName, userAddress, currentTagIndex, shuffledTags, apiStates, waitingForReportUploadResponse,reportContext, fetchContext, fetchClinicSuggestions, handleBotMessage]);

  useEffect(() => {
    setInputDisabled(isLoading || waitingForReportUploadResponse || showUploadModal || reportUploadAsked);
  }, [isLoading, waitingForReportUploadResponse, showUploadModal, reportUploadAsked]);
  

  const handleInputChange = useCallback((event) => {
    setUserInput(event.target.value);
    setTranslatedInput('');
    setLastInputMethod('typing');
  }, []);

  const askForReportUpload = useCallback(() => {
    handleBotMessage("Would you like to upload a report? Please click Yes or No.");
    setReportUploadAsked(true);
    setWaitingForReportUploadResponse(true);
    setInputDisabled(true);
  }, [handleBotMessage]);
  
  useEffect(() => {
    if (!waitingForReportUploadResponse && shouldCallApiForReport) {
      handleApiCall('report');
      setShouldCallApiForReport(false);
    }
  }, [waitingForReportUploadResponse, shouldCallApiForReport, reportContext,handleApiCall]);
  
  const handleReportUploadResponse = useCallback((response) => {
    setReportUploadAsked(false);
    setInputDisabled(false);
    setWaitingForReportUploadResponse(false);
  
    if (response === yesOption) {
      setShowUploadModal(true);
    } else {
      handleUserMessage(response);
      setShouldCallApiForReport(true);
    }
  }, [handleUserMessage,yesOption]);

const handleFileUpload = useCallback(async (file) => {
  setShowUploadModal(false);
  setInputDisabled(false);
  const formData = new FormData();
  formData.append('file', file);

  try {
      handleUserMessage(`Uploaded Report: ${file.name}`);
      const uploadResponse = await fetch('https://34.93.4.171:9070/pdf_summarizer', {
          method: 'POST',
          body: formData,
      });
      const uploadData = await uploadResponse.json();
      if (uploadData && typeof uploadData.response === 'string') {
        const contextUpload = uploadData.response;
        setReportContext(contextUpload);
        await handleBotMessage(uploadData.response);
    } else {
        await handleBotMessage("Received data from report analysis is not in expected format or is missing.");
        handleApiCall('report');
    }
  } catch (error) {
      console.error('Failed to upload report:', error);
      await handleBotMessage("There was an error in report analysis.");
      handleApiCall('report');
  }
      // eslint-disable-next-line
}, [handleApiCall, fetchClinicSuggestions, userAddress]);

useEffect(() => {
  if (reportContext) {
      handleApiCall('report');
  }
  // eslint-disable-next-line
}, [reportContext]);

const UploadModal = () => (
  <div className="upload-modal">
      <input type="file" accept="application/pdf,application/json" onChange={(e) => handleFileUpload(e.target.files[0])} />
      <button onClick={() => {
          setShowUploadModal(false);
          setWaitingForReportUploadResponse(true);
          setReportUploadAsked(true);
          setInputDisabled(true);
      }}>Cancel</button>
  </div>
);

  const handleSendMessage = useCallback(async () => {
    if (waitingForReportUploadResponse || isLoading || !userInput.trim()) return;
    setInputDisabled(true);
    const inputForBackend = lastInputMethod === 'speech' ? translatedInput : userInput;
    const newUserMessage = { type: 'user', text: userInput };
    setChatMessages(chatMessages => [...chatMessages, newUserMessage]);
    setUserInput('');
    if (collectingUserInfo) {
      if (userInfoStep === 'name') {
        setUserName(inputForBackend);
        setUserInfoStep('age');
        await handleBotMessage("Type your age");
        setUserInput(''); 
      } else if (userInfoStep === 'age') {
        setUserAge(inputForBackend);
        setUserInfoStep('gender');
        await handleBotMessage("Type your gender");
        setUserInput(''); 
      } else if (userInfoStep === 'gender') {
        setUserGender(inputForBackend);
        setUserInfoStep('address');
        await handleBotMessage("Type your address");
        setUserInput(''); 
      } else if (userInfoStep === 'address') {
        setUserAddress(inputForBackend);
        setCollectingUserInfo(false);
        const shuffled = shuffleArray([...initialTags]);
        shuffled.push('report');
        setShuffledTags(shuffled);
        await handleBotMessage(`Hi ${userName}, I am your doctor. How can I help you today?`);
        setChatStarted(true);
        setUserInput('');
      }
    } else {
        if (currentTagIndex === -1) {
            setApiStates(prevStates => ({
              ...prevStates,
              greeting_response: inputForBackend,
            }));
            setCurrentTagIndex(0);
          } else {
            const currentTag = shuffledTags[currentTagIndex];
            const userStateKey = userStateMappings[currentTag];
            setApiStates(prevStates => ({
              ...prevStates,
              [userStateKey]: [...prevStates[userStateKey], inputForBackend],
            }));
        
            const nextIndex = currentTagIndex + 1;
            if (nextIndex < shuffledTags.length) {
              setCurrentTagIndex(nextIndex);
              if (shuffledTags[nextIndex] === 'report') {
                  askForReportUpload();
                  return;
              }
            }
          }    
        }

    setUserInput('');
    setTranslatedInput(''); 
    setInputDisabled(false);
    inputRef.current.focus();
    // eslint-disable-next-line
  }, [translatedInput, userInput, isLoading, chatMessages, collectingUserInfo, userInfoStep, userName, currentTagIndex, shuffledTags]);

  useEffect(() => {
    if (inputRef.current && !inputDisabled) {
        inputRef.current.focus();
    }
}, [chatMessages, inputDisabled]);

const handleLanguageChange = useCallback((event) => {
    setLanguage(event.target.value);
    if (isListening) {
      stopisListening();
    }
    setUserInput('');
  }, [isListening, stopisListening]);

  useEffect(() => {
    if (showFeedbackOptions) {
      handleBotMessage("Was this chat helpful?");
    }
    // eslint-disable-next-line
  }, [showFeedbackOptions]);
  
  const handleFeedbackResponse = async (response) => {
    await handleUserMessage(response);
    setShowFeedbackOptions(false);
    await handleBotMessage("Thank you for your feedback!");
    setFinalBotMessageShown(true);
  };
  

  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  useEffect(() => {
    if (isLoading) {
      setInputDisabled(true); 
    } else {
      setInputDisabled(false); 
    }
  }, [isLoading]);

  const speakMessage = (message, index) => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      if (speakingIndex === index) {
        setSpeakingIndex(null);
        return;
      }
    }
  
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = simplifyLanguageCode(language);
  
    utterance.onstart = () => {
      setSpeakingIndex(index);
    };
  
    utterance.onend = () => {
      setSpeakingIndex(null);
    };
  
    speechSynthesis.speak(utterance);
  };

  const updateOptionTranslations = useCallback(async () => {
    const translatedYes = await translateText('Yes', language);
    const translatedNo = await translateText('No', language);
    setYesOption(translatedYes);
    setNoOption(translatedNo);
        // eslint-disable-next-line
  }, [language]);
  
  useEffect(() => {
    updateOptionTranslations();
  }, [language, updateOptionTranslations]);
  
  const resetChat = useCallback(() => {
    setChatStarted(false);
    setChatMessages([]);
    setCurrentTagIndex(-1);
    setUserInput('');
    setTranslatedInput('');
    setLastInputMethod('typing');
    setShuffledTags([]);
    setIsListening(false);
    setIsLoading(false);
    setInputDisabled(false);
    setCollectingUserInfo(false);
    setUserInfoStep('');
    setUserName('');
    setUserAge('');
    setUserGender('');
    setUserAddress('');
    setYesOption('Yes');
    setNoOption('No');
    setSpeakingIndex(null);
    setApiStates({
        greeting_response: "", 
        symptom_questions: [],
        lifestyle_questions: [],
        genetic_questions: [],
        medications_questions: [],
        report_questions: [],
        user_symptoms: [],
        user_lifestyle: [],
        user_genetic: [],
        user_medications: [],
        user_report: [],
    });
}, []);

  
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [chatMessages, reportUploadAsked]);
  

    return (
        <div className="main-content">
          <select className="language-select" value={language} onChange={handleLanguageChange}>
                <option value="en-US">English</option>
                <option value="hi-IN">Hindi</option>
              </select>
            {!chatStarted && (
            <button className="start-chat-button" onClick={startChat}>
            <FaPlay className="start-icon" /> Start Chat
            </button>
            )}
            {(chatStarted || collectingUserInfo) && (
            <>
            <div className={`chat-area ${reportUploadAsked ? 'disabled' : ''}`} ref={chatAreaRef}>
              {chatMessages.map((msg, index) => (
                <div key={index} className={`chat-message ${msg.type}-message`}>
                  {msg.type === 'user' ? <FaUser className="message-icon user-icon" /> : <FaRobot className="message-icon bot-icon" />}
                  <div className="chat-message-text">
                    {msg.text && msg.text.split('\n').map((line, lineIndex, array) => (
                      <React.Fragment key={lineIndex}>
                        {line !== '.' ? line : null}
                        {lineIndex !== array.length - 1 && line !== '.' && <br />}
                      </React.Fragment>
                    ))}
                    {msg.type === 'bot' && (
                      <FaVolumeUp className={`speak-icon ${speakingIndex === index ? 'speaking' : ''}`} onClick={() => speakMessage(msg.text, index)} />
                    )}
                  </div>
                </div>
              ))}
              {reportUploadAsked && (
                <div className="feedback-options">
                  <button onClick={() => handleReportUploadResponse(yesOption)}>{yesOption}</button>
                  <button onClick={() => handleReportUploadResponse(noOption)}>{noOption}</button>
                </div>
            )}
            {showUploadModal && <UploadModal />}
              {showFeedbackOptions && (
                <div className="feedback-options">
                  <button onClick={() => handleFeedbackResponse(yesOption)}>{yesOption}</button>
                  <button onClick={() => handleFeedbackResponse(noOption)}>{noOption}</button>
                </div>
              )}
            </div>
            <div className={`input-area ${inputDisabled || reportUploadAsked || showUploadModal || showFeedbackOptions ? 'disabled' : ''}`}>
                <FaMicrophone className={`mic-icon ${isListening ? 'listening' : ''} ${inputDisabled ? 'disabled' : ''}`} onClick={toggleListening} />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type your response..."
                  className={`prompt-input ${inputDisabled ? 'disabled' : ''}`}
                  value={userInput}
                  onChange={handleInputChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={inputDisabled}
                />
                <button
                  className={`send-button ${isLoading || inputDisabled ? 'disabled' : ''}`}
                  onClick={handleSendMessage}
                  disabled={isLoading || inputDisabled}
                >
                  {isLoading ? <FaHourglassHalf className="hourglass" /> : <FaPaperPlane />}
                </button>
            </div>
            </>
            )}
            {chatStarted && (
                <button className="reset-chat-button" onClick={resetChat}>
                Reset Chat
                </button>
            )}
        </div>
    );
};

export default MainContent;

 function generatePromptForTag(userName,tag, currentTagIndex, shuffledTags, apiStates, stateMappings, userStateMappings,fetchedContext) {
  let prompt = "";
  const greetingQuestion =  `Hi ${userName}, I am your doctor. How can I help you today?`;
  const greetingResponse = apiStates.greeting_response;

  if (currentTagIndex === 0) {
    prompt = `Greeting Question: ${greetingQuestion}
              Greeting Response from Patient: ${greetingResponse}
              I am playing a doctor in a play. Please generate one question I should ask a patient about their ${tag}.
              Format your response strictly as follows: 
              ${tag.charAt(0).toUpperCase() + tag.slice(1)}: [A question related to the ${tag} they are having].`;
  } else if (currentTagIndex === 1) {
    const previousTag = shuffledTags[currentTagIndex - 1];
    const lastQuestion = apiStates[stateMappings[previousTag]].slice(-1)[0];
    const lastResponse = apiStates[userStateMappings[previousTag]].slice(-1)[0];

    prompt = `Greeting Question: ${greetingQuestion}
              Greeting Response from Patient: ${greetingResponse}
              Previous Question: ${lastQuestion}
              Previous Response from Patient: ${lastResponse}
              I am playing a doctor in a play. Please generate one question based on the previous responses I should ask a patient about their ${tag}.
              Format your response strictly as follows:
              ${tag.charAt(0).toUpperCase() + tag.slice(1)}: [A question related to the ${tag} they are having].`;
  } else if (currentTagIndex === 2) {
    const previousTags = shuffledTags.slice(0, 2);
    const previousQuestions = previousTags.map(tag => apiStates[stateMappings[tag]].slice(-1)[0]);
    const previousResponses = previousTags.map(tag => apiStates[userStateMappings[tag]].slice(-1)[0]);

    prompt = `Greeting Question: ${greetingQuestion}
              Greeting Response from Patient: ${greetingResponse}
              First Question: ${previousQuestions[0]}
              First Response from Patient: ${previousResponses[0]}
              Second Question: ${previousQuestions[1]}
              Second Response from Patient: ${previousResponses[1]}
              I am playing a doctor in a play. Please generate one question that I should ask a patient based on the previous responses, about their ${tag}.
              Format your response strictly as follows:
              ${tag.charAt(0).toUpperCase() + tag.slice(1)}: [A question related to the ${tag} they are having].`;
  } else if (currentTagIndex === 3) {
    const previousTags = shuffledTags.slice(0, 2);
    const previousQuestions = previousTags.map(tag => apiStates[stateMappings[tag]].slice(-1)[0]);
    const previousResponses = previousTags.map(tag => apiStates[userStateMappings[tag]].slice(-1)[0]);

    prompt = `Greeting Question: ${greetingQuestion}
              Greeting Response from Patient: ${greetingResponse}
              First Question: ${previousQuestions[0]}
              First Response from Patient: ${previousResponses[0]}
              Second Question: ${previousQuestions[1]}
              Second Response from Patient: ${previousResponses[1]}
              Third Question: ${previousQuestions[2]}
              Third Response from Patient: ${previousResponses[2]}
              I am playing a doctor in a play. Please generate one question that I should ask a patient based on the previous responses, about their ${tag}.
              Format your response strictly as follows:
              ${tag.charAt(0).toUpperCase() + tag.slice(1)}: [A question related to the ${tag} they are having].`;
  }else if (currentTagIndex === shuffledTags.length - 1) {
    prompt = `Greeting Question: ${greetingQuestion}
              Greeting Response from Patient: ${greetingResponse}
              Patient symptoms: ${apiStates.user_symptoms.join(", ")}.
              Lifestyle and eating habits: ${apiStates.user_lifestyle.join(", ")}.
              Family history of diseases: ${apiStates.user_genetic.join(", ")}.
              User Current medications: ${apiStates.user_medications.join(", ")}.
              
              Data Source for analysis:
              ${fetchedContext}

              Based on the patient's symptoms and provided context, provide a possible diagnosis, recommended treatments, and specialists to consult. 
              NOTE: 1. This will not be considered as a real treatment, don't give any note or precaution with your response.
                    2. Make your diagnosis strictly based of of Data Source for analysis provided. 
              Format your response strictly as follows:
              Diagnosis: [Specific diagnosis based on the symptoms].
              Treatments:
              - [Treatment 1]
              - [Treatment 2]
              - [Treatment 3]
              ...
              Specialists:
              - [Specialist 1]
              - [Specialist 2]
              - [Specialist 3]
              ...
              END OF RESPONSE`;
  }
  return prompt;
}
