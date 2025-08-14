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
import logo from './PAWSLOGO.png'; // Adjust filename if needed

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
      const response = await fetch('https://aptamer-tool-backend.onrender.com/generate-aptamers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fasta_sequence: fastaInput, num_aptamers: 10 })
      });
      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }
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
      const response = await fetch('https://aptamer-tool-backend.onrender.com/mutate-aptamer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aptamer: aptamerInput, num_mutations: 10 })
      });
      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }
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

  // --- Helpers to copy and download data ---

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
    } catch (e) {
      toast.error("Failed to download file");
    }
  };

  // --- Other helpers ---

  const renderMfe = (mfe) => mfe === "N/A" ? "N/A" : `${mfe} kcal/mol`;
  const renderKd = (kd) => {
    if (!kd) return "";
    return kd === "N/A" || kd.startsWith("<") || kd.startsWith(">") ? kd : `${kd} nM`;
  };

  // Sorting functions

  // parses string with possibly < or > prefix, to numeric or NaN
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

    const sorted = [...aptamers].sort((a, b) => {
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
    return sorted;
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

  // Sorted lists
  const sortedGeneratedAptamers = sortAptamers(generatedAptamers, genSortKey, genSortOrder);
  const sortedMutatedAptamers = sortAptamers(mutatedAptamers, mutSortKey, mutSortOrder);

  // Show structure SVG modal
  const handleShowStructure = async (sequence, structure) => {
    setSvgLoading(true);
    setSvgModalOpen(true);
    try {
      const response = await fetch("https://aptamer-tool-backend.onrender.com/plot-structure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sequence, structure })
      });
      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Structure visualization failed: ${errorText}`);
        setSvgContent(`<p style="color:red; padding: 1rem">${errorText}</p>`);
        return;
      }
      const svgText = await response.text();
      setSvgContent(svgText);
    } catch (error) {
      toast.error("Error fetching structure visualization.");
      setSvgContent(`<p style="color:red; padding: 1rem">Error fetching structure visualization.</p>`);
    }
    setSvgLoading(false);
  };

  // Download SVG helper
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

  // Reset inputs and data
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
  <h1 style={{ margin: '0.4em 0 0.2em 0', fontWeight: 'bold', fontSize: '2.2em', letterSpacing: '0.01em' }}>
    PAWS Web Tool
  </h1>
  <div style={{ fontSize: '1.1em', fontWeight: 500, color: '#0c56d1', marginBottom: 9 }}>
    Prediction of Aptamers Without SELEX
  </div>
</div>

        <Routes>
          <Route path="/" element={
            <main>
              <h1 className="heading">RNA Aptamer Generator</h1>

              <div className="box">
                <h2>🧬 Generate Aptamers</h2>
                <textarea
                  value={fastaInput}
                  onChange={e => setFastaInput(e.target.value)}
                  placeholder="Paste your FASTA sequence here..."
                  className="input-box"
                />
                <button className="generate-btn" onClick={generateAptamers} disabled={loadingGenerate}>
                  {loadingGenerate ? 'Generating...' : 'Generate'}
                </button>

                {sortedGeneratedAptamers.length > 0 && (
                  <div className="result-section">
                    <h3>Generated Aptamers:</h3>

                    <div style={{ marginBottom: 10 }}>
                      <label htmlFor="gen-sort-select">Sort By: </label>
                      <select
                        id="gen-sort-select"
                        value={genSortKey || ""}
                        onChange={e => onGenSortChange(e.target.value)}
                        style={{ minWidth: 150, marginLeft: 6 }}
                      >
                        <option value="">-- None --</option>
                        <option value="length">Length</option>
                        <option value="gc_content">GC %</option>
                        <option value="mfe">MFE</option>
                        <option value="kd">Kd (nM)</option>
                        <option value="tm">Tm</option>
                        <option value="sequence">Sequence</option>
                      </select>
                      {genSortKey && (
                        <button onClick={() => onGenSortChange(genSortKey)} style={{ marginLeft: 8 }}>
                          {genSortOrder === 'asc' ? '▲' : '▼'}
                        </button>
                      )}
                    </div>

                    <div className="table-scroll">
                      <table className="results-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Sequence</th>
                            <th onClick={() => onGenSortChange('length')} style={{ cursor: 'pointer' }}>
                              Length{renderSortArrow('length', genSortKey, genSortOrder)}
                            </th>
                            <th onClick={() => onGenSortChange('gc_content')} style={{ cursor: 'pointer' }}>
                              GC %{renderSortArrow('gc_content', genSortKey, genSortOrder)}
                            </th>
                            <th style={{ minWidth: "160px" }}>Structure</th>
                            <th onClick={() => onGenSortChange('mfe')} style={{ cursor: 'pointer' }}>
                              MFE{renderSortArrow('mfe', genSortKey, genSortOrder)}
                            </th>
                            <th onClick={() => onGenSortChange('tm')} style={{ cursor: 'pointer' }}>
                              Tm{renderSortArrow('tm', genSortKey, genSortOrder)}
                            </th>
                            <th onClick={() => onGenSortChange('kd')} style={{ cursor: 'pointer' }}>
                              Kd (nM){renderSortArrow('kd', genSortKey, genSortOrder)}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedGeneratedAptamers.map((apt, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td style={{ wordBreak: "break-all" }}>{apt.sequence}</td>
                              <td>{apt.length}</td>
                              <td>{apt.gc_content}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.95em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span title={apt.structure}>{apt.structure}</span>
                                <button
                                  onClick={() => handleShowStructure(apt.sequence, apt.structure)}
                                  title="Show graphical structure"
                                  disabled={svgLoading}
                                  style={{
                                    fontSize: "1.1em",
                                    background: "#f1f8ee",
                                    border: "1.2px solid #85e7c2",
                                    borderRadius: 6,
                                    padding: "0.06em 0.38em",
                                    cursor: svgLoading ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  🧬
                                </button>
                              </td>
                              <td>{renderMfe(apt.mfe)}</td>
                              <td>{apt.tm}</td>
                              <td>{renderKd(apt.kd)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="export-controls">
                      <button onClick={() => copyToClipboard(sortedGeneratedAptamers)}>Copy</button>
                      <button onClick={() => downloadData(sortedGeneratedAptamers, 'aptamers.txt', 'text/plain')}>Download TXT</button>
                      <button onClick={() => downloadData(sortedGeneratedAptamers, 'aptamers.csv', 'text/csv')}>Download CSV</button>
                      <button onClick={() => downloadData(sortedGeneratedAptamers, 'aptamers.xls', 'application/vnd.ms-excel')}>Download XLS</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="box">
                <h2>🔁 Mutate Aptamer</h2>
                <textarea
                  value={aptamerInput}
                  onChange={e => setAptamerInput(e.target.value)}
                  placeholder="Enter an aptamer sequence to mutate"
                  className="input-box"
                />
                <button className="mutate-btn" onClick={mutateAptamer} disabled={loadingMutate}>
                  {loadingMutate ? 'Mutating...' : 'Mutate'}
                </button>

                {sortedMutatedAptamers.length > 0 && (
                  <div className="result-section">
                    <h3>Mutated Aptamers:</h3>

                    <div style={{ marginBottom: 10 }}>
                      <label htmlFor="mut-sort-select">Sort By: </label>
                      <select
                        id="mut-sort-select"
                        value={mutSortKey || ""}
                        onChange={e => onMutSortChange(e.target.value)}
                        style={{ minWidth: 150, marginLeft: 6 }}
                      >
                        <option value="">-- None --</option>
                        <option value="length">Length</option>
                        <option value="gc_content">GC %</option>
                        <option value="mfe">MFE</option>
                        <option value="kd">Kd (nM)</option>
                        <option value="tm">Tm</option>
                        <option value="sequence">Sequence</option>
                      </select>
                      {mutSortKey && (
                        <button onClick={() => onMutSortChange(mutSortKey)} style={{ marginLeft: 8 }}>
                          {mutSortOrder === 'asc' ? '▲' : '▼'}
                        </button>
                      )}
                    </div>

                    <div className="table-scroll">
                      <table className="results-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Sequence</th>
                            <th onClick={() => onMutSortChange('length')} style={{ cursor: 'pointer' }}>
                              Length{renderSortArrow('length', mutSortKey, mutSortOrder)}
                            </th>
                            <th onClick={() => onMutSortChange('gc_content')} style={{ cursor: 'pointer' }}>
                              GC %{renderSortArrow('gc_content', mutSortKey, mutSortOrder)}
                            </th>
                            <th style={{ minWidth: "160px" }}>Structure</th>
                            <th onClick={() => onMutSortChange('mfe')} style={{ cursor: 'pointer' }}>
                              MFE{renderSortArrow('mfe', mutSortKey, mutSortOrder)}
                            </th>
                            <th onClick={() => onMutSortChange('tm')} style={{ cursor: 'pointer' }}>
                              Tm{renderSortArrow('tm', mutSortKey, mutSortOrder)}
                            </th>
                            <th onClick={() => onMutSortChange('kd')} style={{ cursor: 'pointer' }}>
                              Kd (nM){renderSortArrow('kd', mutSortKey, mutSortOrder)}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedMutatedAptamers.map((apt, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td style={{ wordBreak: "break-all" }}>{apt.sequence}</td>
                              <td>{apt.length}</td>
                              <td>{apt.gc_content}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.95em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span title={apt.structure}>{apt.structure}</span>
                                <button
                                  onClick={() => handleShowStructure(apt.sequence, apt.structure)}
                                  title="Show graphical structure"
                                  disabled={svgLoading}
                                  style={{
                                    fontSize: "1.1em",
                                    background: "#f1f8ee",
                                    border: "1.2px solid #85e7c2",
                                    borderRadius: 6,
                                    padding: "0.06em 0.38em",
                                    cursor: svgLoading ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  🧬
                                </button>
                              </td>
                              <td>{renderMfe(apt.mfe)}</td>
                              <td>{apt.tm}</td>
                              <td>{renderKd(apt.kd)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="export-controls">
                      <button onClick={() => copyToClipboard(sortedMutatedAptamers)}>Copy</button>
                      <button onClick={() => downloadData(sortedMutatedAptamers, 'mutated_aptamers.txt', 'text/plain')}>Download TXT</button>
                      <button onClick={() => downloadData(sortedMutatedAptamers, 'mutated_aptamers.csv', 'text/csv')}>Download CSV</button>
                      <button onClick={() => downloadData(sortedMutatedAptamers, 'mutated_aptamers.xls', 'application/vnd.ms-excel')}>Download XLS</button>
                    </div>
                  </div>
                )}
              </div>

              <button className="reset-btn" onClick={handleReset} style={{ marginTop: 30 }}>🔄 Reset</button>

              {/* SVG Modal */}
              {svgModalOpen && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="RNA secondary structure visualization modal"
                  tabIndex={-1}
                  onClick={() => setSvgModalOpen(false)}
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "rgba(0,0,0,0.4)",
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 20,
                    boxSizing: "border-box",
                    overflowY: "auto",
                    cursor: "pointer",
                  }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      background: darkMode ? "#224" : "#fff",
                      borderRadius: 12,
                      maxWidth: "90vw",
                      maxHeight: "90vh",
                      padding: 20,
                      boxShadow: "0 10px 28px rgba(0,0,0,0.3)",
                      overflow: "auto",
                      cursor: "default",
                      position: "relative",
                    }}
                  >
                    <button
                      onClick={() => setSvgModalOpen(false)}
                      aria-label="Close modal"
                      style={{
                        float: "right",
                        fontSize: 24,
                        fontWeight: "bold",
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        color: darkMode ? "#faa" : "#a00",
                        marginBottom: 10,
                      }}
                    >
                      ×
                    </button>
                    <button
                      onClick={() => downloadSvgFile(svgContent)}
                      title="Download SVG"
                      style={{
                        marginBottom: 10,
                        background: "#14bbad",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "0.3em 1em",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "1em",
                        float: "left",
                        marginRight: 14,
                      }}
                    >
                      ⬇️ Download SVG
                    </button>
                    <div
                      style={{ width: "100%", height: "auto", maxHeight: "80vh", clear: "both" }}
                      dangerouslySetInnerHTML={{ __html: svgContent }}
                    />
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
