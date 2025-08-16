// src/About.js
import React from 'react';
import logo from './PAWSLOGO.png';
import ayushPhoto from './ayushbhoj.png';          // Make sure filename matches exactly
import aadityaPhoto from './Aaditya.jpeg';
import pranjalPhoto from './Pranjal.jpg';
import sanketPhoto from './DrSanketHQ.png';
import sandeepanPhoto from './sandeepan.png';

const team = [
  { name: "Ayush Bhoj", role: "Project Student", photo: ayushPhoto },
  { name: "Aaditya Shinde", role: "Project Student", photo: aadityaPhoto },
  { name: "Pranjal Kulkarni", role: "Project Student", photo: pranjalPhoto },
  { name: "Dr. Sanket Bapat", role: "Mentor", photo: sanketPhoto },
  { name: "Dr. Sandeepan Mukherjee", role: "Mentor", photo: sandeepanPhoto },
];

const About = () => (
  <main className="section-card" style={{ marginTop: "1.8rem" }}>
    {/* Header */}
    <div style={{ textAlign: 'center', marginBottom: 30 }}>
      <img
        src={logo}
        alt="PAWS Web Tool Logo"
        style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          marginBottom: '1em',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
        }}
      />
      <h1 className="hero-title">PAWS Web Tool</h1>
      <div className="hero-tagline">Prediction of Aptamers Without SELEX</div>
    </div>

    {/* Team */}
    <section style={{ margin: '2.5em 0' }}>
      <h2 className="section-title">Our Team</h2>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2.2em',
          justifyContent: 'center',
          marginTop: '2em',
        }}
      >
        {team.map((member, idx) => (
          <div
            key={idx}
            style={{
              textAlign: 'center',
              width: 160,
              background: 'rgba(255,255,255,0.9)',
              borderRadius: 14,
              padding: '1em',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            }}
          >
            <img
              src={member.photo}
              alt={member.name}
              style={{
                width: 110,
                height: 110,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #007bff',
                marginBottom: 10,
              }}
            />
            <div style={{ fontWeight: 700, fontSize: '1.05em' }}>{member.name}</div>
            <div style={{ fontSize: '0.92em', color: '#444' }}>{member.role}</div>
          </div>
        ))}
      </div>
    </section>

    {/* About the Project */}
    <section>
      <h2 className="section-title">About the Project</h2>
      <p style={{ fontSize: '1.05em', lineHeight: 1.65 }}>
        The <b>PAWS Web Tool</b> (Prediction of Aptamers Without SELEX) is an interactive online platform for the
        generation, analysis, and optimization of RNA aptamers. It enables users to randomly generate candidate
        aptamers with customizable constraints on sequence length, GC%, and melting temperature (Tm). The tool also
        supports both regional and single-nucleotide point mutations for in silico aptamer optimization.
      </p>
    </section>

    {/* Features */}
    <section>
      <h2 className="section-title">Features & Technologies</h2>
      <ul style={{ fontSize: '1em', lineHeight: 1.7, marginTop: 10 }}>
        <li>Random aptamer generation with user-defined constraints (GC%, length, Tm)</li>
        <li>Secondary structure prediction and graphical visualization</li>
        <li>Support for both block and true point mutation modes</li>
        <li>Exports to TXT/CSV/XLS and sortable tables for downstream analysis</li>
        <li>
          Core technologies: <b>React.js</b> (frontend), <b>FastAPI</b> (backend),
          <b> ViennaRNA</b> for structure prediction, <b>BioPython</b> for thermodynamics
        </li>
      </ul>
    </section>

    {/* Contact */}
    <section style={{ marginTop: '2em' }}>
      <h2 className="section-title">Contact & Acknowledgment</h2>
      <p style={{ fontSize: '1em' }}>
        For queries, suggestions, or collaboration, please contact any team member.<br />
        We gratefully acknowledge the use of open-source tools and libraries in this project.
      </p>
    </section>
  </main>
);

export default About;
