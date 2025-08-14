// Advanced.js

import React, { useState } from 'react';
import './App.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import logo from './PAWSLOGOWEB.svg';

// Read the live backend URL from the environment variable set in Netlify
const API_BASE_URL = process.env.REACT_APP_API_URL;

function Advanced() {
  // Mode: 'generate' or 'mutate'
  const [mode, setMode] = useState('generate');

  // Common state for generate mode
  const [fastaInput, setFastaInput] = useState('');
  const [gcMin, setGcMin] = useState('');
  const [gcMax, setGcMax] = useState('');
  const [lengthMin, setLengthMin] = useState('');
  const [lengthMax, setLengthMax] = useState('');
  const [tmMin, setTmMin] = useState('');
  const [tmMax, setTmMax] = useState('');

  // Mutation mode state
  const [aptamerInput, setAptamerInput] = useState('');
  const [numMutations, setNumMutations] = useState(10);

  // Results and loading
  const [aptamers, setAptamers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  // Modal states (for both modes)
  const [svgModalOpen, setSvgModalOpen] = useState(false);
  const [svgContent, setSvgContent] = useState('');
  const [svgLoading, setSvgLoading] = useState(false);

  // Helper functions: Rendering MFE, KD, sorting, etc.
  const renderMfe = (mfe) => mfe === "N/A" ? "N/A" : `${mfe} kcal/mol`;
  const renderKd = (kd) => {
    if (!kd) return "";
    return kd === "N/A" || kd.startsWith("<") || kd.startsWith(">") ? kd : `${kd} nM`;
  };

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
      URL.revokeObjectURL(link.href);
    } catch (error) {
      toast.error("Failed to download file");
    }
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

  const onSortChange = (field) => {
    if (sortKey === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(field);
      setSortOrder('asc');
    }
  };

  const renderSortArrow = (key, activeKey, order) => {
    if (key !== activeKey) return null;
    return order === 'asc' ? ' ▲' : ' ▼';
  };

  // Structure SVG modal handler
  const handleShowStructure = async (sequence, structure) => {
    setSvgLoading(true);
    setSvgModalOpen(true);
    try {
      const response = await fetch(`${API_BASE_URL}/plot-structure`, {
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
    } finally {
      setSvgLoading(false);
    }
  };

  // Generate mode handler
  const handleGenerate = async () => {
    if (!fastaInput.trim()) {
      toast.error("Please enter a FASTA sequence.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/generate-aptamers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fasta_sequence: fastaInput,
          num_aptamers: 10,
          min_gc: gcMin ? Number(gcMin) : undefined,
          max_gc: gcMax ? Number(gcMax) : undefined,
          min_length: lengthMin ? Number(lengthMin) : undefined,
          max_length: lengthMax ? Number(lengthMax) : undefined,
          min_tm: tmMin ? Number(tmMin) : undefined,
          max_tm: tmMax ? Number(tmMax) : undefined
        })
      });
      if (!response.ok) {
        const msg = await response.text();
        toast.error(msg || "Failed to generate aptamers.");
        setAptamers([]);
        setLoading(false);
        return;
      }
      const data = await response.json();
      setAptamers(data.aptamers || []);
      toast.success(`${(data.aptamers || []).length} aptamers generated ✅`);
      setSortKey(null);
      setSortOrder('asc');
    } catch (error) {
      toast.error(error.message || 'Failed to generate aptamers');
      setAptamers([]);
    } finally {
      setLoading(false);
    }
  };

  // Point mutation mode handler
  const handlePointMutate = async () => {
    if (!aptamerInput.trim()) {
      toast.error("Please enter an aptamer sequence.");
      return;
    }
    if (numMutations <= 0) {
      toast.error("Number of mutations must be positive.");
      return;
    }
    if (aptamerInput.length < 20 || aptamerInput.length > 80) {
      toast.error("Aptamer length must be between 20 and 80 nucleotides.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/point-mutate-aptamer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aptamer: aptamerInput,
          num_point_mutations: numMutations,
        })
      });
      if (!response.ok) {
        const msg = await response.text();
        toast.error(msg || "Failed to generate point mutations.");
        setAptamers([]);
        setLoading(false);
        return;
      }
      const data = await response.json();
      setAptamers(data.mutations || []);
      toast.success(`${(data.mutations || []).length} point mutations generated ✅`);
      setSortKey(null);
      setSortOrder('asc');
    } catch (error) {
      toast.error(error.message || 'Failed to generate point mutations');
      setAptamers([]);
    } finally {
      setLoading(false);
    }
  };

  const sortedAptamers = sortAptamers(aptamers, sortKey, sortOrder);

  return (
    <main>
    <div style={{ textAlign: 'center', marginTop: 18 }}>
  <img
    src={logo}
    alt="PAWS Web Tool Logo"
    style={{
      width: 80,
      height: 80,
      borderRadius: '50%',
      boxShadow: '0 2px 12px rgba(0,0,0,0.1)'
    }}
  />
  <h1 style={{
    margin: '0.4em 0 0.2em 0',
    fontWeight: 'bold',
    fontSize: '2.2em',
    letterSpacing: '0.01em'
  }}>
    PAWS Web Tool
  </h1>
  <div style={{
    fontSize: '1.1em',
    fontWeight: 500,
    color: '#0c56d1',
    marginBottom: 9
  }}>
    Prediction of Aptamers Without SELEX
  </div>
</div>

      <ToastContainer />
      <h1 className="heading">RNA Aptamer Generator (Advanced Mode)</h1>

      {/* Mode Selector */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => {setMode('generate'); setAptamers([]);}} 
          style={{ marginRight: 10, padding: '6px 12px', fontWeight: mode === 'generate' ? 'bold' : 'normal' }}>
          Generate Aptamers
        </button>
        <button onClick={() => {setMode('mutate'); setAptamers([]);}} 
          style={{ padding: '6px 12px', fontWeight: mode === 'mutate' ? 'bold' : 'normal' }}>
          Point Mutation
        </button>
      </div>

      {mode === 'generate' && (
        <div className="box">
          <h2>🛠️ Advanced Generate Aptamers</h2>
          <textarea
            value={fastaInput}
            onChange={e => setFastaInput(e.target.value)}
            placeholder="Paste your FASTA sequence here..."
            className="input-box"
          />
          <div style={{ margin: '1em 0', display: 'flex', flexWrap: 'wrap', gap: '1.2em', alignItems: 'flex-end' }}>
            <div>
              <label>Min GC %<br />
                <input type="number" min="0" max="100" value={gcMin} onChange={e => setGcMin(e.target.value)} style={{ width: 70 }} />
              </label>
            </div>
            <div>
              <label>Max GC %<br />
                <input type="number" min="0" max="100" value={gcMax} onChange={e => setGcMax(e.target.value)} style={{ width: 70 }} />
              </label>
            </div>
            <div>
              <label>Min Length<br />
                <input type="number" min="1" value={lengthMin} onChange={e => setLengthMin(e.target.value)} style={{ width: 70 }} />
              </label>
            </div>
            <div>
              <label>Max Length<br />
                <input type="number" min="1" value={lengthMax} onChange={e => setLengthMax(e.target.value)} style={{ width: 70 }} />
              </label>
            </div>
            <div>
              <label>Min Tm<br />
                <input type="number" value={tmMin} onChange={e => setTmMin(e.target.value)} style={{ width: 70 }} />
              </label>
            </div>
            <div>
              <label>Max Tm<br />
                <input type="number" value={tmMax} onChange={e => setTmMax(e.target.value)} style={{ width: 70 }} />
              </label>
            </div>
          </div>
          <button className="generate-btn" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </div>
      )}

{mode === 'mutate' && (
  <>
    <div className="point-mutation-note" style={{
      background: '#fff8e1',
      color: '#9f6c00',
      fontSize: '1.05em',
      padding: '0.8em 1em',
      borderRadius: '0.6em',
      border: '1.5px solid #ffc107',
      marginBottom: 16,
      marginTop: 8,
      maxWidth: 600
    }}>
      <b>Note:</b> Point mutation is random and may not always yield a valid mutated aptamer in one try.<br/>
      Please try running the mutation at least 2–3 times, or modify your point mutation input parameters (such as the sequence or number of mutations) if you do not see results.
    </div>
    <div className="box">
      <h2>🧬 Point Mutate Aptamer</h2>
      <textarea
        value={aptamerInput}
        onChange={e => setAptamerInput(e.target.value)}
        placeholder="Enter an aptamer sequence (20-80 nts)"
        className="input-box"
      />
      <div style={{ marginTop: 10 }}>
        <label>
          Number of point mutations:&nbsp;
          <input
            type="number"
            min="1"
            max="100"
            value={numMutations}
            onChange={e => setNumMutations(Number(e.target.value))}
            style={{ width: 70 }}
          />
        </label>
      </div>
      <button className="generate-btn" onClick={handlePointMutate} disabled={loading} style={{ marginTop: 10 }}>
        {loading ? 'Mutating…' : 'Mutate'}
      </button>
    </div>
  </>
)}


      {aptamers.length > 0 && (
        <div className="result-section" style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 10 }}>
            <label>Sort By: </label>
            <select
              value={sortKey || ""}
              onChange={e => onSortChange(e.target.value)}
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
            {sortKey && (
              <button onClick={() => onSortChange(sortKey)} style={{ marginLeft: 8 }}>
                {sortOrder === 'asc' ? '▲' : '▼'}
              </button>
            )}
          </div>
          <div className="table-scroll">
            <table className="results-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Sequence</th>
                  <th onClick={() => onSortChange('length')} style={{ cursor: 'pointer' }}>
                    Length{renderSortArrow('length', sortKey, sortOrder)}
                  </th>
                  <th onClick={() => onSortChange('gc_content')} style={{ cursor: 'pointer' }}>
                    GC %{renderSortArrow('gc_content', sortKey, sortOrder)}
                  </th>
                  <th style={{ minWidth: "160px" }}>Structure</th>
                  <th onClick={() => onSortChange('mfe')} style={{ cursor: 'pointer' }}>
                    MFE{renderSortArrow('mfe', sortKey, sortOrder)}
                  </th>
                  <th onClick={() => onSortChange('tm')} style={{ cursor: 'pointer' }}>
                    Tm{renderSortArrow('tm', sortKey, sortOrder)}
                  </th>
                  <th onClick={() => onSortChange('kd')} style={{ cursor: 'pointer' }}>
                    Kd (nM){renderSortArrow('kd', sortKey, sortOrder)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAptamers.map((apt, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td style={{ wordBreak: "break-all" }}>{apt.sequence}</td>
                    <td>{apt.length}</td>
                    <td>{apt.gc_content}</td>
                    <td
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.95em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span title={apt.structure}>{apt.structure}</span>
                      <button
                        onClick={() => handleShowStructure(apt.sequence, apt.structure)}
                        title="Show graphical structure"
                        disabled={svgLoading}
                        style={{
                          fontSize: '1.1em',
                          background: '#f1f8ee',
                          border: '1.2px solid #85e7c2',
                          borderRadius: 6,
                          padding: '0.06em 0.38em',
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
          <div className="export-controls" style={{ marginTop: 10 }}>
            <button onClick={() => copyToClipboard(sortedAptamers)}>Copy</button>
            <button onClick={() => downloadData(sortedAptamers, 'aptamers.txt', 'text/plain')}>Download TXT</button>
            <button onClick={() => downloadData(sortedAptamers, 'aptamers.csv', 'text/csv')}>Download CSV</button>
            <button onClick={() => downloadData(sortedAptamers, 'aptamers.xls', 'application/vnd.ms-excel')}>Download XLS</button>
          </div>
        </div>
      )}

      {/* SVG Modal */}
      {svgModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="RNA secondary structure visualization modal"
          tabIndex={-1}
          onClick={() => setSvgModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.4)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            boxSizing: 'border-box',
            overflowY: 'auto',
            cursor: 'pointer',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 12,
              maxWidth: '90vw',
              maxHeight: '90vh',
              padding: 20,
              boxShadow: '0 10px 28px rgba(0,0,0,0.3)',
              overflow: 'auto',
              cursor: 'default',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setSvgModalOpen(false)}
              aria-label="Close modal"
              style={{
                float: 'right',
                fontSize: 24,
                fontWeight: 'bold',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: '#a00',
                marginBottom: 10,
              }}
            >
              ×
            </button>
            <div
              style={{ width: '100%', height: 'auto', maxHeight: '80vh', clear: 'both' }}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>
        </div>
      )}
    </main>
  );
}

export default Advanced;
