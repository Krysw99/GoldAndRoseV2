/**
 * High-Performance targeted element printer for iOS Safari and other browsers.
 * Instead of printing the entire webpage (which has huge DOM tree and causes Safari to hang/delay for 15-20s),
 * this utility injects only the targeted receipt/invoice container into a temporary iframe.
 * iPad and iPhone Safari can compute the layout of this tiny DOM instantly (<0.2s).
 */
export function printElement(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`[printElement] Element with id "${elementId}" not found. Falling back to window.print().`);
    window.print();
    return;
  }

  // Create a temporary hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) {
    console.error("Could not get iframe document for printing");
    window.print();
    return;
  }

  // Copy all parent styles and stylesheets to the print iframe
  let stylesHtml = '';
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    stylesHtml += node.outerHTML;
  });

  // Open iframe document and write content
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Print Document</title>
        ${stylesHtml}
        <style>
          /* Optimized high-fidelity print styles */
          body, html {
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          }
          
          /* Force immediate layout rendering */
          * {
            animation: none !important;
            transition: none !important;
            box-shadow: none !important;
            text-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print\\:hidden, button, nav, header, footer, .container-close-btn {
            display: none !important;
          }

          .print\\:block {
            display: block !important;
          }

          /* Ensure nested image wrappers are clean */
          img {
            max-width: 100% !important;
            height: auto !important;
            display: block;
          }

          body {
            padding: 24px !important;
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          ${element.innerHTML}
        </div>
      </body>
    </html>
  `);
  iframeDoc.close();

  // Give resources (images, base64 signatures) a brief moment to decode/load.
  // 150ms is perfect: fast enough to keep user-gesture alignment on Safari,
  // but long enough for WebKit to prepare layout.
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Error invoking print on iframe:", e);
      window.print();
    }
    
    // Clean up the iframe after the print dialog finishes or cancels
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  }, 150);
}
