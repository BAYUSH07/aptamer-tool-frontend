import React, { useState } from 'react';
import './index.css';
import './App.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ParticlesBg from './ParticlesBg';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import About from './About';
import Footer from './Footer';
import Advanced from './Advanced';
import logo from './PAWSLOGO.png';

// ✅ Use Netlify Environment Variable
const API_BASE = process.env.REACT_APP_API_URL;

function App() {
  // Input states
  const [fastaInput, setFastaInput] = useState('');
  const [aptamerInput, setAptamerInput] = useState('');

  // Aptamers data and loading
  const [generatedAptamers, setGeneratedAptamers] = useState([]);
  const [mutatedAptamers, setMutatedAptamers] = useState([]);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingMutate, setLoadingMutate] = useState(false);

  // Dark mode toggle
  const [darkMode, setDarkMode] = useState(false);

  // Sorting state for generated aptamers
  const [genSortKey, setGenSortKey] = useState(null);
  const [genSortOrder, setGenSortOrder] = useState('asc');

  // Sorting state for mutated aptamers
  const [mutSortKey, setMutSortKey] = useState(null);
  const [mutSortOrder, setMutSortOrder] = useState('asc');

  // SVG modal states
  const [svgModalOpen, setSvgModalOpen] = useState(false);
  const [svgContent, setSvgContent] = useState('');
  const [svgLoading, setSvgLoading] = useState(false);

  // --- API Calls ---
  const generateAptamers = async () => {
    if (!fastaInput.trim()) {
      toast.error("Please enter a FASTA sequence.");
      return;
    }
    setLoadingGenerate(true);
    try {
      const response = await fetch(`${API_BASE}/generate-aptamers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fasta_sequence: fastaInput, num_aptamers: 10 })
      });
      if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
      const data = await response.json();
      setGeneratedAptamers(data.aptamers || []);
      toast.success(`${data.aptamers.length} aptamers generated ✅`);
    } catch (error) {
      console.error('Error generating aptamers:', error);
      toast.error('❌ Failed to generate aptamers');
    } finally {
      setLoadingGenerate(false);
    }
  };

  const mutateAptamer = async () => {
    if (!aptamerInput.trim()) {
      toast.error("Please enter an aptamer sequence to mutate.");
      return;
    }
    setLoadingMutate(true);
    try {
      const response = await fetch(`${API_BASE}/mutate-aptamer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aptamer: aptamerInput, num_mutations: 10 })
      });
      if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
      const data = await response.json();
      setMutatedAptamers(data.mutations || []);
      toast.success(`${data.mutations.length} mutations created ✅`);
    } catch (error) {
      console.error('Error mutating aptamer:', error);
      toast.error('❌ Failed to mutate aptamer');
    } finally {
      setLoadingMutate(false);
    }
  };

  // --- Helpers ---
  const formatForExcel = (data) => {
    let rows = ['#\tSequence\tLength\tGC %\tStructure\tMFE (kcal/mol)\tTm\tKd (nM)'];
    data.forEach((apt, idx) => {
      rows.push(
        `${idx + 1}\t${apt.sequence}\t${apt.length}\t${apt.gc_content}\t${apt.structure || ''}\t${apt.mfe || ''}\t${apt.tm || ''}\t${apt.kd || ''}`
      );
    });
    return rows.join('\n');
  };

  const copyToClipboard = (data) => {
    const text = formatForExcel(data);
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Copied to clipboard!'))
      .catch(() => toast.error('Failed to copy to clipboard.'));
  };

  const downloadData = (data, filename, type) => {
    try {
      const blob = new Blob([formatForExcel(data)], { type });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    } catch {
      toast.error("Failed to download file");
    }
  };

  const renderMfe = (mfe) => mfe === "N/A" ? "N/A" : `${mfe} kcal/mol`;
  const renderKd = (kd) => {
    if (!kd) return "";
    return kd === "N/A" || kd.startsWith("<") || kd.startsWith(">") ? kd : `${kd} nM`;
  };

  const parseSortableValue = (value, type) => {
    if (value === null || value === undefined || value === 'N/A') return NaN;
    if (type === 'mfe' || type === 'kd') {
      const str = String(value);
      if (str.startsWith('<')) return parseFloat(str.substring(1)) || 0;
      if (str.startsWith('>')) return parseFloat(str.substring(1)) || 1e9;
      return parseFloat(str);
    }
    if (type === 'gc_content' || type === 'tm' || type === 'length') {
      return Number(value);
    }
    return String(value).toLowerCase();
  };

  const sortAptamers = (aptamers, key, order = 'asc') => {
    if (!key) return aptamers;
    const typeMap = {
      gc_content: 'gc_content',
      length: 'length',
      mfe: 'mfe',
      kd: 'kd',
      tm: 'tm',
      sequence: 'string',
    };
    const type = typeMap[key] || 'string';
    return [...aptamers].sort((a, b) => {
      const aVal = parseSortableValue(a[key], type);
      const bVal = parseSortableValue(b[key], type);
      if (isNaN(aVal) && !isNaN(bVal)) return 1;
      if (!isNaN(aVal) && isNaN(bVal)) return -1;
      if (isNaN(aVal) && isNaN(bVal)) return 0;
      if (type !== 'string') {
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const onGenSortChange = (field) => {
    if (genSortKey === field) {
      setGenSortOrder(genSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setGenSortKey(field);
      setGenSortOrder('asc');
    }
  };

  const onMutSortChange = (field) => {
    if (mutSortKey === field) {
      setMutSortOrder(mutSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setMutSortKey(field);
      setMutSortOrder('asc');
    }
  };

  const renderSortArrow = (key, activeKey, order) => {
    if (key !== activeKey) return null;
    return order === 'asc' ? ' ▲' : ' ▼';
  };

  const sortedGeneratedAptamers = sortAptamers(generatedAptamers, genSortKey, genSortOrder);
  const sortedMutatedAptamers = sortAptamers(mutatedAptamers, mutSortKey, mutSortOrder);

  const handleShowStructure = async (sequence, structure) => {
    setSvgLoading(true);
    setSvgModalOpen(true);
    try {
      const response = await fetch(`${API_BASE}/plot-structure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequence, structure })
      });
      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Structure visualization failed: ${errorText}`);
        setSvgContent(`<p style="color:red; padding: 1rem">${errorText}</p>`);
        return;
      }
      setSvgContent(await response.text());
    } catch {
      toast.error("Error fetching structure visualization.");
      setSvgContent(`<p style="color:red; padding: 1rem">Error fetching structure visualization.</p>`);
    }
    setSvgLoading(false);
  };

  const downloadSvgFile = (svgContent, filename = "rna_structure.svg") => {
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 100);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset everything?")) {
      setFastaInput('');
      setAptamerInput('');
      setGeneratedAptamers([]);
      setMutatedAptamers([]);
      toast.info("Reset successful.");
      setSvgModalOpen(false);
      setSvgContent('');
      setGenSortKey(null);
      setGenSortOrder('asc');
      setMutSortKey(null);
      setMutSortOrder('asc');
    }
  };

  return (
    <Router>
      <div className={darkMode ? 'app dark-mode' : 'app'}>
        <ParticlesBg />
        <ToastContainer />
        <button className="dark-toggle" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
        <nav>
          <Link to="/">🏠 Home</Link>
          <Link to="/advanced">⚡ Advanced Mode</Link>
          <Link to="/about">ℹ️ About</Link>
        </nav>
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <img src={logo} alt="PAWS Web Tool Logo" style={{ width: 80, height: 80, borderRadius: '50%', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }} />
          <h1 style={{ margin: '0.4em 0 0.2em 0', fontWeight: 'bold', fontSize: '2.2em' }}>
            PAWS Web Tool
          </h1>
          <div style={{ fontSize: '1.1em', fontWeight: 500, color: '#0c56d1', marginBottom: 9 }}>
            Prediction of Aptamers Without SELEX
          </div>
        </div>

        <Routes>
          <Route path="/" element={<main>{/* Main UI here */}</main>} />
          <Route path="/advanced" element={<Advanced />} />
          <Route path="/about" element={<About />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
