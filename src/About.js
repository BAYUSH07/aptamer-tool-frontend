// src/About.js
import React from 'react';
import logo from './PAWSLOGO.png';
import ayushPhoto from './Ayush1.png';
import aadityaPhoto from './Aaditya.jpeg';
import pranjalPhoto from './Pranjal.jpg';
import sanketPhoto from './DrSanketHQ.png';
import sandeepanPhoto from './DrSandeepanHQ.png';

// Social icons (kept in case you later want to render them)
const LinkedInIcon = () => (
  <svg width="24" height="24" fill="#0a66c2" viewBox="0 0 16 16" style={{ verticalAlign: 'middle' }}>
    <path d="M0 1.146C0 .513.324 0 .725 0h14.55c.4 0 .725.513.725 1.146v13.708c0 .633-.325 1.146-.725 1.146H.726a.723.723 0 0 1-.725-1.146V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c-.837 0-1.363-.554-1.363-1.248C2.38 3.554 2.906 3 3.733 3c.828 0 1.363.555 1.363 1.248 0 .694-.535 1.248-1.362 1.248zm4.908 8.212V9.359c0-.215.016-.43.08-.583.175-.43.576-.875 1.248-.875.882 0 1.236.66 1.236 1.628v3.865h2.401V9.25C13.607 7.137 12.527 6 10.92 6c-.97 0-1.547.538-1.808.915h.026V6.169H6.764c.03.643 0 7.225 0 7.225h2.401z"></path>
  </svg>
);

const ScholarIcon = () => (
  <svg width="24" height="24" fill="#4285f4" viewBox="0 0 48 48" style={{ verticalAlign: 'middle' }}>
    <path d="M24 5C14 5 5.5 8.8 5.5 14c0 4.2 6.4 7.8 15.5 8.7V28h-4v4h4v6h4v-6h4v-4h-4v-5.3c9.1-.9 15.5-4.5 15.5-8.7C42.5 8.8 34 5 24 5z" />
  </svg>
);

const team = [
  {
    name: "Ayush Bhoj",
    role: "Project Student",
    photo: ayushPhoto,
    linkedin: "https://www.linkedin.com/in/ayush-bhoj",
    scholar: "https://scholar.google.com/citations?user=yourayushscholarid"
  },
  {
    name: "Aaditya Shinde",
    role: "Project Student",
    photo: aadityaPhoto,
    linkedin: "https://www.linkedin.com/in/your-aaditya-linkedin",
    scholar: "https://scholar.google.com/citations?user=youraadityascholarid"
  },
  {
    name: "Pranjal Kulkarni",
    role: "Project Student",
    photo: pranjalPhoto,
    linkedin: "https://www.linkedin.com/in/your-pranjal-linkedin",
    scholar: "https://scholar.google.com/citations?user=yourpranjalscholarid"
  },
  {
    name: "Dr. Sanket Bapat",
    role: "Mentor",
    photo: sanketPhoto,
    linkedin: "https://www.linkedin.com/in/your-sanket-linkedin",
    scholar: "https://scholar.google.com/citations?user=yoursanketscholarid"
  },
  {
    name: "Dr. Sandeepan Mukherjee",
    role: "Mentor",
    photo: sandeepanPhoto,
    linkedin: "https://www.linkedin.com/in/your-sandeepan-linkedin",
    scholar: "https://scholar.google.com/citations?user=yoursandeepanscholarid"
  },
];

const About = () => (
  <main className="about-main">
    <div style={{ textAlign: 'center', marginTop: 24 }}>
      <img
        src={logo}
        alt="PAWS Web Tool Logo"
        style={{
          width: 90,
          height: 90,
          borderRadius: '50%',
          marginBottom: '1em',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)'
        }}
      />
      <h1 style={{ margin: '0.25em 0', fontWeight: 'bold', fontSize: '2.2em' }}>PAWS Web Tool</h1>
      <div style={{ fontSize: '1.16em', fontWeight: 500, color: '#0c56d1', marginBottom: 15 }}>
        Prediction of Aptamers Without SELEX
      </div>
    </div>

    <section style={{ margin: '2.5em 0' }}>
      <h2 style={{ textAlign: 'center', fontWeight: 700 }}>Our Team</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2.5em', justifyContent: 'center', margin: '2em 0' }}>
        {team.map((member, idx) => (
          <div style={{ textAlign: 'center', minWidth: 110 }} key={idx}>
            <img
              src={member.photo}
              alt={member.name}
              style={{
                width: 110,
                height: 110,
                borderRadius: '50%',
                objectFit: 'cover',
                boxShadow: '0 2px 10px rgba(0,0,0,0.10)'
              }}
            />
            <div style={{ marginTop: 12, fontWeight: 600 }}>{member.name}</div>
            <div style={{ fontSize: '0.94em', color: '#444', fontWeight: 400 }}>{member.role}</div>
          </div>
        ))}
      </div>
    </section>

    <section>
      <h2 style={{ fontWeight: 600 }}>About the Project</h2>
      <p style={{ fontSize: '1.08em', margin: '1.2em 0' }}>
        The <b>PAWS Web Tool</b> (Prediction of Aptamers Without SELEX) is an interactive online platform for the
        generation, analysis, and optimization of RNA aptamers. It enables users to randomly generate candidate
        aptamers with customizable constraints on sequence length, GC%, and melting temperature (Tm). The tool also
        supports both regional and single-nucleotide point mutations for in silico aptamer optimization.
      </p>
    </section>

    <section>
      <h3 className="section-label" style={{ marginTop: '2em' }}>Features & Technologies</h3>
      <ul style={{ fontSize: '1em', lineHeight: '1.7' }}>
        <li>Random aptamer generation with user-defined constraints (GC%, length, Tm)</li>
        <li>Secondary structure prediction and graphical visualization</li>
        <li>Support for both block and true point mutation modes</li>
        <li>Exports to TXT/CSV/XLS and sortable tables for downstream analysis</li>
        <li>Core technologies: <b>React.js</b> (frontend), <b>FastAPI</b> (backend), <b>ViennaRNA</b> for structure prediction, <b>BioPython</b> for thermodynamics</li>
      </ul>
    </section>

    <section>
      <h3 className="section-label" style={{ marginTop: '2em' }}>Contact & Acknowledgment</h3>
      <p>
        For queries, suggestions, or collaboration, please contact any team member.<br />
        We gratefully acknowledge the use of open-source tools and libraries in this project.
      </p>
    </section>
  </main>
);

export default About;
