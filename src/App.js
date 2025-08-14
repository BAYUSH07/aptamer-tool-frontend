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

// ✅ Backend API URL from Netlify Env Variable
const API_BASE = process.env.REACT_APP_API_URL;

function App() {
  // Inputs
  const [fastaInput, setFastaInput] = useState('');
  const [aptamerInput, setAptamerInput] = useState('');

  // Data
  const [generatedAptamers, setGeneratedAptamers] = useState([]);
  const [mutatedAptamers, setMutatedAptamers] = useState([]);

  // Loading
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingMutate, setLoadingMutate] = useState(false);

  // Dark Mode
  const [darkMode, setDarkMode] = useState(false);

  // Sorting
  const [genSortKey, setGenSortKey] = useState(null);
  const [genSortOrder, setGenSortOrder] = useState('asc');
  const [mutSortKey, setMutSortKey] = useState(null);
  const [mutSortOrder, setMutSortOrder] = useState('asc');

  // SVG Modal
  const [svgModalOpen, setSvgModalOpen] = useState(false);
  const [svgContent, setSvgContent] = useState('');
  const [svgLoading, setSvgLoading] = useState(false);

  // --- API Calls ---
  const generateAptamers = async () => {
    if (!fastaInput.trim()) return toast.error('Please enter a FASTA sequence.');
    setLoadingGenerate(true);
    try {
      const response = await fetch(`${API_BASE}/generate-aptamers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fasta_sequence: fastaInput, num_aptamers: 10 }),
      });
      if (!response.ok) throw new Error(response.statusText);
      const data = await response.json();
      setGeneratedAptamers(data.aptamers || []);
      toast.success(`${(data.aptamers || []).length} aptamers generated ✅`);
    } catch {
      toast.error('❌ Failed to generate aptamers');
    } finally {
      setLoadingGenerate(false);
    }
  };

  const mutateAptamer = async () => {
    if (!aptamerInput.trim()) return toast.error('Please enter an aptamer sequence to mutate.');
    setLoadingMutate(true);
    try {
      const response = await fetch(`${API_BASE}/mutate-aptamer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aptamer: aptamerInput, num_mutations: 10 }),
      });
      if (!response.ok) throw new Error(response.statusText);
      const data = await response.json();
      setMutatedAptamers(data.mutations || []);
      toast.success(`${(data.mutations || []).length} mutations created ✅`);
    } catch {
      toast.error('❌ Failed to mutate aptamer');
    } finally {
      setLoadingMutate(false);
    }
  };

  // --- Helpers ---
  const formatForExcel = (data) => {
    let rows = ['#\tSequence\tLength\tGC %\tStructure\tMFE\tTm\tKd (nM)'];
    data.forEach((apt, idx) => {
      rows.push(
        `${idx + 1}\t${apt.sequence}\t${apt.length}\t${apt.gc_content}\t${apt.structure || ''}\t${apt.mfe || ''}\t${apt.tm || ''}\t${apt.kd || ''}`
      );
    });
    return rows.join('\n');
  };

  const copyToClipboard = (data) => {
    navigator.clipboard.writeText(formatForExcel(data))
      .then(() => toast.success('Copied to clipboard!'))
      .catch(() => toast.error('Failed to copy to clipboard.'));
  };

  const downloadData = (data, filename) => {
    const blob = new Blob([formatForExcel(data)], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const parseSortableValue = (value, type) => {
    if (value == null || value === 'N/A') return NaN;
    if (['mfe', 'kd'].includes(type)) {
      const str = String(value);
      if (str.startsWith('<')) return parseFloat(str.slice(1)) || 0;
      if (str.startsWith('>')) return parseFloat(str.slice(1)) || 1e9;
      return parseFloat(str);
    }
    if (['gc_content', 'tm', 'length'].includes(type)) return Number(value);
    return String(value).toLowerCase();
  };

  const sortAptamers = (data, key, order) => {
    if (!key) return data;
    const typeMap = { gc_content: 'gc_content', length: 'length', mfe: 'mfe', kd: 'kd', tm: 'tm', sequence: 'string' };
    const type = typeMap[key] || 'string';
    return [...data].sort((a, b) => {
      const av = parseSortableValue(a[key], type);
      const bv = parseSortableValue(b[key], type);
      if (isNaN(av) && !isNaN(bv)) return 1;
      if (!isNaN(av) && isNaN(bv)) return -1;
      if (isNaN(av) && isNaN(bv)) return 0;
      return type !== 'string' ? (order === 'asc' ? av - bv : bv - av) : (order === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av));
    });
  };

  const onGenSortChange = (field) => {
    if (genSortKey === field) setGenSortOrder(genSortOrder === 'asc' ? 'desc' : 'asc');
    else { setGenSortKey(field); setGenSortOrder('asc'); }
  };

  const onMutSortChange = (field) => {
    if (mutSortKey === field) setMutSortOrder(mutSortOrder === 'asc' ? 'desc' : 'asc');
    else { setMutSortKey(field); setMutSortOrder('asc'); }
  };

  const renderSortArrow = (key, active, order) => key === active ? (order === 'asc' ? ' ▲' : ' ▼') : null;

  const sortedGenerated = sortAptamers(generatedAptamers, genSortKey, genSortOrder);
  const sortedMutated = sortAptamers(mutatedAptamers, mutSortKey, mutSortOrder);

  const handleShowStructure = async (sequence, structure) => {
    setSvgLoading(true); setSvgModalOpen(true);
    try {
      const res = await fetch(`${API_BASE}/plot-structure`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence, structure })
      });
      if (!res.ok) {
        const txt = await res.text();
        toast.error('Structure visualization failed');
        setSvgContent(`<p style="color:red">${txt}</p>`);
        return;
      }
      setSvgContent(await res.text());
    } catch {
      toast.error('Error fetching structure visualization.');
    } finally {
      setSvgLoading(false);
    }
  };

  const downloadSvgFile = () => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'rna_structure.svg';
    link.click();
  };

  // ✅ Reset Function — NOW USED in UI
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset everything?')) {
      setFastaInput('');
      setAptamerInput('');
      setGeneratedAptamers([]);
      setMutatedAptamers([]);
      setSvgModalOpen(false);
      setSvgContent('');
      setGenSortKey(null); setGenSortOrder('asc');
      setMutSortKey(null); setMutSortOrder('asc');
      toast.info('Reset successful.');
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
          <img src={logo} alt="PAWS" style={{ width: 80, borderRadius: '50%' }} />
          <h1>PAWS Web Tool</h1>
          <div style={{ fontSize: '1.1em', color: '#0c56d1' }}>Prediction of Aptamers Without SELEX</div>
        </div>

        <Routes>
          <Route path="/" element={
            <main style={{ padding: 20 }}>
              {/* Generate Aptamers */}
              <h2>Generate Aptamers</h2>
              <textarea value={fastaInput} onChange={e => setFastaInput(e.target.value)}
                placeholder="Enter FASTA sequence..." rows={4} style={{ width: '80%' }} />
              <br />
              <button onClick={generateAptamers} disabled={loadingGenerate}>
                {loadingGenerate ? 'Generating...' : 'Generate'}
              </button>

              {/* Generated list */}
              {generatedAptamers.length > 0 && (
                <>
                  <h3>Generated Aptamers</h3>
                  <table><thead><tr>
                    {['sequence','length','gc_content','mfe','tm','kd'].map(f => (
                      <th key={f} onClick={() => onGenSortChange(f)} style={{ cursor: 'pointer' }}>
                        {f.toUpperCase()}{renderSortArrow(f, genSortKey, genSortOrder)}
                      </th>
                    ))}
                    <th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {sortedGenerated.map((apt, i) => (
                      <tr key={i}>
                        <td>{apt.sequence}</td><td>{apt.length}</td><td>{apt.gc_content}</td>
                        <td>{apt.mfe}</td><td>{apt.tm}</td><td>{apt.kd}</td>
                        <td><button onClick={() => handleShowStructure(apt.sequence, apt.structure)}>View Structure</button></td>
                      </tr>
                    ))}
                  </tbody></table>
                  <button onClick={() => copyToClipboard(sortedGenerated)}>Copy to Clipboard</button>
                  <button onClick={() => downloadData(sortedGenerated, 'generated.txt')}>Download TXT</button>
                </>
              )}

              {/* Mutate Aptamer */}
              <h2 style={{ marginTop: 30 }}>Mutate Aptamer</h2>
              <textarea value={aptamerInput} onChange={e => setAptamerInput(e.target.value)}
                placeholder="Enter aptamer..." rows={2} style={{ width: '80%' }} />
              <br />
              <button onClick={mutateAptamer} disabled={loadingMutate}>
                {loadingMutate ? 'Mutating...' : 'Mutate'}
              </button>

              {mutatedAptamers.length > 0 && (
                <>
                  <h3>Mutated Aptamers</h3>
                  <table><thead><tr>
                    {['sequence','length','gc_content','mfe','tm','kd'].map(f => (
                      <th key={f} onClick={() => onMutSortChange(f)} style={{ cursor: 'pointer' }}>
                        {f.toUpperCase()}{renderSortArrow(f, mutSortKey, mutSortOrder)}
                      </th>
                    ))}
                    <th>Actions</th>
                  </tr></thead>
                  <tbody>
                    {sortedMutated.map((apt, i) => (
                      <tr key={i}>
                        <td>{apt.sequence}</td><td>{apt.length}</td><td>{apt.gc_content}</td>
                        <td>{apt.mfe}</td><td>{apt.tm}</td><td>{apt.kd}</td>
                        <td><button onClick={() => handleShowStructure(apt.sequence, apt.structure)}>View Structure</button></td>
                      </tr>
                    ))}
                  </tbody></table>
                  <button onClick={() => copyToClipboard(sortedMutated)}>Copy to Clipboard</button>
                  <button onClick={() => downloadData(sortedMutated, 'mutated.txt')}>Download TXT</button>
                </>
              )}

              {/* ✅ Added Reset Button */}
              <div style={{ marginTop: 20 }}>
                <button onClick={handleReset} style={{ backgroundColor: 'red', color: 'white' }}>Reset All</button>
              </div>

              {/* SVG Modal */}
              {svgModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px', position: 'relative' }}>
                    {svgLoading ? <p>Loading...</p> : <div dangerouslySetInnerHTML={{ __html: svgContent }} />}
                    {!svgLoading && <button onClick={downloadSvgFile}>Download SVG</button>}
                    <button onClick={() => setSvgModalOpen(false)} style={{ position: 'absolute', top: '8px', right: '8px' }}>Close</button>
                  </div>
                </div>
              )}

            </main>
          } />
          <Route path="/advanced" element={<Advanced />} />
          <Route path="/about" element={<About />} />
        </Routes>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
