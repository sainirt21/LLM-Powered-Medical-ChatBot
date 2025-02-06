import React, { useState, useEffect, useContext } from 'react';
import { FaChevronDown, FaChevronUp, FaNotesMedical, FaBook } from 'react-icons/fa';
import ReportContext from '../../contexts/ReportContext';
import './SideBar.css';

const Sidebar = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [doctorNotesContent, setDoctorNotesContent] = useState('');
  const [doctorNotesError, setDoctorNotesError] = useState(false);
  const [patientEducationContent, setPatientEducationContent] = useState('');
  const [patientEducationError, setPatientEducationError] = useState(false);
  const { reportContextData, reportPrompt } = useContext(ReportContext);

  useEffect(() => {
    if (reportContextData && reportPrompt) {
      fetchDoctorNotes();
      fetchPatientEducation();
    }
  }, [reportContextData, reportPrompt]);

  const fetchDoctorNotes = async () => {
    try {
      const response = await fetch('https://34.93.4.171:9070/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: reportPrompt, tag: 'doctor', context: reportContextData}),
      });
      const data = await response.json();
      if (data.response && data.response.length) {
        setDoctorNotesContent(data.response);
        setDoctorNotesError(false);
      } else {
        throw new Error('No data');
      }
    } catch (error) {
      console.error("Failed to fetch doctor notes:", error);
      setDoctorNotesError(true);
      setDoctorNotesContent('');
    }
  };

  const fetchPatientEducation = async () => {
    try {
      const response = await fetch('https://34.93.4.171:9070/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: reportPrompt, tag: 'patient', context: reportContextData}),
      });
      const data = await response.json();
      if (data.response && data.response.length) {
        setPatientEducationContent(data.response);
        setPatientEducationError(false);
      } else {
        throw new Error('No data');
      }
    } catch (error) {
      console.error("Failed to fetch patient education content:", error);
      setPatientEducationError(true);
      setPatientEducationContent('');
    }
  };

  const handleClick = index => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const sections = [
    {
      title: 'Doctor notes',
      icon: <FaNotesMedical />,
      content: doctorNotesContent,
      error: doctorNotesError
    },
    {
      title: 'Patient Education',
      icon: <FaBook />,
      content: patientEducationContent,
      error: patientEducationError
    }
  ];

  return (
    <div className="sidebar">
      {sections.map((section, index) => (
        <div key={index} className={`section ${activeIndex === index ? 'active' : ''}`}>
          <div className="section-header" onClick={() => handleClick(index)}>
            {section.icon}
            {section.title}
            <span className="section-toggle">
              {activeIndex === index ? <FaChevronUp /> : <FaChevronDown />}
            </span>
          </div>
          <div className={`section-content ${activeIndex === index ? 'show' : 'hide'}`}>
            {section.error || !section.content ? (
              <div className="section-item disabled">
                <div className="item-text">No Data</div>
              </div>
            ) : (
              <React.Fragment>
                {section.content.split('\n').map((line, lineIndex, array) => (
                  <React.Fragment key={lineIndex}>
                    {line}
                    {lineIndex !== array.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </React.Fragment>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Sidebar;
