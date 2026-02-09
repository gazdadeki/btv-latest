import React, { useEffect } from 'react';

const downloadsStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      'Helvetica Neue', Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .container {
    max-width: 800px;
    width: 100%;
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }

  .header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 40px;
    text-align: center;
  }

  .header h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
    font-weight: 700;
  }

  .header p {
    font-size: 1.1rem;
    opacity: 0.9;
  }

  .content {
    padding: 40px;
  }

  .download-section {
    margin-bottom: 30px;
  }

  .download-section h2 {
    font-size: 1.5rem;
    margin-bottom: 20px;
    color: #667eea;
    border-bottom: 2px solid #667eea;
    padding-bottom: 10px;
  }

  .download-item {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 15px;
    transition: all 0.3s ease;
  }

  .download-item:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .download-item h3 {
    font-size: 1.2rem;
    margin-bottom: 10px;
    color: #333;
  }

  .download-item p {
    color: #666;
    margin-bottom: 15px;
  }

  .download-button {
    display: inline-block;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 30px;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.3s ease;
    border: none;
    cursor: pointer;
  }

  .download-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .download-button:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
  }

  .coming-soon {
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    color: #856404;
  }

  .coming-soon h3 {
    color: #856404;
    margin-bottom: 10px;
  }

  .footer {
    text-align: center;
    padding: 20px;
    color: #666;
    font-size: 0.9rem;
    border-top: 1px solid #e9ecef;
  }

  @media (max-width: 600px) {
    .header h1 {
      font-size: 2rem;
    }

    .content {
      padding: 20px;
    }
  }
`;

export default function DownloadsPage() {
  useEffect(() => {
    document.title = 'BaltazarTV - Downloads';
    const style = document.createElement('style');
    style.textContent = downloadsStyles;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  return (
    <div className="container">
      <div className="header">
        <h1>Download BaltazarTV</h1>
        <p>Get the latest version of our application</p>
      </div>

      <div className="content">
        <div className="download-section">
          <h2>Available Downloads</h2>
          <div className="download-item">
            <h3>Mobile Application</h3>
            <p>iOS and Android apps</p>
            <div className="coming-soon">
              <h3>Coming Soon</h3>
              <p>Mobile applications will be available for download soon.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="footer">
        <p>&copy; 2025 BaltazarTV. All rights reserved.</p>
      </div>
    </div>
  );
}
