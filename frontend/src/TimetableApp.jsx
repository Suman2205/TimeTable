import React, { useState, useEffect } from 'react';
import TimetableInputForm from './TimetableInputForm';
import MultipleTimetableGenerator from './MultipleTimetableGenerator';
import './TimetableApp.css';

const TimetableApp = () => {
  const [inputData, setInputData] = useState(null);
  const [currentStep, setCurrentStep] = useState('input'); // 'input' or 'generate'
  const [isValidInput, setIsValidInput] = useState(false);

  // Handle input data changes from the form
  const handleInputDataChange = (newInputData) => {
    setInputData(newInputData);
    
    // Basic validation
    const hasClasses = newInputData?.classes?.length > 0;
    const hasValidClasses = newInputData?.classes?.every(cls => 
      cls.name && 
      cls.sections?.length > 0 &&
      (cls.subjects?.length > 0 || cls.lab_subjects?.length > 0)
    );
    const hasDaysAndSlots = newInputData?.days?.length > 0 && newInputData?.slots?.length > 0;
    
    setIsValidInput(hasClasses && hasValidClasses && hasDaysAndSlots);
  };

  // Navigate between steps
  const goToGeneration = () => {
    if (isValidInput) {
      setCurrentStep('generate');
    }
  };

  const goToInput = () => {
    setCurrentStep('input');
  };

  // Auto-save input data to localStorage
  useEffect(() => {
    if (inputData) {
      localStorage.setItem('timetable_input_data', JSON.stringify(inputData));
    }
  }, [inputData]);

  // Load input data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('timetable_input_data');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setInputData(parsedData);
        handleInputDataChange(parsedData);
      } catch (error) {
        console.error('Failed to load saved data:', error);
      }
    }
  }, []);

  return (
    <div className="timetable-app">
      <div className="app-header">
        <h1>🎓 Advanced Timetable Generator</h1>
        <p>Create optimized academic timetables with multiple variations</p>
        
        {/* Progress Indicator */}
        <div className="progress-indicator">
          <div className={`step ${currentStep === 'input' ? 'active' : isValidInput ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Configure</div>
          </div>
          <div className="progress-line"></div>
          <div className={`step ${currentStep === 'generate' ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Generate</div>
          </div>
        </div>
      </div>

      <div className="app-content">
        {currentStep === 'input' && (
          <div className="input-step">
            <div className="step-header">
              <h2>📝 Step 1: Configure Timetable Parameters</h2>
              <p>Set up your classes, subjects, teachers, and constraints</p>
            </div>

            <TimetableInputForm 
              onInputChange={handleInputDataChange}
              initialData={inputData}
            />

            <div className="step-actions">
              <div className="validation-status">
                {isValidInput ? (
                  <span className="valid">
                    ✅ Configuration is valid and ready for generation
                  </span>
                ) : (
                  <span className="invalid">
                    ⚠️ Please complete the configuration to proceed
                  </span>
                )}
              </div>

              <button
                onClick={goToGeneration}
                disabled={!isValidInput}
                className="next-step-btn"
              >
                <span className="btn-icon">➡️</span>
                Proceed to Generation
              </button>
            </div>
          </div>
        )}

        {currentStep === 'generate' && (
          <div className="generation-step">
            <div className="step-header">
              <h2>🚀 Step 2: Generate Timetables</h2>
              <p>Create multiple timetable variations and compare results</p>
              
              <button
                onClick={goToInput}
                className="back-btn"
              >
                <span className="btn-icon">⬅️</span>
                Back to Configuration
              </button>
            </div>

            <MultipleTimetableGenerator inputData={inputData} />
          </div>
        )}
      </div>

      {/* Quick Actions Panel */}
      <div className="quick-actions">
        <button
          onClick={() => {
            localStorage.removeItem('timetable_input_data');
            setInputData(null);
            setCurrentStep('input');
            setIsValidInput(false);
          }}
          className="action-btn clear-btn"
          title="Clear all data and start fresh"
        >
          🗑️ Clear All
        </button>
        
        {inputData && (
          <button
            onClick={() => {
              const dataStr = JSON.stringify(inputData, null, 2);
              const dataBlob = new Blob([dataStr], { type: 'application/json' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(dataBlob);
              link.download = 'timetable_config.json';
              link.click();
            }}
            className="action-btn export-config-btn"
            title="Export configuration as JSON"
          >
            💾 Export Config
          </button>
        )}
        
        <label className="action-btn import-config-btn" title="Import configuration from JSON">
          📁 Import Config
          <input
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const importedData = JSON.parse(event.target.result);
                    setInputData(importedData);
                    handleInputDataChange(importedData);
                    setCurrentStep('input');
                  } catch (error) {
                    alert('Failed to import configuration: Invalid JSON file');
                  }
                };
                reader.readAsText(file);
              }
            }}
          />
        </label>
      </div>
    </div>
  );
};

export default TimetableApp;