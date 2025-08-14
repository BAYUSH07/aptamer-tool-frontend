import { useCallback } from 'react';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';

function ParticlesBg() {
  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        fullScreen: { enable: false },
        background: { color: 'transparent' },
        particles: {
          number: {
            value: 50,
            density: { enable: true, value_area: 800 },
          },
          color: {
            value: ['#1dbf73', '#0077cc', '#33cc99'], // Bio color palette 💙💚
          },
          shape: {
            type: ['polygon', 'star'], // ✨ hex + sparkle
            polygon: { sides: 6 },     // hexagon shape config
          },
          opacity: {
            value: 0.35,
            random: true,
          },
          size: {
            value: 4,
            random: true,
          },
          line_linked: {
            enable: true,
            distance: 120,
            color: '#0077cc',
            opacity: 0.2,
            width: 1,
          },
          move: {
            enable: true,
            speed: 1.3,
            direction: 'none',
            out_mode: 'out',
            random: false,
            straight: false,
          },
        },
        interactivity: {
          events: {
            onhover: { enable: true, mode: 'grab' },
            resize: true,
          },
        },
        retina_detect: true,
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
}

export default ParticlesBg;
