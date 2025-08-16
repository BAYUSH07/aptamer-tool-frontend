// Advanced.js
import React, { useState } from 'react';
import './App.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import logo from './PAWSLOGO.png';

// API
const API_BASE_URL = process.env.REACT_APP_API_URL;

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
    columns.map(c => `"${String((r[c.key] ?? '')).replace(/"/g,'""')}"`).join(',')
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

  const renderMfe = (mfe) => mfe === "N/A" ? "N/A" : `${mfe} kcal/mol`;
  const renderKd = (kd) => {
    if (!kd) return "";
    return kd === "N/A" || kd.startsWith("<") || kd.startsWith(">") ? kd : `${kd} nM`;
    };

  const parseSortableValue = (value, type) => {
    if (value == null || value === 'N/A') return NaN;
    if (type === 'mfe' || type === 'kd') {
      const str = String(value);
      if (str.startsWith('<')) return parseFloat(str.substring(1)) || 0;
      if (str.startsWith('>')) return parseFloat(str.substring(1)) || 1e9;
      return parseFloat(str);
    }
    if (type === 'gc_content' || type === 'tm' || type === 'length') return Number(value);
    return String(value).toLowerCase();
  };

  const sortAptamers = (rows, key, order = 'asc') => {
    if (!key) return rows;
    const typeMap = {
      gc_content: 'gc_content', length: 'length', mfe: 'mfe', kd: 'kd', tm: 'tm', sequence: 'string',
    };
    const type = typeMap[key] || 'string';
    const sorted = [...rows].sort((a, b) => {
      const aVal = parseSortableValue(a[key], type);
      const bVal = parseSortableValue(b[key], type);
      if (isNaN(aVal) && !isNaN(bVal)) return 1;
      if (!isNaN(aVal) && isNaN(bVal)) return -1;
      if (isNaN(aVal) && isNaN(bVal)) return 0;
      if (type !== 'string') return order === 'asc' ? aVal - bVal : bVal - aVal;
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  const onSortChange = (field) => {
    if (sortKey === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortKey(field); setSortOrder('asc'); }
  };

  // Structure SVG modal handler
  const handleShowStructure = async (sequence, structure) => {
    setSvgLoading(true);
    setSvgModalOpen(true);
    try {
      const response = await fetch(`${API_BASE_URL}/plot-structure`, {
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
      const svgText = await response.text();
      setSvgContent(svgText);
    } catch {
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
    if (!aptamerInput.trim()) return toast.error("Please enter an aptamer sequence.");
    if (numMutations <= 0) return toast.error("Number of mutations must be positive.");
    if (aptamerInput.length < 20 || aptamerInput.length > 80) {
      toast.error("Aptamer length must be between 20 and 80 nucleotides.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/point-mutate-aptamer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aptamer: aptamerInput, num_point_mutations: numMutations })
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
      <div className="hero">
        <img src={logo} alt="PAWS Web Tool Logo" className="hero-logo" />
        <h1 className="hero-title">PAWS Web Tool</h1>
        <div className="hero-tagline">Prediction of Aptamers Without SELEX</div>
      </div>

      <ToastContainer />
      <h1 className="heading">RNA Aptamer Generator (Advanced Mode)</h1>

      {/* Mode Selector */}
      <div className="actions-bar" style={{ marginBottom: 16 }}>
        <button className={`ghost-btn ${mode === 'generate' ? 'ghost-active' : ''}`} onClick={() => { setMode('generate'); setAptamers([]); }}>
          Generate Aptamers
        </button>
        <button className={`ghost-btn ${mode === 'mutate' ? 'ghost-active' : ''}`} onClick={() => { setMode('mutate'); setAptamers([]); }}>
          Point Mutation
        </button>
      </div>

      {mode === 'generate' && (
        <div className="box section-card">
          <h2 className="section-title">🛠️ Advanced Generate Aptamers</h2>
          <textarea
            value={fastaInput}
            onChange={e => setFastaInput(e.target.value)}
            placeholder="Paste your FASTA sequence here..."
            className="input-box centered"
          />
          <div className="filter-row">
            <label>Min GC %<br /><input type="number" min="0" max="100" value={gcMin} onChange={e => setGcMin(e.target.value)} /></label>
            <label>Max GC %<br /><input type="number" min="0" max="100" value={gcMax} onChange={e => setGcMax(e.target.value)} /></label>
            <label>Min Length<br /><input type="number" min="1" value={lengthMin} onChange={e => setLengthMin(e.target.value)} /></label>
            <label>Max Length<br /><input type="number" min="1" value={lengthMax} onChange={e => setLengthMax(e.target.value)} /></label>
            <label>Min Tm<br /><input type="number" value={tmMin} onChange={e => setTmMin(e.target.value)} /></label>
            <label>Max Tm<br /><input type="number" value={tmMax} onChange={e => setTmMax(e.target.value)} /></label>
          </div>
          <div className="actions-bar">
            <button className="cta-btn" onClick={handleGenerate} disabled={loading}>
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>
      )}

      {mode === 'mutate' && (
        <div className="box section-card">
          <h2 className="section-title">🧬 Point Mutate Aptamer</h2>
          <div className="note">
            <b>Note:</b> Mutation is random; try 2–3 runs or tweak parameters if you don’t see results.
          </div>
          <textarea
            value={aptamerInput}
            onChange={e => setAptamerInput(e.target.value)}
            placeholder="Enter an aptamer sequence (20–80 nts)"
            className="input-box centered"
          />
          <div className="filter-row">
            <label>Number of point mutations<br />
              <input type="number" min="1" max="100" value={numMutations} onChange={e => setNumMutations(Number(e.target.value))} />
            </label>
          </div>
          <div className="actions-bar">
            <button className="cta-btn" onClick={handlePointMutate} disabled={loading}>
              {loading ? 'Mutating…' : 'Mutate'}
            </button>
          </div>
        </div>
      )}

      {aptamers.length > 0 && (
        <div className="result-section section-card">
          <div className="actions-bar" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <label>Sort By:&nbsp;</label>
            <select value={sortKey || ""} onChange={e => onSortChange(e.target.value)} className="select">
              <option value="">-- None --</option>
              <option value="length">Length</option>
              <option value="gc_content">GC %</option>
              <option value="mfe">MFE</option>
              <option value="kd">Kd (nM)</option>
              <option value="tm">Tm</option>
              <option value="sequence">Sequence</option>
            </select>
            {sortKey && (
              <button className="ghost-btn" onClick={() => onSortChange(sortKey)}>
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
                    Length{sortKey === 'length' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                  <th onClick={() => onSortChange('gc_content')} style={{ cursor: 'pointer' }}>
                    GC %{sortKey === 'gc_content' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                  <th style={{ minWidth: "160px" }}>Structure</th>
                  <th onClick={() => onSortChange('mfe')} style={{ cursor: 'pointer' }}>
                    MFE{sortKey === 'mfe' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                  <th onClick={() => onSortChange('tm')} style={{ cursor: 'pointer' }}>
                    Tm{sortKey === 'tm' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                  <th onClick={() => onSortChange('kd')} style={{ cursor: 'pointer' }}>
                    Kd (nM){sortKey === 'kd' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAptamers.map((apt, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td className="text-left" style={{ wordBreak: "break-all" }}>{apt.sequence}</td>
                    <td>{apt.length}</td>
                    <td>{apt.gc_content}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.95em' }}>
                      <span title={apt.structure}>{apt.structure}</span>
                      <button
                        onClick={() => handleShowStructure(apt.sequence, apt.structure)}
                        title="Show graphical structure"
                        disabled={svgLoading}
                        className="pill-btn"
                        style={{ marginLeft: 6 }}
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

          <div className="export-controls actions-bar">
            <button className="ghost-btn" onClick={() => navigator.clipboard.writeText(toCSV(sortedAptamers)).then(() => toast.success('Copied CSV to clipboard!')).catch(() => toast.error('Copy failed'))}>Copy CSV</button>
            <button className="ghost-btn" onClick={() => downloadCSV(sortedAptamers, 'aptamers.csv')}>Download CSV</button>
            <button className="ghost-btn" onClick={() => downloadXLSX(sortedAptamers, 'aptamers.xlsx')}>Download XLSX</button>
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
          className="modal-backdrop"
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-x" onClick={() => setSvgModalOpen(false)} aria-label="Close modal">×</button>
            <div dangerouslySetInnerHTML={{ __html: svgContent }} />
          </div>
        </div>
      )}
    </main>
  );
}

export default Advanced;
