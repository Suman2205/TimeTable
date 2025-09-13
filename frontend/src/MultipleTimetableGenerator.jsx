import React, { useState } from 'react';
// import { TimetableAPI } from './api-service';
import { TimetableAPI } from './services/api-services';
import TimetableDisplay from './TimetableDisplay';
import './MultipleTimetableGenerator.css';

const MultipleTimetableGenerator = ({ inputData }) => {
  const [timetables, setTimetables] = useState([]);
  const [currentTimetable, setCurrentTimetable] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generationCount, setGenerationCount] = useState(3);

  const generateMultipleTimetables = async () => {
    if (!inputData) {
      setError('No input data provided');
      return;
    }

    setLoading(true);
    setError(null);
    setTimetables([]);

    try {
      console.log(`Generating ${generationCount} timetable variations...`);
      
      const { results, errors } = await TimetableAPI.generateMultipleTimetables(
        inputData, 
        generationCount
      );

      if (results.length === 0) {
        throw new Error('No timetables could be generated');
      }

      setTimetables(results);
      setCurrentTimetable(0);

      if (errors.length > 0) {
        console.warn('Some timetable generations failed:', errors);
      }

      console.log(`Successfully generated ${results.length} timetable(s)`);
    } catch (err) {
      setError(err.message);
      console.error('Failed to generate timetables:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetTeacher = async (teacher, day, slot) => {
    if (timetables.length === 0) return;

    const currentTimetableData = timetables[currentTimetable];
    if (!currentTimetableData) return;

    setLoading(true);
    try {
      const resetResult = await TimetableAPI.resetTeacher(
        inputData,
        currentTimetableData.data.timetable,
        teacher,
        day,
        slot
      );

      // Update the current timetable with the reset result
      const updatedTimetables = [...timetables];
      updatedTimetables[currentTimetable] = {
        ...currentTimetableData,
        data: {
          ...currentTimetableData.data,
          timetable: resetResult.timetable
        },
        name: `${currentTimetableData.name} (Modified)`
      };

      setTimetables(updatedTimetables);
    } catch (err) {
      setError(`Failed to reset teacher: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportTimetable = (timetableData, format = 'json') => {
    const dataStr = JSON.stringify(timetableData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `timetable_${timetableData.name.replace(/\s+/g, '_')}.${format}`;
    link.click();
  };

  const compareTimetables = () => {
    if (timetables.length < 2) return null;

    return (
      <div className="comparison-metrics">
        <h3>📊 Comparison Metrics</h3>
        <div className="metrics-grid">
          {timetables.map((tt, index) => (
            <div key={index} className="metric-card">
              <h4>{tt.name}</h4>
              <div className="metric-item">
                <span>Utilization:</span>
                <span>{tt.data.statistics?.utilization_percentage?.toFixed(1) || 0}%</span>
              </div>
              <div className="metric-item">
                <span>Slots Used:</span>
                <span>{tt.data.statistics?.total_slots_used || 0}</span>
              </div>
              <div className="metric-item">
                <span>Unfulfilled:</span>
                <span className={Object.keys(tt.data.unfulfilled || {}).length > 0 ? 'unfulfilled' : 'fulfilled'}>
                  {Object.keys(tt.data.unfulfilled || {}).length}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="multiple-timetable-generator">
      <div className="generator-header">
        <h2>🚀 Multiple Timetable Generator</h2>
        <p>Generate multiple timetable variations to compare and choose the best option</p>
      </div>

      <div className="generation-controls">
        <div className="control-group">
          <label htmlFor="generation-count">Number of variations to generate:</label>
          <select
            id="generation-count"
            value={generationCount}
            onChange={(e) => setGenerationCount(parseInt(e.target.value))}
            disabled={loading}
          >
            <option value={2}>2 Variations</option>
            <option value={3}>3 Variations</option>
            <option value={4}>4 Variations</option>
            <option value={5}>5 Variations</option>
          </select>
        </div>

        <button
          onClick={generateMultipleTimetables}
          disabled={loading || !inputData}
          className="generate-btn"
        >
          {loading ? (
            <>
              <span className="loading-spinner">⏳</span>
              Generating...
            </>
          ) : (
            <>
              <span className="generate-icon">🎯</span>
              Generate {generationCount} Timetables
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">❌</span>
          {error}
        </div>
      )}

      {timetables.length > 0 && (
        <>
          <div className="timetable-navigation">
            <div className="nav-tabs">
              {timetables.map((tt, index) => (
                <button
                  key={index}
                  className={`tab ${currentTimetable === index ? 'active' : ''}`}
                  onClick={() => setCurrentTimetable(index)}
                >
                  <span className="tab-icon">📋</span>
                  {tt.name}
                  <span className="utilization-badge">
                    {tt.data.statistics?.utilization_percentage?.toFixed(0) || 0}%
                  </span>
                </button>
              ))}
            </div>

            <div className="timetable-actions">
              <button
                onClick={() => exportTimetable(timetables[currentTimetable])}
                className="action-btn export-btn"
              >
                <span className="action-icon">💾</span>
                Export
              </button>
            </div>
          </div>

          {compareTimetables()}

          <div className="current-timetable">
            <TimetableDisplay
              timetableData={timetables[currentTimetable]?.data}
              inputData={inputData}
              onResetTeacher={handleResetTeacher}
            />
          </div>

          <div className="generation-summary">
            <h3>📈 Generation Summary</h3>
            <div className="summary-stats">
              <div className="summary-item">
                <strong>Generated:</strong> {timetables.length} timetable(s)
              </div>
              <div className="summary-item">
                <strong>Best Utilization:</strong> 
                {Math.max(...timetables.map(tt => tt.data.statistics?.utilization_percentage || 0)).toFixed(1)}%
              </div>
              <div className="summary-item">
                <strong>Generated At:</strong> 
                {new Date(timetables[currentTimetable]?.generated_at).toLocaleString()}
              </div>
            </div>
          </div>
        </>
      )}

      {!inputData && (
        <div className="no-input-message">
          <span className="info-icon">ℹ️</span>
          Please configure your classes, subjects, and constraints in the form above to generate timetables.
        </div>
      )}
    </div>
  );
};

export default MultipleTimetableGenerator;