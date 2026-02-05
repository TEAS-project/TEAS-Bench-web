import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import Team from './Team.jsx'
// import Test_Time_Scaling from './test-time-scaling.jsx'
import Documentation from './Documentation.jsx'
import DetailResults from './DetailResults.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/team" element={<Team />} />
        <Route path="/documentation" element={<Documentation />} />
        <Route path="/detail-results" element={<DetailResults />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)


//<Route path="/test-time-scaling" element={<Test_Time_Scaling />} />