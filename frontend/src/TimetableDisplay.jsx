import React, { useState } from 'react';
import './TimetableDisplay.css';

const TimetableDisplay = ({ timetableData, inputData, onResetTeacher }) => {
  const [selectedSection, setSelectedSection] = useState('all');
  
  if (!timetableData || !timetableData.timetable) {
    return null;
  }

  // Group timetable data by section
  const groupedData = timetableData.timetable.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = {};
    }
    if (!acc[item.section][item.day]) {
      acc[item.section][item.day] = {};
    }
    if (!acc[item.section][item.day][item.slot]) {
      acc[item.section][item.day][item.slot] = [];
    }
    acc[item.section][item.day][item.slot].push(item);
    return acc;
  }, {});

  const sections = Object.keys(groupedData).sort();
  const days = inputData.days || [];
  const slots = inputData.slots || [];

  // Get lab subjects for a specific section
  const getSectionLabSubjects = (sectionName) => {
    for (const classInfo of inputData.classes || []) {
      const fullSectionNames = classInfo.sections?.map(section => {
        return section.name ? `${classInfo.name} - ${section.name}` : classInfo.name;
      }) || [];
      
      if (fullSectionNames.includes(sectionName)) {
        return classInfo.lab_subjects || [];
      }
    }
    return [];
  };

  const handleTeacherReset = (teacher, day, slot) => {
    if (onResetTeacher) {
      onResetTeacher(teacher, day, slot);
    }
  };

  const renderCell = (section, day, slot) => {
    const slotItems = groupedData[section]?.[day]?.[slot] || [];
    
    if (slot === 'Lunch Break') {
      return (
        <td key={slot} className="lunch-cell">
          🍽️ LUNCH
        </td>
      );
    }

    if (slotItems.length === 0) {
      return (
        <td key={slot} className="empty-cell">
          -
        </td>
      );
    }

    const sectionLabSubjects = getSectionLabSubjects(section);
    const labs = slotItems.filter(item => sectionLabSubjects.includes(item.subject));
    const nonLabs = slotItems.filter(item => !sectionLabSubjects.includes(item.subject) && item.subject !== 'Workshop');
    const workshops = slotItems.filter(item => item.subject === 'Workshop');

    const isMovedSlot = slotItems.some(item => item.moved);
    const cellClass = `timetable-cell ${isMovedSlot ? 'moved-slot' : ''}`;

    return (
      <td key={slot} className={cellClass}>
        {labs.length > 0 && (
          <div className="lab-entries">
            {labs.map((lab, index) => (
              <div key={index} className="lab-entry">
                <div className="lab-header">
                  <span className="group-label">{lab.group || 'A?'}:</span>
                  <strong>{lab.subject}</strong>
                </div>
                <div className="lab-details">
                  <span className="room">🏛️ {lab.room || 'TBA'}</span>
                  <span 
                    className="teacher clickable"
                    onClick={() => handleTeacherReset(lab.teacher, day, slot)}
                    title={`Click to reset ${lab.teacher}`}
                  >
                    👨‍🏫 {lab.teacher || 'TBA'}
                  </span>
                </div>
                {lab.moved_from && (
                  <div className="moved-indicator">
                    📍 moved from {lab.moved_from}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {nonLabs.length > 0 && (
          <div className="theory-entries">
            {nonLabs.map((theory, index) => (
              <div key={index} className="theory-entry">
                <div className="theory-header">
                  <strong>{theory.subject}</strong>
                </div>
                <div className="theory-details">
                  <span className="room">🏛️ {theory.room || 'TBA'}</span>
                  <span 
                    className="teacher clickable"
                    onClick={() => handleTeacherReset(theory.teacher, day, slot)}
                    title={`Click to reset ${theory.teacher}`}
                  >
                    👨‍🏫 {theory.teacher || 'TBA'}
                  </span>
                </div>
                {theory.moved_from && (
                  <div className="moved-indicator">
                    📍 moved from {theory.moved_from}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {workshops.length > 0 && (
          <div className="workshop-entries">
            {workshops.map((workshop, index) => (
              <div key={index} className="workshop-entry">
                🛠️ Workshop
                {workshop.moved_from && (
                  <div className="moved-indicator">
                    📍 moved from {workshop.moved_from}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </td>
    );
  };

  const sectionsToDisplay = selectedSection === 'all' ? sections : [selectedSection];

  return (
    <div className="timetable-display">
      <div className="timetable-header">
        <h2>📅 Generated Timetable</h2>
        
        {/* Section Filter */}
        <div className="section-filter">
          <label htmlFor="section-select">View Section:</label>
          <select 
            id="section-select"
            value={selectedSection} 
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            <option value="all">All Sections</option>
            {sections.map(section => (
              <option key={section} value={section}>{section}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics Summary */}
      {timetableData.statistics && (
        <div className="statistics-summary">
          <div className="stat-item">
            <strong>Classes:</strong> {timetableData.statistics.total_classes}
          </div>
          <div className="stat-item">
            <strong>Sections:</strong> {timetableData.statistics.total_sections}
          </div>
          <div className="stat-item">
            <strong>Utilization:</strong> {timetableData.statistics.utilization_percentage?.toFixed(1)}%
          </div>
          <div className="stat-item">
            <strong>Slots Used:</strong> {timetableData.statistics.total_slots_used}/{timetableData.statistics.total_slots_available}
          </div>
        </div>
      )}

      {/* Timetable Tables */}
      <div className="timetable-sections">
        {sectionsToDisplay.map(section => (
          <div key={section} className="section-timetable">
            <div className="section-header">
              <h3>📚 {section}</h3>
            </div>
            
            <div className="table-container">
              <table className="timetable-table">
                <thead>
                  <tr>
                    <th className="day-header">Day / Time</th>
                    {slots.map(slot => (
                      <th key={slot} className="slot-header">{slot}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {days.map(day => (
                    <tr key={day}>
                      <td className="day-cell">
                        <strong>{day}</strong>
                      </td>
                      {slots.map(slot => renderCell(section, day, slot))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Warnings and Unfulfilled Requirements */}
      {timetableData.validation_warnings && timetableData.validation_warnings.length > 0 && (
        <div className="warnings-section">
          <h4>⚠️ Warnings</h4>
          <ul>
            {timetableData.validation_warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {timetableData.unfulfilled && Object.keys(timetableData.unfulfilled).length > 0 && (
        <div className="unfulfilled-section">
          <h4>❌ Unfulfilled Requirements</h4>
          {Object.entries(timetableData.unfulfilled).map(([section, subjects]) => (
            <div key={section} className="unfulfilled-section-item">
              <strong>{section}:</strong>
              <ul>
                {Object.entries(subjects).map(([subject, count]) => (
                  <li key={subject}>{subject}: {count} lectures missing</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimetableDisplay;