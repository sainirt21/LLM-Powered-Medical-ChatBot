import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FaRobot, FaUser, FaPlay, FaMicrophone, FaPaperPlane, FaHourglassHalf } from 'react-icons/fa';
import './MainContent.css';

const MainContent = () => {
  const [chatStarted, setChatStarted] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentTagIndex, setCurrentTagIndex] = useState(-1);
  const [userInput, setUserInput] = useState('');
  const [shuffledTags, setShuffledTags] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const speechRecognition = useRef(null);
  const inputRef = useRef(null);
  const [inputDisabled, setInputDisabled] = useState(false);

  const [userName, setUserName] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [collectingUserInfo, setCollectingUserInfo] = useState(false);
  const [userInfoStep, setUserInfoStep] = useState('');
  const chatAreaRef = useRef(null);


  const initialTags = ['symptom', 'lifestyle', 'genetic'];

  useEffect(() => {
    if (chatStarted && !collectingUserInfo && currentTagIndex >= 0 && shuffledTags.length > currentTagIndex) {
        handleApiCall(shuffledTags[currentTagIndex]);
    }
    // eslint-disable-next-line
  }, [chatStarted, collectingUserInfo, shuffledTags, currentTagIndex]);

  const lazyInitSpeechRecognition = useCallback(() => {
    if (speechRecognition.current !== null) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript);
      };
      recognition.onend = () => {
        setIsListening(false);
      };
      speechRecognition.current = recognition;
    }
  }, []);

  useEffect(() => {
    lazyInitSpeechRecognition();
  }, [lazyInitSpeechRecognition]);

  const toggleListening = useCallback(() => {
    if (!isListening) {
      speechRecognition.current?.start();
    } else {
      speechRecognition.current?.stop();
    }
    setIsListening(!isListening);
    inputRef.current.focus();
  }, [isListening]);

  const startChat = () => {
    setCollectingUserInfo(true);
    setUserInfoStep('name');
    setChatMessages([{ type: 'bot', text: "Type your name" }]);
    setChatStarted(true);
  };

  const stateMappings = useMemo(() => ({
    symptom: 'symptom_questions',
    lifestyle: 'lifestyle_questions',
    genetic: 'genetic_questions',
    report: 'report_questions',
  }), []);

  const userStateMappings = {
    symptom: 'user_symptoms',
    lifestyle: 'user_lifestyle',
    genetic: 'user_genetic',
    report: 'user_report',
  };

  const [apiStates, setApiStates] = useState({
    greeting_response: "", 
    symptom_questions: [],
    lifestyle_questions: [],
    genetic_questions: [],
    report_questions: [],
    user_symptoms: [],
    user_lifestyle: [],
    user_genetic: [],
    user_report: [],
  });

  const fetchContext = async (userResponses) => {
    try {
      const response = await fetch('http://34.29.182.251:8090/process_responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_responses: userResponses }),
      });
      const data = await response.json();
      return data.response;
    } catch (error) {
      return "ERROR";
    }
  };

  const fetchClinicSuggestions = async (userAddress) => {
    try {
      const response = await fetch('http://34.29.182.251:9070/nearest_clinic', {
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
    setIsLoading(true);
    let context = '';
    if (tag === 'report') {
      const userResponses = {
        lifestyle: apiStates.user_lifestyle.join(", "),
        symptom: apiStates.user_symptoms.join(", "),
        genetic: apiStates.user_genetic.join(", ")
      };
      context = await fetchContext(userResponses);
      let prompt = await generatePromptForTag(userName, tag, currentTagIndex, shuffledTags, apiStates, stateMappings, userStateMappings, context);
      try {
        const response = await fetch('http://34.29.182.251:8080/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: prompt, tag: tag, context: context}),
        });
        const data = await response.json();
        setChatMessages((chatMessages) => [...chatMessages, { type: 'bot', text: data.response }]);
        setInputDisabled(true);
        setIsListening(false); 
        setTimeout(async () => {
          const clinicSuggestions = await fetchClinicSuggestions(userAddress);
          setChatMessages((chatMessages) => [...chatMessages, { type: 'bot', text: `You can visit any of the following clinics:\n ${clinicSuggestions}` }]);
        }, 2000);
      } catch (error) {
        setChatMessages((chatMessages) => [...chatMessages, { type: 'bot', text: 'There was an error processing your request.' }]);
        setInputDisabled(true);
        setIsListening(false);
        setTimeout(async () => {
          const clinicSuggestions = await fetchClinicSuggestions(userAddress);
          setChatMessages((chatMessages) => [...chatMessages, { type: 'bot', text: `You can visit any of the following clinics:\n ${clinicSuggestions}` }]);
          setIsLoading(false);
          setInputDisabled(true);
          setIsListening(false); 
        }, 2000);
      }
    }
    else{
      let prompt = await generatePromptForTag(userName,tag, currentTagIndex, shuffledTags, apiStates, stateMappings, userStateMappings, context);
      try {
        const response = await fetch('http://34.29.182.251:8080/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: prompt, tag: tag, context: context}),
        });
        const data = await response.json();
        const botQuestion = { type: 'bot', text: data.response };
        setChatMessages((chatMessages) => [...chatMessages, botQuestion]);
        setApiStates((prevStates) => ({
          ...prevStates,
          [stateMappings[tag]]: [...prevStates[stateMappings[tag]], data.response],
        }));
      } catch (error) {
        setChatMessages((chatMessages) => [...chatMessages, { type: 'bot', text: 'There was an error processing your request.' }]);
      }
    }
    setIsLoading(false);
    // eslint-disable-next-line
  }, [userName,userAddress, currentTagIndex, shuffledTags, apiStates]);

  const handleInputChange = useCallback((event) => {
    setUserInput(event.target.value);
  }, []);

  const handleSendMessage = useCallback(() => {
    if (!userInput.trim() || isLoading) return;
    setInputDisabled(true);
    const newUserMessage = { type: 'user', text: userInput };
    setChatMessages(chatMessages => [...chatMessages, newUserMessage]);

    if (collectingUserInfo) {
      if (userInfoStep === 'name') {
        setUserName(userInput);
        setUserInfoStep('address');
        setChatMessages(messages => [...messages, { type: 'bot', text: "Type your address" }]);
        setUserInput(''); 
      } else if (userInfoStep === 'address') {
        setUserAddress(userInput);
        setCollectingUserInfo(false);
        const shuffled = shuffleArray([...initialTags]);
        shuffled.push('report');
        setShuffledTags(shuffled);
        setChatMessages(messages => [...messages, { type: 'bot', text: `Hi ${userName}, I am your doctor. How can I help you today?` }]);
        setChatStarted(true);
        setUserInput('');
      }
    } else {
        if (currentTagIndex === -1) {
            setApiStates(prevStates => ({
              ...prevStates,
              greeting_response: userInput,
            }));
            setCurrentTagIndex(0);
          } else {
            const currentTag = shuffledTags[currentTagIndex];
            const userStateKey = userStateMappings[currentTag];
            setApiStates(prevStates => ({
              ...prevStates,
              [userStateKey]: [...prevStates[userStateKey], userInput],
            }));
        
            const nextIndex = currentTagIndex + 1;
            if (nextIndex < shuffledTags.length) {
              setCurrentTagIndex(nextIndex);
            }
          }    
        }

    setUserInput('');
    setInputDisabled(false);
    inputRef.current.focus();
    // eslint-disable-next-line
  }, [userInput, isLoading, chatMessages, collectingUserInfo, userInfoStep, userName, currentTagIndex, shuffledTags]);

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

  const resetChat = useCallback(() => {
    setChatStarted(false);
    setChatMessages([]);
    setCurrentTagIndex(-1);
    setUserInput('');
    setShuffledTags([]);
    setIsListening(false);
    setIsLoading(false);
    setInputDisabled(false);
    setCollectingUserInfo(false);
    setUserInfoStep('');
    setUserName('');
    setUserAddress('');
  }, []);
  
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [chatMessages]);
  

    return (
        <div className="main-content">
            {!chatStarted && (
            <button className="start-chat-button" onClick={startChat}>
            <FaPlay className="start-icon" /> Start Chat
            </button>
            )}
            {(chatStarted || collectingUserInfo) && (
            <>
            <div className="chat-area" ref={chatAreaRef}>
            {chatMessages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.type}-message`}>
                {msg.type === 'user' ? <FaUser className="message-icon user-icon" /> : <FaRobot className="message-icon bot-icon" />}
                <div>
                  {msg.text.includes('\n') ? (
                    msg.text.split('\n').map((line, lineIndex) => (
                      <React.Fragment key={lineIndex}>
                        {line}{lineIndex < msg.text.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))
                  ) : msg.text}
                </div>
              </div>
            ))}
            </div>
            <div className={`input-area ${inputDisabled ? 'disabled' : ''}`}>
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
  } else if (currentTagIndex === shuffledTags.length - 1) {
    prompt = `Greeting Question: ${greetingQuestion}
              Greeting Response from Patient: ${greetingResponse}
              Patient symptoms: ${apiStates.user_symptoms.join(", ")}.
              Lifestyle and eating habits: ${apiStates.user_lifestyle.join(", ")}.
              Family history of diseases: ${apiStates.user_genetic.join(", ")}.

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
