import fs from 'fs';
import path from 'path';

// OKLCH to RGB conversion algorithm
function oklchToRgb(l, c, h, a = 1) {
  // Parse L percentage (e.g., 97.1% -> 0.971)
  if (typeof l === 'string' && l.endsWith('%')) {
    l = parseFloat(l) / 100;
  } else {
    l = parseFloat(l);
  }
  c = parseFloat(c);
  h = parseFloat(h);
  
  if (isNaN(l)) l = 0;
  if (isNaN(c)) c = 0;
  if (isNaN(h)) h = 0;

  const hRad = (h * Math.PI) / 180;
  
  // OKLCH to OKLAB
  const L = l;
  const a_ = c * Math.cos(hRad);
  const b_ = c * Math.sin(hRad);

  // OKLAB to LMS
  const l_ = L + 0.3963377774 * a_ + 0.2158037573 * b_;
  const m_ = L - 0.1055613458 * a_ - 0.0638541728 * b_;
  const s_ = L - 0.0894841775 * a_ - 1.2914855480 * b_;

  const l3 = Math.max(0, l_) ** 3;
  const m3 = Math.max(0, m_) ** 3;
  const s3 = Math.max(0, s_) ** 3;

  // LMS to Linear sRGB
  const rL = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gL = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bL = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  // Linear sRGB to Standard sRGB
  const toSRGB = (x) => {
    return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  };

  const r = Math.round(Math.max(0, Math.min(1, toSRGB(rL))) * 255);
  const g = Math.round(Math.max(0, Math.min(1, toSRGB(gL))) * 255);
  const b = Math.round(Math.max(0, Math.min(1, toSRGB(bL))) * 255);

  if (a !== undefined && a !== 1) {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

const assetsDir = path.join(process.cwd(), 'dist', 'assets');
if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  const cssFiles = files.filter(f => f.endsWith('.css'));
  
  console.log(`Found ${cssFiles.length} CSS files in dist/assets`);
  
  for (const file of cssFiles) {
    const filePath = path.join(assetsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace oklch(...) matches
    // This matches: oklch(L C H) or oklch(L C H / A)
    // Supports percentages, decimals, etc.
    const oklchRegex = /oklch\(([^)]+)\)/g;
    let count = 0;
    
    content = content.replace(oklchRegex, (match, inner) => {
      if (inner.includes('var(')) {
        return match; // Skip if it contains variables (cannot easily resolve statically)
      }
      
      let colorPart = inner.trim();
      let alphaPart = '1';
      
      if (inner.includes('/')) {
        const parts = inner.split('/');
        colorPart = parts[0].trim();
        alphaPart = parts[1].trim();
      }
      
      const components = colorPart.split(/\s+/);
      if (components.length >= 3) {
        const l = components[0];
        const c = components[1];
        const h = components[2];
        
        try {
          const rgbColor = oklchToRgb(l, c, h, alphaPart === '1' ? 1 : alphaPart);
          count++;
          return rgbColor;
        } catch (err) {
          return match;
        }
      }
      return match;
    });
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Processed ${file}: Replaced ${count} oklch color definitions with compatible rgb/rgba colors.`);
  }
} else {
  console.log('dist/assets directory does not exist yet. Please build the project first.');
}
