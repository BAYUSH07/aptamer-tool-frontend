// App.js
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

// Backend API URL
const API_BASE = process.env.REACT_APP_API_URL;

// --- Export helpers (CSV/XLSX) ---
const XLSX_CDN = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';

const ensureXLSX = () =>
  new Promise((resolve, reject) => {
    if (window.XLSX) return resolve(window.XLSX);
    const s = document.createElement('script');
    s.src = XLSX_CDN;
    s.onload = () => resolve(window.XLSX);
    s.onerror = () => reject(new Error('Failed to load XLSX library'));
    document.body.appendChild(s);
  });

const columns = [
  { key: 'sequence', label: 'Sequence' },
  { key: 'length', label: 'Length' },
  { key: 'gc_content', label: 'GC %' },
  { key: 'structure', label: 'Structure' },
  { key: 'mfe', label: 'MFE (kcal/mol)' },
  { key: 'tm', label: 'Tm' },
  { key: 'kd', label: 'Kd (nM)' },
];

const toCSV = (rows) => {
  const head = columns.map(c => `"${c.label}"`).join(',');
  const body = rows.map(r =>
    columns.map(c => {
      const v = r[c.key] ?? '';
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(',')
  ).join('\n');
  return `${head}\n${body}`;
};

const downloadBlob = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

const downloadCSV = (data, filename = 'aptamers.csv') => {
  downloadBlob(toCSV(data), filename, 'text/csv;charset=utf-8;');
};

const downloadXLSX = async (data, filename = 'aptamers.xlsx') => {
  try {
    const XLSX = await ensureXLSX();
    const flat = data.map(r => {
      const o = {};
      columns.forEach(c => { o[c.label] = r[c.key] ?? ''; });
      return o;
    });
    const ws = XLSX.utils.json_to_sheet(flat);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Aptamers');
    XLSX.writeFile(wb, filename);
  } catch (e) {
    toast.error('XLSX export failed. Using CSV instead.');
    downloadCSV(data, filename.replace(/\.xlsx$/i, '.csv'));
  }
};

// --- Component ---
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
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      setGeneratedAptamers(data.aptamers || []);
      toast.success(`${(data.aptamers || []).length} aptamers generated ✅`);
    } catch (e) {
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
      if (!response.ok) throw new Error(await response.text());
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
      return type !== 'string'
        ? (order === 'asc' ? av - bv : bv - av)
        : (order === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av));
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

        <div className="hero">
          <img src={logo} alt="PAWS" className="hero-logo" />
          <h1 className="hero-title">PAWS Web Tool</h1>
          <div className="hero-tagline">Prediction of Aptamers Without SELEX</div>
        </div>

        <Routes>
          <Route path="/" element={
            <main>
              {/* Generate Aptamers */}
              <section className="section-card">
                <h2 className="section-title">Generate Aptamers</h2>
                <textarea
                  className="input-box centered"
                  value={fastaInput}
                  onChange={e => setFastaInput(e.target.value)}
                  placeholder="Paste FASTA sequence..."
                  rows={6}
                />
                <div className="actions-bar">
                  <button className="cta-btn" onClick={generateAptamers} disabled={loadingGenerate}>
                    {loadingGenerate ? 'Generating…' : 'Generate'}
                  </button>
                </div>

                {generatedAptamers.length > 0 && (
                  <>
                    <div className="table-scroll">
                      <table className="results-table">
                        <thead>
                          <tr>
                            {['sequence','length','gc_content','mfe','tm','kd'].map(f => (
                              <th key={f} onClick={() => onGenSortChange(f)} style={{ cursor: 'pointer' }}>
                                {f.toUpperCase()}{renderSortArrow(f, genSortKey, genSortOrder)}
                              </th>
                            ))}
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedGenerated.map((apt, i) => (
                            <tr key={i}>
                              <td className="text-left">{apt.sequence}</td>
                              <td>{apt.length}</td>
                              <td>{apt.gc_content}</td>
                              <td>{apt.mfe}</td>
                              <td>{apt.tm}</td>
                              <td>{apt.kd}</td>
                              <td>
                                <button className="ghost-btn" onClick={() => handleShowStructure(apt.sequence, apt.structure)}>
                                  View Structure
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="export-controls actions-bar">
                      <button className="ghost-btn" onClick={() => navigator.clipboard.writeText(toCSV(sortedGenerated)).then(() => toast.success('Copied CSV to clipboard!')).catch(() => toast.error('Copy failed'))}>Copy CSV</button>
                      <button className="ghost-btn" onClick={() => downloadCSV(sortedGenerated, 'generated.csv')}>Download CSV</button>
                      <button className="ghost-btn" onClick={() => downloadXLSX(sortedGenerated, 'generated.xlsx')}>Download XLSX</button>
                    </div>
                  </>
                )}
              </section>

              {/* Mutate Aptamer */}
              <section className="section-card">
                <h2 className="section-title">Mutate Aptamer</h2>
                <textarea
                  className="input-box centered"
                  value={aptamerInput}
                  onChange={e => setAptamerInput(e.target.value)}
                  placeholder="Enter aptamer sequence..."
                  rows={4}
                />
                <div className="actions-bar">
                  <button className="cta-btn" onClick={mutateAptamer} disabled={loadingMutate}>
                    {loadingMutate ? 'Mutating…' : 'Mutate'}
                  </button>
                </div>

                {mutatedAptamers.length > 0 && (
                  <>
                    <div className="table-scroll">
                      <table className="results-table">
                        <thead>
                          <tr>
                            {['sequence','length','gc_content','mfe','tm','kd'].map(f => (
                              <th key={f} onClick={() => onMutSortChange(f)} style={{ cursor: 'pointer' }}>
                                {f.toUpperCase()}{renderSortArrow(f, mutSortKey, mutSortOrder)}
                              </th>
                            ))}
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedMutated.map((apt, i) => (
                            <tr key={i}>
                              <td className="text-left">{apt.sequence}</td>
                              <td>{apt.length}</td>
                              <td>{apt.gc_content}</td>
                              <td>{apt.mfe}</td>
                              <td>{apt.tm}</td>
                              <td>{apt.kd}</td>
                              <td>
                                <button className="ghost-btn" onClick={() => handleShowStructure(apt.sequence, apt.structure)}>
                                  View Structure
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="export-controls actions-bar">
                      <button className="ghost-btn" onClick={() => navigator.clipboard.writeText(toCSV(sortedMutated)).then(() => toast.success('Copied CSV to clipboard!')).catch(() => toast.error('Copy failed'))}>Copy CSV</button>
                      <button className="ghost-btn" onClick={() => downloadCSV(sortedMutated, 'mutated.csv')}>Download CSV</button>
                      <button className="ghost-btn" onClick={() => downloadXLSX(sortedMutated, 'mutated.xlsx')}>Download XLSX</button>
                    </div>
                  </>
                )}
              </section>

              <div className="actions-bar">
                <button className="danger-btn" onClick={handleReset}>Reset All</button>
              </div>

              {/* SVG Modal */}
              {svgModalOpen && (
                <div className="modal-backdrop" onClick={() => setSvgModalOpen(false)}>
                  <div className="modal" onClick={e => e.stopPropagation()}>
                    {svgLoading ? <p>Loading...</p> : <div dangerouslySetInnerHTML={{ __html: svgContent }} />}
                    {!svgLoading && <button className="ghost-btn" onClick={downloadSvgFile}>Download SVG</button>}
                    <button className="close-x" onClick={() => setSvgModalOpen(false)}>×</button>
                  </div>
                </div>
              )}
            </main>
          } />
          <Route path="/advanced" element={<Advanced />} />
          <Route path="/about" element={<About />} />
        </Routes>
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
  <small style={{ fontSize: '0.8em', color: '#666' }}>
    If the tool does not respond immediately after clicking <b>Generate</b>, 
    please allow up to 2 minutes for the server to start, then refresh the page and try again.
  </small>
</div>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
