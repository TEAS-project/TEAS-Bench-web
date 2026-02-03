import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Team() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Navigation Bar */}
      <nav className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
              TEAS
            </Link>
            <span className="text-xs text-slate-400 hidden sm:inline">Tracking Evolving AI and Systems</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/" className="text-slate-300 hover:text-blue-400 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 py-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-8 pb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400" style={{ lineHeight: '1.2' }}>
            Our Team
          </h1>
        </div>
      </div>

      {/* Team Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Investigators */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
            <h2 className="text-xl font-bold text-blue-400 mb-6 pl-2 border-l-4 border-blue-500">Investigators</h2>
            <ul className="space-y-4">
            <li className="flex flex-col">
                <span className="font-semibold text-slate-100 text-lg">Edoardo Ponti</span>
                <span className="text-slate-400">University of Edinburgh</span>
              </li>
              <li className="flex flex-col">
                <span className="font-semibold text-slate-100 text-lg">Nick Brown</span>
                <span className="text-slate-400">EPCC - University of Edinburgh</span>
              </li>
              <li className="flex flex-col">
                <span className="font-semibold text-slate-100 text-lg">Adrian Jackson</span>
                <span className="text-slate-400">EPCC - University of Edinburgh</span>
              </li>
              <li className="flex flex-col">
                <span className="font-semibold text-slate-100 text-lg">Boris Grot</span>
                <span className="text-slate-400">University of Edinburgh</span>
              </li>
              <li className="flex flex-col">
                <span className="font-semibold text-slate-100 text-lg">Wenda Li</span>
                <span className="text-slate-400">University of Edinburgh</span>
              </li>
              <li className="flex flex-col">
                <span className="font-semibold text-slate-100 text-lg">Luo Mai</span>
                <span className="text-slate-400">University of Edinburgh</span>
              </li>
              <li className="flex flex-col">
                <span className="font-semibold text-slate-100 text-lg">Aaron Zhao</span>
                <span className="text-slate-400">Imperial College London</span>
              </li>
            </ul>
          </div>

          {/* Project Team */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
            <h2 className="text-xl font-bold text-purple-400 mb-6 pl-2 border-l-4 border-purple-500">Project Team</h2>
            <ul className="space-y-4">
              <li className="flex flex-col">
                <span className="font-semibold text-slate-100 text-lg">Arno Proeme</span>
                <span className="text-slate-400">EPCC - University of Edinburgh</span>
              </li>
              <li className="flex flex-col">
                <span className="font-semibold text-slate-100 text-lg">James Richings</span>
                <span className="text-slate-400">EPCC - University of Edinburgh</span>
              </li>
              <li className="flex flex-col">
                <span className="font-semibold text-slate-100 text-lg">Mark Klaisoongnoen</span>
                <span className="text-slate-400">EPCC - University of Edinburgh</span>
              </li>
              <li className="flex flex-col">
                <span className="font-semibold text-slate-100 text-lg">Yinsicheng Jiang</span>
                <span className="text-slate-400">University of Edinburgh</span>
              </li>
              <li className="flex flex-col">
                <span className="font-semibold text-slate-100 text-lg">Yufan Zhao</span>
                <span className="text-slate-400">University of Edinburgh</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Institutions */}
        <div className="mt-12 bg-slate-800/30 border border-slate-700 rounded-lg p-8 text-center">
          <h3 className="text-lg font-semibold text-slate-300 mb-4">Partner Institutions</h3>
          <div className="flex flex-wrap justify-center gap-8 text-slate-400">
            <a href="https://www.ed.ac.uk/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">University of Edinburgh</a>
            <a href="https://www.epcc.ed.ac.uk/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">EPCC</a>
            <a href="https://www.imperial.ac.uk/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">Imperial College London</a>
          </div>
        </div>
      </div>
    </div>
  );
}
