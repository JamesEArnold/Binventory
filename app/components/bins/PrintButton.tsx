'use client';

/**
 * @description PrintButton component for triggering printing of bin labels
 * @phase Core Web Interface
 * @dependencies Phase 1.1, Phase 1.2
 */

import { FC, useState, useEffect } from 'react';

export interface PrintButtonProps {
  id: string;
  label: string;
  location: string;
  description?: string;
  qrCodeUrl: string;
  allBins?: {
    id: string;
    label: string;
    location: string;
    description?: string;
    qrCodeUrl: string;
  }[];
  openModalDirectly?: boolean;
  onClose?: () => void;
}

interface CardConfig {
  colors: {
    header: string;
    headerText: string;
    qrBorder: string;
    qrText: string;
  };
  sizes: {
    qrCode: number;
    cardWidth: number;
    cardHeight: number;
  };
  styles: {
    squareCorners: boolean;
    showDescription: boolean;
    showFooter: boolean;
  };
}

interface CardTemplate {
  name: string;
  config: CardConfig;
}

// Default configuration
const defaultConfig: CardConfig = {
  colors: {
    header: '#0066CC',
    headerText: '#FFFFFF',
    qrBorder: '#0066CC',
    qrText: '#0066CC',
  },
  sizes: {
    qrCode: 110,
    cardWidth: 4,
    cardHeight: 3,
  },
  styles: {
    squareCorners: true,
    showDescription: true,
    showFooter: true,
  },
};

export const PrintButton: FC<PrintButtonProps> = ({
  id,
  label,
  location,
  description,
  qrCodeUrl,
  allBins,
  openModalDirectly = false,
  onClose,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(openModalDirectly);
  const [cardConfig, setCardConfig] = useState<CardConfig>({...defaultConfig});
  const [templateName, setTemplateName] = useState<string>('');
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  const [selectedBins, setSelectedBins] = useState<string[]>([id]);
  const [printLayout, setPrintLayout] = useState<{cols: number, rows: number}>({cols: 2, rows: 2});
  
  // Load templates from localStorage on component mount
  useEffect(() => {
    const savedTemplates = localStorage.getItem('binventory-card-templates');
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch (e) {
        console.error('Failed to parse saved templates', e);
      }
    }
  }, []);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const bins = allBins ? allBins.filter(bin => selectedBins.includes(bin.id)) : [{ id, label, location, description, qrCodeUrl }];
    
    // Create the grid layout for multiple bin cards
    const gridTemplateColumns = `repeat(${printLayout.cols}, 1fr)`;
    const gridGap = '0.25in';
    
    let binCardsHtml = '';
    bins.forEach(bin => {
      binCardsHtml += `
        <div class="card-container">
          <div class="card">
            <div class="card-header">
              <h2>${bin.label}</h2>
            </div>
            <div class="card-content">
              <div class="card-details">
                <div class="location">
                  <svg class="location-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  <span>${bin.location}</span>
                </div>
                ${bin.description && cardConfig.styles.showDescription ? `<div class="description">${bin.description}</div>` : ''}
                <div class="id">ID: ${bin.id}</div>
              </div>
              <div class="card-qr">
                <img class="qr-code" src="${bin.qrCodeUrl}" alt="QR code for ${bin.label}">
                <span class="qr-text">Scan to view</span>
              </div>
            </div>
            <div class="card-footer">
              <span>Binventory System</span>
            </div>
          </div>
        </div>
      `;
    });
    
    // Create the card content to be printed
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bin Cards</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @page {
            size: letter;
            margin: 0.5in;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #333;
            background-color: #f9fafb;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-grid {
            display: grid;
            grid-template-columns: ${gridTemplateColumns};
            grid-gap: ${gridGap};
            padding: 0;
          }
          .card-container {
            width: ${cardConfig.sizes.cardWidth}in;
            height: ${cardConfig.sizes.cardHeight}in;
            overflow: hidden;
            margin: 0 auto;
            background-color: white;
            page-break-inside: avoid;
          }
          .card {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            border: 1px solid #e5e7eb;
            border-radius: ${cardConfig.styles.squareCorners ? '0' : '8px'};
            background-color: white;
            overflow: hidden;
          }
          .card-header {
            background-color: ${cardConfig.colors.header};
            color: ${cardConfig.colors.headerText};
            padding: 8px 16px;
          }
          .card-header h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .card-content {
            display: flex;
            flex: 1;
            padding: 12px;
          }
          .card-details {
            flex: 1;
            padding-right: 12px;
            display: flex;
            flex-direction: column;
          }
          .location {
            display: flex;
            align-items: flex-start;
            margin-bottom: 8px;
            font-size: 12px;
            font-weight: 500;
            color: #4b5563;
          }
          .location-icon {
            margin-right: 4px;
            margin-top: 2px;
            flex-shrink: 0;
          }
          .description {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 8px;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .id {
            margin-top: auto;
            font-size: 12px;
            font-family: monospace;
            color: #6b7280;
          }
          .card-qr {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .qr-code {
            width: ${cardConfig.sizes.qrCode}px;
            height: ${cardConfig.sizes.qrCode}px;
            border: 2px solid ${cardConfig.colors.qrBorder};
            padding: 4px;
          }
          .qr-text {
            margin-top: 6px;
            font-size: 10px;
            text-align: center;
            color: ${cardConfig.colors.qrText};
            font-weight: 500;
          }
          .card-footer {
            border-top: 1px solid #e5e7eb;
            background-color: #f9fafb;
            padding: 6px 16px;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            ${!cardConfig.styles.showFooter ? 'display: none;' : ''}
          }
          @media print {
            body {
              background-color: transparent;
            }
            .print-grid {
              width: 100%;
            }
            .card-container {
              box-shadow: none;
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-grid">
          ${binCardsHtml}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 100);
            }, 200);
          };
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    if (onClose) {
      onClose();
    }
  };
  
  const handleCustomizePrint = () => {
    handlePrint();
    closeModal();
  };
  
  const updateColorConfig = (key: keyof CardConfig['colors'], value: string) => {
    setCardConfig({
      ...cardConfig,
      colors: {
        ...cardConfig.colors,
        [key]: value
      }
    });
  };
  
  const updateSizeConfig = (key: keyof CardConfig['sizes'], value: number) => {
    setCardConfig({
      ...cardConfig,
      sizes: {
        ...cardConfig.sizes,
        [key]: value
      }
    });
  };
  
  const updateStyleConfig = (key: keyof CardConfig['styles'], value: boolean) => {
    setCardConfig({
      ...cardConfig,
      styles: {
        ...cardConfig.styles,
        [key]: value
      }
    });
  };
  
  const saveTemplate = () => {
    if (!templateName.trim()) return;
    
    const newTemplate: CardTemplate = {
      name: templateName,
      config: {...cardConfig}
    };
    
    const updatedTemplates = [...templates.filter(t => t.name !== templateName), newTemplate];
    setTemplates(updatedTemplates);
    
    // Save to localStorage
    localStorage.setItem('binventory-card-templates', JSON.stringify(updatedTemplates));
    
    // Reset name field after saving
    setTemplateName('');
  };
  
  const loadTemplate = (name: string) => {
    const template = templates.find(t => t.name === name);
    if (template) {
      setCardConfig({...template.config});
      setSelectedTemplate(name);
    }
  };
  
  const resetToDefault = () => {
    setCardConfig({...defaultConfig});
    setSelectedTemplate('');
  };
  
  const deleteTemplate = (name: string) => {
    const updatedTemplates = templates.filter(t => t.name !== name);
    setTemplates(updatedTemplates);
    
    // Save to localStorage
    localStorage.setItem('binventory-card-templates', JSON.stringify(updatedTemplates));
    
    if (selectedTemplate === name) {
      setSelectedTemplate('');
    }
  };

  return (
    <>
      {!openModalDirectly && (
        <button
          onClick={openModal}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
          aria-label="Print bin label"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mr-2 h-4 w-4 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Print Label
        </button>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col my-4">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">Customize Bin Cards</h2>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="pb-16">
                {/* Preview */}
                <div className="border rounded p-4 flex flex-col items-center justify-center bg-gray-50 mb-6">
                  <div className="text-xs text-gray-500 mb-2">
                    Preview ({cardConfig.sizes.cardWidth}″ × {cardConfig.sizes.cardHeight}″)
                  </div>
                  <div className="relative">
                    <div 
                      style={{
                        width: `${cardConfig.sizes.cardWidth * 50}px`, 
                        height: `${cardConfig.sizes.cardHeight * 50}px`,
                        overflow: 'hidden',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        backgroundColor: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid #e5e7eb',
                        borderRadius: cardConfig.styles.squareCorners ? '0' : '8px',
                      }}
                    >
                      <div 
                        style={{
                          backgroundColor: cardConfig.colors.header,
                          color: cardConfig.colors.headerText,
                          padding: '4px 8px',
                        }}
                      >
                        <div style={{
                          margin: 0,
                          fontSize: '10px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {label}
                        </div>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        flex: 1,
                        padding: '6px',
                      }}>
                        <div style={{
                          flex: 1,
                          paddingRight: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          fontSize: '6px',
                        }}>
                          <div style={{marginBottom: '4px', fontWeight: 500, color: '#4b5563'}}>
                            {location}
                          </div>
                          {description && cardConfig.styles.showDescription && (
                            <div style={{
                              color: '#6b7280',
                              marginBottom: '4px',
                              fontSize: '6px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                            }}>
                              {description}
                            </div>
                          )}
                          <div style={{
                            marginTop: 'auto',
                            fontSize: '6px',
                            fontFamily: 'monospace',
                            color: '#6b7280',
                          }}>
                            ID: {id}
                          </div>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <div style={{
                            width: `${cardConfig.sizes.qrCode * (50 / 96)}px`,
                            height: `${cardConfig.sizes.qrCode * (50 / 96)}px`,
                            border: `1px solid ${cardConfig.colors.qrBorder}`,
                            padding: '2px',
                            backgroundColor: 'white',
                          }}>
                            <img 
                              src={qrCodeUrl}
                              alt="QR code preview"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain'
                              }}
                            />
                          </div>
                          <div style={{
                            marginTop: '2px',
                            fontSize: '5px',
                            textAlign: 'center',
                            color: cardConfig.colors.qrText,
                            fontWeight: 500,
                          }}>
                            Scan to view
                          </div>
                        </div>
                      </div>
                      
                      {cardConfig.styles.showFooter && (
                        <div style={{
                          borderTop: '1px solid #e5e7eb',
                          backgroundColor: '#f9fafb',
                          padding: '3px 8px',
                          textAlign: 'center',
                          fontSize: '6px',
                          color: '#6b7280',
                        }}>
                          Binventory System
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    QR Size: {cardConfig.sizes.qrCode}px
                  </div>
                </div>
                
                {/* Multi-Bin Selection */}
                {allBins && allBins.length > 1 && (
                  <div className="mb-6 border rounded-lg p-4 bg-gray-50">
                    <h3 className="text-sm font-medium mb-2">Select Bins to Print</h3>
                    <p className="text-xs text-gray-500 mb-3">Print multiple bin labels on a single page</p>
                    
                    <div className="max-h-40 overflow-y-auto mb-4 border rounded bg-white p-2">
                      {allBins.map(bin => (
                        <div key={bin.id} className="flex items-center mb-2">
                          <input 
                            type="checkbox"
                            id={`bin-${bin.id}`}
                            checked={selectedBins.includes(bin.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBins([...selectedBins, bin.id]);
                              } else {
                                setSelectedBins(selectedBins.filter(id => id !== bin.id));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <label htmlFor={`bin-${bin.id}`} className="ml-2 text-sm">
                            {bin.label} <span className="text-xs text-gray-500">({bin.location})</span>
                          </label>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">{selectedBins.length} bins selected</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setSelectedBins(allBins.map(bin => bin.id))}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Select All
                        </button>
                        <button 
                          onClick={() => setSelectedBins([id])}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    
                    <h3 className="text-sm font-medium mt-4 mb-2">Page Layout</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs mb-1">Columns: {printLayout.cols}</label>
                        <input 
                          type="range" 
                          min="1" 
                          max="3" 
                          value={printLayout.cols}
                          onChange={(e) => setPrintLayout({...printLayout, cols: parseInt(e.target.value)})}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">Rows per page: {printLayout.rows}</label>
                        <input 
                          type="range" 
                          min="1" 
                          max="4" 
                          value={printLayout.rows}
                          onChange={(e) => setPrintLayout({...printLayout, rows: parseInt(e.target.value)})}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      This layout will print up to {printLayout.cols * printLayout.rows} labels per page
                    </p>
                  </div>
                )}
                
                {/* Basic Options */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium">Card Size</h3>
                      <p className="text-xs text-gray-500">Set the dimensions of your bin card</p>
                    </div>
                    
                    <button
                      onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                      className="text-sm text-blue-600 font-medium hover:text-blue-800"
                    >
                      {showAdvancedOptions ? 'Hide Advanced Options' : 'Show Advanced Options'}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs mb-1">Width: {cardConfig.sizes.cardWidth}″</label>
                      <input 
                        type="range" 
                        min="2" 
                        max="6" 
                        step="0.5" 
                        value={cardConfig.sizes.cardWidth}
                        onChange={(e) => updateSizeConfig('cardWidth', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs mb-1">Height: {cardConfig.sizes.cardHeight}″</label>
                      <input 
                        type="range" 
                        min="2" 
                        max="5" 
                        step="0.5" 
                        value={cardConfig.sizes.cardHeight}
                        onChange={(e) => updateSizeConfig('cardHeight', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1 mb-4">
                    <h3 className="text-sm font-medium">QR Code Size</h3>
                    <p className="text-xs text-gray-500">Adjust for optimal scanning</p>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-xs mb-1">Size: {cardConfig.sizes.qrCode}px</label>
                    <input 
                      type="range" 
                      min="80" 
                      max="150" 
                      value={cardConfig.sizes.qrCode}
                      onChange={(e) => updateSizeConfig('qrCode', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center">
                      <input 
                        id="square-corners" 
                        type="checkbox" 
                        checked={cardConfig.styles.squareCorners}
                        onChange={(e) => updateStyleConfig('squareCorners', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <label htmlFor="square-corners" className="ml-2 text-xs">
                        Square corners for easier cutting
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input 
                        id="show-description" 
                        type="checkbox" 
                        checked={cardConfig.styles.showDescription}
                        onChange={(e) => updateStyleConfig('showDescription', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <label htmlFor="show-description" className="ml-2 text-xs">
                        Show description
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Advanced Options */}
                {showAdvancedOptions && (
                  <>
                    {/* Templates Selection */}
                    <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <h3 className="text-sm font-medium mb-3">Card Templates</h3>
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-grow">
                          <label className="block text-xs mb-1">Load Template</label>
                          <select 
                            value={selectedTemplate}
                            onChange={(e) => loadTemplate(e.target.value)}
                            className="w-full border rounded px-2 py-1.5 text-sm"
                          >
                            <option value="">-- Select Template --</option>
                            {templates.map(template => (
                              <option key={template.name} value={template.name}>
                                {template.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <button 
                          onClick={resetToDefault}
                          className="px-2 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100"
                        >
                          Reset to Default
                        </button>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <label className="block text-xs mb-1">Save Current as Template</label>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="Enter template name"
                            className="flex-grow border rounded px-2 py-1.5 text-sm"
                          />
                          <button 
                            onClick={saveTemplate}
                            disabled={!templateName.trim()}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                      
                      {templates.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <label className="block text-xs mb-1">Manage Templates</label>
                          <div className="max-h-20 overflow-y-auto">
                            {templates.map(template => (
                              <div key={template.name} className="flex items-center justify-between py-1 text-sm">
                                <span>{template.name}</span>
                                <button 
                                  onClick={() => deleteTemplate(template.name)}
                                  className="text-red-600 hover:text-red-800 text-xs"
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {/* Colors */}
                      <div>
                        <h3 className="text-sm font-medium mb-2">Colors</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs mb-1">Header Background</label>
                            <div className="flex items-center space-x-2">
                              <input 
                                type="color" 
                                value={cardConfig.colors.header}
                                onChange={(e) => updateColorConfig('header', e.target.value)}
                                className="w-8 h-8 rounded"
                              />
                              <input 
                                type="text" 
                                value={cardConfig.colors.header}
                                onChange={(e) => updateColorConfig('header', e.target.value)}
                                className="border rounded px-2 py-1 text-xs w-24"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs mb-1">Header Text</label>
                            <div className="flex items-center space-x-2">
                              <input 
                                type="color" 
                                value={cardConfig.colors.headerText}
                                onChange={(e) => updateColorConfig('headerText', e.target.value)}
                                className="w-8 h-8 rounded"
                              />
                              <input 
                                type="text" 
                                value={cardConfig.colors.headerText}
                                onChange={(e) => updateColorConfig('headerText', e.target.value)}
                                className="border rounded px-2 py-1 text-xs w-24"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs mb-1">QR Border</label>
                            <div className="flex items-center space-x-2">
                              <input 
                                type="color" 
                                value={cardConfig.colors.qrBorder}
                                onChange={(e) => updateColorConfig('qrBorder', e.target.value)}
                                className="w-8 h-8 rounded"
                              />
                              <input 
                                type="text" 
                                value={cardConfig.colors.qrBorder}
                                onChange={(e) => updateColorConfig('qrBorder', e.target.value)}
                                className="border rounded px-2 py-1 text-xs w-24"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs mb-1">QR Text</label>
                            <div className="flex items-center space-x-2">
                              <input 
                                type="color" 
                                value={cardConfig.colors.qrText}
                                onChange={(e) => updateColorConfig('qrText', e.target.value)}
                                className="w-8 h-8 rounded"
                              />
                              <input 
                                type="text" 
                                value={cardConfig.colors.qrText}
                                onChange={(e) => updateColorConfig('qrText', e.target.value)}
                                className="border rounded px-2 py-1 text-xs w-24"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Additional Style Options */}
                      <div>
                        <h3 className="text-sm font-medium mb-2">Additional Options</h3>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <input 
                              id="show-footer" 
                              type="checkbox" 
                              checked={cardConfig.styles.showFooter}
                              onChange={(e) => updateStyleConfig('showFooter', e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <label htmlFor="show-footer" className="ml-2 text-xs">
                              Show footer
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Fade out gradient using fixed positioning at bottom of scrollable area */}
              <div className="sticky bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none mt-[-4rem]"></div>
            </div>
            
            <div className="flex items-center justify-end p-4 border-t border-gray-200 space-x-3 bg-white">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCustomizePrint}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 