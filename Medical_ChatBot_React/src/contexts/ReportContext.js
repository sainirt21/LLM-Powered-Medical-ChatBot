import { createContext } from 'react';

const ReportContext = createContext({
  reportContextData: '',
  reportPrompt: '',
  setReportContextData: () => {},
  setReportPrompt: () => {}
});

export default ReportContext;
