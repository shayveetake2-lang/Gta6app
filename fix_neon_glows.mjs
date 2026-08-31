import fs from 'fs';
let css = fs.readFileSync('css/styles.css', 'utf8');

const lightOverrides = `

  /* Remove neon glowing borders and box-shadows in light mode */
  .hero-media::after {
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.05);
  }
  
  .form-input:focus {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--border-focus) 25%, transparent);
    border-color: var(--border-focus);
  }
  
  .empty {
    border: 1px dashed var(--border);
    box-shadow: none;
    background: transparent;
  }
  
  .tabbar {
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  }
  
  .nav a:hover,
  .nav a.active {
    box-shadow: none;
    background: var(--surface-2);
    border-color: var(--border);
    color: var(--text);
  }
  
  .hero-search-input:focus {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }
  
  .feed-tab {
    border: 1px solid var(--border);
    box-shadow: none;
    background: var(--surface);
    color: var(--text);
  }
  
  .feed-tab.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 40%, transparent);
  }
  
  .empty-feed {
    border: 1px dashed var(--border);
    box-shadow: none;
    background: transparent;
  }
  
  .skeleton-post {
    border: 1px solid var(--border);
    box-shadow: none;
  }
  
  @media (hover: hover) {
    .post-card:hover {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
      border-color: var(--border);
      transform: translateY(-2px);
    }
  }
  
  .auth-modal {
    border: 1px solid var(--border);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  }
  
  .btn--primary,
  .btn--primary:hover {
    box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 35%, transparent);
    border: none;
  }
  
  .btn:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }

  /* Make sure the main grid lines are subtle pastel rather than harsh neon in light mode */
  .grid-bg {
    background-image: 
      radial-gradient(ellipse at 50% -50%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 70%), 
      linear-gradient(color-mix(in srgb, var(--accent-2) 15%, transparent) 1px, transparent 1px), 
      linear-gradient(90deg, color-mix(in srgb, var(--accent-2) 15%, transparent) 1px, transparent 1px);
  }
  
  .grid-bg--subtle {
    background-image: 
      radial-gradient(ellipse at top, color-mix(in srgb, var(--accent) 5%, transparent), transparent 70%), 
      linear-gradient(color-mix(in srgb, var(--accent-2) 15%, transparent) 1px, transparent 1px), 
      linear-gradient(90deg, color-mix(in srgb, var(--accent-2) 15%, transparent) 1px, transparent 1px);
  }
`;

css = css.replace(
  /\[data-theme="light"\] \{/,
  '[data-theme="light"] {' + lightOverrides
);

fs.writeFileSync('css/styles.css', css);
console.log("Neon glows stripped in light mode.");
