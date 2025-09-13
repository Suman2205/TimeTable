import React, { useState, useEffect } from 'react';
import './TimetableInputForm.css';

const TimetableInputForm = () => {
  const [inputData, setInputData] = useState({
    classes: [
      { 
        name: "", 
        subjects: [], 
        lab_subjects: [], 
        sections: [{ name: "", student_count: 0 }] 
      }
    ],
    rooms: [],
    labs: [],
    lab_rooms: {},
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    slots: [
      "9:00-9:55", "9:55-10:50", "10:50-11:45", "11:45-12:40", 
      "Lunch Break", "2:00-2:55", "2:55-3:50", "3:50-4:45"
    ],
    teachers: {},
    lab_teachers: {},
    teacher_unavailability: {},
    lecture_requirements: {},
    lab_capacity: 30,
    constraints: {
      max_lectures_per_day_teacher: 5,
      max_lectures_per_subject_per_day: 2,
      min_lectures_per_day_section: 4,
      max_lectures_per_day_section: 6,
      lab_session_duration: 2,
      distribute_across_week: true
    }
  });

  // Helper function to update nested state
  const updateNestedState = (path, value) => {
    setInputData(prev => {
      const newState = { ...prev };
      const keys = path.split('.');
      let current = newState;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newState;
    });
  };

  // Get all unique subjects from all classes
  const getAllSubjects = () => {
    const subjects = new Set();
    inputData.classes.forEach(classItem => {
      classItem.subjects.forEach(subject => subjects.add(subject));
    });
    return Array.from(subjects).filter(subject => subject.trim() !== '');
  };

  // Get all unique lab subjects from all classes
  const getAllLabSubjects = () => {
    const subjects = new Set();
    inputData.classes.forEach(classItem => {
      classItem.lab_subjects.forEach(subject => subjects.add(subject));
    });
    return Array.from(subjects).filter(subject => subject.trim() !== '');
  };

  // Get all unique teachers
  const getAllTeachers = () => {
    const teachers = new Set();
    Object.values(inputData.teachers).forEach(teacherList => {
      teacherList.forEach(teacher => {
        if (teacher.trim() !== '') teachers.add(teacher.trim());
      });
    });
    Object.values(inputData.lab_teachers).forEach(teacherList => {
      teacherList.forEach(teacher => {
        if (teacher.trim() !== '') teachers.add(teacher.trim());
      });
    });
    return Array.from(teachers);
  };

  // Auto-sync teachers with subjects and lab rooms with lab subjects
  useEffect(() => {
    const theorySubjects = getAllSubjects();
    const labSubjects = getAllLabSubjects();

    setInputData(prev => {
      const newTeachers = { ...prev.teachers };
      const newLabTeachers = { ...prev.lab_teachers };
      const newLabRooms = { ...prev.lab_rooms };

      // Add missing theory subjects
      theorySubjects.forEach(subject => {
        if (!newTeachers[subject]) {
          newTeachers[subject] = [''];
        }
      });

      // Add missing lab subjects
      labSubjects.forEach(subject => {
        if (!newLabTeachers[subject]) {
          newLabTeachers[subject] = [''];
        }
        // Initialize lab rooms for lab subjects
        if (!newLabRooms[subject]) {
          newLabRooms[subject] = [];
        }
      });

      // Remove subjects that no longer exist
      Object.keys(newTeachers).forEach(subject => {
        if (!theorySubjects.includes(subject)) {
          delete newTeachers[subject];
        }
      });

      Object.keys(newLabTeachers).forEach(subject => {
        if (!labSubjects.includes(subject)) {
          delete newLabTeachers[subject];
        }
      });

      // Remove lab room assignments for subjects that no longer exist
      Object.keys(newLabRooms).forEach(subject => {
        if (!labSubjects.includes(subject)) {
          delete newLabRooms[subject];
        }
      });

      return {
        ...prev,
        teachers: newTeachers,
        lab_teachers: newLabTeachers,
        lab_rooms: newLabRooms
      };
    });
  }, [inputData.classes]);

  // Class Management
  const addClass = () => {
    setInputData(prev => ({
      ...prev,
      classes: [...prev.classes, { 
        name: "", 
        subjects: [], 
        lab_subjects: [], 
        sections: [{ name: "", student_count: 0 }] 
      }]
    }));
  };

  const removeClass = (index) => {
    setInputData(prev => ({
      ...prev,
      classes: prev.classes.filter((_, i) => i !== index)
    }));
  };

  const updateClass = (index, field, value) => {
    setInputData(prev => ({
      ...prev,
      classes: prev.classes.map((classItem, i) => 
        i === index ? { ...classItem, [field]: value } : classItem
      )
    }));
  };

  // Subject Management for Classes
  const addSubjectToClass = (classIndex, isLab = false) => {
    const field = isLab ? 'lab_subjects' : 'subjects';
    setInputData(prev => ({
      ...prev,
      classes: prev.classes.map((classItem, i) => 
        i === classIndex ? { 
          ...classItem, 
          [field]: [...classItem[field], ''] 
        } : classItem
      )
    }));
  };

  const updateClassSubject = (classIndex, subjectIndex, value, isLab = false) => {
    const field = isLab ? 'lab_subjects' : 'subjects';
    setInputData(prev => ({
      ...prev,
      classes: prev.classes.map((classItem, i) => 
        i === classIndex ? {
          ...classItem,
          [field]: classItem[field].map((subject, j) => 
            j === subjectIndex ? value : subject
          )
        } : classItem
      )
    }));
  };

  const removeSubjectFromClass = (classIndex, subjectIndex, isLab = false) => {
    const field = isLab ? 'lab_subjects' : 'subjects';
    setInputData(prev => ({
      ...prev,
      classes: prev.classes.map((classItem, i) => 
        i === classIndex ? {
          ...classItem,
          [field]: classItem[field].filter((_, j) => j !== subjectIndex)
        } : classItem
      )
    }));
  };

  // Section Management for Classes
  const addSectionToClass = (classIndex) => {
    setInputData(prev => ({
      ...prev,
      classes: prev.classes.map((classItem, i) => 
        i === classIndex ? {
          ...classItem,
          sections: [...classItem.sections, { name: "", student_count: 0 }]
        } : classItem
      )
    }));
  };

  const updateSection = (classIndex, sectionIndex, field, value) => {
    setInputData(prev => ({
      ...prev,
      classes: prev.classes.map((classItem, i) => 
        i === classIndex ? {
          ...classItem,
          sections: classItem.sections.map((section, j) => 
            j === sectionIndex ? { ...section, [field]: value } : section
          )
        } : classItem
      )
    }));
  };

  const removeSectionFromClass = (classIndex, sectionIndex) => {
    setInputData(prev => ({
      ...prev,
      classes: prev.classes.map((classItem, i) => 
        i === classIndex ? {
          ...classItem,
          sections: classItem.sections.filter((_, j) => j !== sectionIndex)
        } : classItem
      )
    }));
  };

  // Room Management
  const addRoom = (isLab = false) => {
    const field = isLab ? 'labs' : 'rooms';
    setInputData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const updateRoom = (index, value, isLab = false) => {
    const field = isLab ? 'labs' : 'rooms';
    setInputData(prev => ({
      ...prev,
      [field]: prev[field].map((room, i) => i === index ? value : room)
    }));
  };

  const removeRoom = (index, isLab = false) => {
    const field = isLab ? 'labs' : 'rooms';
    setInputData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  // Lab Room Assignment Management
  const toggleLabRoomAssignment = (labSubject, labRoom) => {
    setInputData(prev => {
      const currentRooms = prev.lab_rooms[labSubject] || [];
      const newRooms = currentRooms.includes(labRoom)
        ? currentRooms.filter(room => room !== labRoom)
        : [...currentRooms, labRoom];
      
      return {
        ...prev,
        lab_rooms: {
          ...prev.lab_rooms,
          [labSubject]: newRooms
        }
      };
    });
  };

  const selectAllLabRooms = (labSubject) => {
    setInputData(prev => ({
      ...prev,
      lab_rooms: {
        ...prev.lab_rooms,
        [labSubject]: [...prev.labs.filter(room => room.trim() !== '')]
      }
    }));
  };

  const clearAllLabRooms = (labSubject) => {
    setInputData(prev => ({
      ...prev,
      lab_rooms: {
        ...prev.lab_rooms,
        [labSubject]: []
      }
    }));
  };

  // Time Slot Management
  const addTimeSlot = () => {
    setInputData(prev => ({
      ...prev,
      slots: [...prev.slots, '']
    }));
  };

  const updateTimeSlot = (index, value) => {
    setInputData(prev => ({
      ...prev,
      slots: prev.slots.map((slot, i) => i === index ? value : slot)
    }));
  };

  const removeTimeSlot = (index) => {
    setInputData(prev => ({
      ...prev,
      slots: prev.slots.filter((_, i) => i !== index)
    }));
  };

  // Teacher Management
  const addTeacher = (subject, isLab = false) => {
    const field = isLab ? 'lab_teachers' : 'teachers';
    setInputData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [subject]: prev[field][subject] ? [...prev[field][subject], ''] : ['']
      }
    }));
  };

  const updateTeacher = (subject, teacherIndex, value, isLab = false) => {
    const field = isLab ? 'lab_teachers' : 'teachers';
    setInputData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [subject]: prev[field][subject].map((teacher, i) => 
          i === teacherIndex ? value : teacher
        )
      }
    }));
  };

  const removeTeacher = (subject, teacherIndex, isLab = false) => {
    const field = isLab ? 'lab_teachers' : 'teachers';
    setInputData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [subject]: prev[field][subject].filter((_, i) => i !== teacherIndex)
      }
    }));
  };

  // Teacher Unavailability Management
  const addTeacherUnavailability = (teacherName) => {
    setInputData(prev => ({
      ...prev,
      teacher_unavailability: {
        ...prev.teacher_unavailability,
        [teacherName]: prev.teacher_unavailability[teacherName] 
          ? [...prev.teacher_unavailability[teacherName], { day: '', slot: '' }]
          : [{ day: '', slot: '' }]
      }
    }));
  };

  const updateTeacherUnavailability = (teacherName, index, field, value) => {
    setInputData(prev => ({
      ...prev,
      teacher_unavailability: {
        ...prev.teacher_unavailability,
        [teacherName]: prev.teacher_unavailability[teacherName].map((unavail, i) =>
          i === index ? { ...unavail, [field]: value } : unavail
        )
      }
    }));
  };

  const removeTeacherUnavailability = (teacherName, index) => {
    setInputData(prev => ({
      ...prev,
      teacher_unavailability: {
        ...prev.teacher_unavailability,
        [teacherName]: prev.teacher_unavailability[teacherName].filter((_, i) => i !== index)
      }
    }));
  };

  const removeTeacherFromUnavailability = (teacherName) => {
    setInputData(prev => {
      const newUnavailability = { ...prev.teacher_unavailability };
      delete newUnavailability[teacherName];
      return {
        ...prev,
        teacher_unavailability: newUnavailability
      };
    });
  };

  // Generate timetable function (placeholder)
  const generateTimetable = () => {
    console.log('Generating timetable with data:', inputData);
    // Add your timetable generation logic here
  };

  return (
    <div className="timetable-input-form">
      <div className="header">
        <div className="header-content">
          <h1>Timetable Configuration</h1>
          <p className="header-description">Configure all the required parameters for timetable generation</p>
        </div>
        <div className="header-actions">
          <button onClick={generateTimetable} className="btn-primary btn-generate">
            <span className="btn-icon">🚀</span>
            <span className="btn-text">Generate Timetable</span>
          </button>
        </div>
      </div>
      
      <div className="form-container">
        {/* Classes Configuration */}
        <div className="section-wrapper">
          <div className="section-title">
            <h2><span className="title-icon">🎓</span> Classes & Subjects</h2>
            <p>Define your academic classes with their subjects and sections</p>
          </div>
          
          <div className="form-section">
            {inputData.classes.map((classItem, index) => (
              <div key={index} className="class-card">
                <div className="class-header">
                  <h4>Class {index + 1}</h4>
                  <button onClick={() => removeClass(index)} className="btn-remove">
                    <span className="btn-icon">×</span>
                    <span className="btn-text">Remove</span>
                  </button>
                </div>
                
                {/* Class Name */}
                <div className="class-name-section">
                  <div className="form-group">
                    <label>Class Name:</label>
                    <input
                      type="text"
                      value={classItem.name}
                      onChange={(e) => updateClass(index, 'name', e.target.value)}
                      placeholder="e.g., CSE 3rd Year, ECE 2nd Year"
                    />
                  </div>
                </div>

                {/* Subjects */}
                <div className="subjects-container">
                  <div className="subject-group">
                    <label className="subject-label">
                      <span className="label-icon">📚</span>
                      Theory Subjects:
                    </label>
                    <div className="subjects-list">
                      {classItem.subjects.map((subject, subIndex) => (
                        <div key={subIndex} className="subject-input">
                          <input
                            type="text"
                            value={subject}
                            onChange={(e) => updateClassSubject(index, subIndex, e.target.value)}
                            placeholder="Subject name"
                          />
                          <button onClick={() => removeSubjectFromClass(index, subIndex)} className="btn-remove-small">×</button>
                        </div>
                      ))}
                      <button onClick={() => addSubjectToClass(index)} className="btn-add-small">
                        <span className="btn-icon">+</span>
                        <span className="btn-text">Add Theory Subject</span>
                      </button>
                    </div>
                  </div>

                  <div className="subject-group">
                    <label className="subject-label">
                      <span className="label-icon">🔬</span>
                      Lab Subjects:
                    </label>
                    <div className="subjects-list">
                      {classItem.lab_subjects.map((subject, subIndex) => (
                        <div key={subIndex} className="subject-input">
                          <input
                            type="text"
                            value={subject}
                            onChange={(e) => updateClassSubject(index, subIndex, e.target.value, true)}
                            placeholder="Lab subject name"
                          />
                          <button onClick={() => removeSubjectFromClass(index, subIndex, true)} className="btn-remove-small">×</button>
                        </div>
                      ))}
                      <button onClick={() => addSubjectToClass(index, true)} className="btn-add-small">
                        <span className="btn-icon">+</span>
                        <span className="btn-text">Add Lab Subject</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sections */}
                <div className="sections-container">
                  <div className="sections-header">
                    <h5>
                      <span className="label-icon">📋</span>
                      Sections for this Class:
                    </h5>
                    <button onClick={() => addSectionToClass(index)} className="btn-add-small">
                      <span className="btn-icon">+</span>
                      <span className="btn-text">Add Section</span>
                    </button>
                  </div>
                  <div className="sections-grid">
                    {classItem.sections.map((section, sectionIndex) => (
                      <div key={sectionIndex} className="section-item">
                        <div className="section-inputs">
                          <div className="form-group">
                            <label>Section Name:</label>
                            <input
                              type="text"
                              value={section.name}
                              onChange={(e) => updateSection(index, sectionIndex, 'name', e.target.value)}
                              placeholder="e.g., A, B, C"
                            />
                          </div>
                          <div className="form-group">
                            <label>Students:</label>
                            <input
                              type="number"
                              value={section.student_count}
                              onChange={(e) => updateSection(index, sectionIndex, 'student_count', parseInt(e.target.value) || 0)}
                              placeholder="Count"
                            />
                          </div>
                        </div>
                        <button 
                          onClick={() => removeSectionFromClass(index, sectionIndex)} 
                          className="btn-remove-small"
                          title="Remove section"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addClass} className="btn-add">
              <span className="btn-icon">+</span>
              <span className="btn-text">Add New Class</span>
            </button>
          </div>
        </div>

        {/* Rooms & Labs Configuration */}
        <div className="section-wrapper">
          <div className="section-title">
            <h2><span className="title-icon">🏫</span> Rooms & Laboratories</h2>
            <p>Configure available rooms and laboratory facilities</p>
          </div>
          
          <div className="form-section">
            <div className="rooms-labs-container">
              <div className="room-group">
                <h4><span className="label-icon">🏛️</span> Theory Rooms</h4>
                <div className="rooms-list">
                  {inputData.rooms.map((room, index) => (
                    <div key={index} className="room-input">
                      <input
                        type="text"
                        value={room}
                        onChange={(e) => updateRoom(index, e.target.value)}
                        placeholder="Room number/name"
                      />
                      <button onClick={() => removeRoom(index)} className="btn-remove-small">×</button>
                    </div>
                  ))}
                  <button onClick={() => addRoom()} className="btn-add-small">
                    <span className="btn-icon">+</span>
                    <span className="btn-text">Add Theory Room</span>
                  </button>
                </div>
              </div>
              
              <div className="room-group">
                <h4><span className="label-icon">🔬</span> Lab Rooms</h4>
                <div className="rooms-list">
                  {inputData.labs.map((lab, index) => (
                    <div key={index} className="room-input">
                      <input
                        type="text"
                        value={lab}
                        onChange={(e) => updateRoom(index, e.target.value, true)}
                        placeholder="Lab room number/name"
                      />
                      <button onClick={() => removeRoom(index, true)} className="btn-remove-small">×</button>
                    </div>
                  ))}
                  <button onClick={() => addRoom(true)} className="btn-add-small">
                    <span className="btn-icon">+</span>
                    <span className="btn-text">Add Lab Room</span>
                  </button>
                </div>
              </div>

              <div className="lab-capacity-group">
                <div className="form-group">
                  <label><span className="label-icon">👥</span> Lab Capacity (Students):</label>
                  <input
                    type="number"
                    value={inputData.lab_capacity}
                    onChange={(e) => setInputData(prev => ({...prev, lab_capacity: parseInt(e.target.value) || 30}))}
                    placeholder="30"
                  />
                </div>
              </div>
            </div>

            {/* Lab Room Assignments */}
            <div className="lab-room-assignments">
              <h4><span className="label-icon">🔗</span> Lab Room Assignments</h4>
              <p className="assignment-description">Assign specific lab rooms to each lab subject</p>
              
              {getAllLabSubjects().length > 0 && inputData.labs.filter(lab => lab.trim() !== '').length > 0 ? (
                <div className="lab-assignments-container">
                  {getAllLabSubjects().map(labSubject => (
                    <div key={labSubject} className="lab-assignment-card">
                      <div className="lab-assignment-header">
                        <h5><span className="label-icon">🧪</span> {labSubject}</h5>
                        <div className="assignment-actions">
                          <button 
                            onClick={() => selectAllLabRooms(labSubject)} 
                            className="btn-select-all"
                            title="Select all lab rooms"
                          >
                            <span className="btn-icon">✓</span>
                            <span className="btn-text">Select All</span>
                          </button>
                          <button 
                            onClick={() => clearAllLabRooms(labSubject)} 
                            className="btn-clear-all"
                            title="Clear all selections"
                          >
                            <span className="btn-icon">×</span>
                            <span className="btn-text">Clear All</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="lab-rooms-grid">
                        {inputData.labs.filter(lab => lab.trim() !== '').map(labRoom => (
                          <div key={labRoom} className="lab-room-checkbox">
                            <label className="checkbox-container">
                              <input
                                type="checkbox"
                                checked={(inputData.lab_rooms[labSubject] || []).includes(labRoom)}
                                onChange={() => toggleLabRoomAssignment(labSubject, labRoom)}
                              />
                              <span className="checkmark"></span>
                              <span className="room-name">{labRoom}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                      
                      <div className="assigned-rooms-summary">
                        <strong><span className="label-icon">📍</span> Assigned Rooms:</strong> 
                        {(inputData.lab_rooms[labSubject] || []).length > 0 
                          ? ` ${(inputData.lab_rooms[labSubject] || []).join(', ')}`
                          : ' None assigned'
                        }
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="info-message">
                  <span className="info-icon">ℹ️</span>
                  {getAllLabSubjects().length === 0 
                    ? "Add lab subjects to classes first to assign lab rooms."
                    : "Add lab rooms first to assign them to lab subjects."
                  }
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Schedule Configuration */}
        <div className="section-wrapper">
          <div className="section-title">
            <h2><span className="title-icon">🕒</span> Schedule & Timing</h2>
            <p>Set up working days and time slots</p>
          </div>
          
          <div className="form-section">
            <div className="schedule-container">
              <div className="schedule-group">
                <h4><span className="label-icon">📅</span> Working Days</h4>
                <div className="days-list">
                  {inputData.days.map((day, index) => (
                    <div key={index} className="day-input">
                      <input
                        type="text"
                        value={day}
                        onChange={(e) => setInputData(prev => ({
                          ...prev,
                          days: prev.days.map((d, i) => i === index ? e.target.value : d)
                        }))}
                        placeholder="Day name"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="schedule-group">
                <h4><span className="label-icon">⏰</span> Time Slots</h4>
                <div className="slots-list">
                  {inputData.slots.map((slot, index) => (
                    <div key={index} className="slot-input">
                      <input
                        type="text"
                        value={slot}
                        onChange={(e) => updateTimeSlot(index, e.target.value)}
                        placeholder="e.g., 9:00-9:55"
                      />
                      <button onClick={() => removeTimeSlot(index)} className="btn-remove-small">×</button>
                    </div>
                  ))}
                  <button onClick={addTimeSlot} className="btn-add-small">
                    <span className="btn-icon">+</span>
                    <span className="btn-text">Add Time Slot</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Teacher Assignment */}
        <div className="section-wrapper">
          <div className="section-title">
            <h2><span className="title-icon">👩‍🏫</span> Teacher Assignments</h2>
            <p>Assign teachers to subjects and labs (automatically synced with subjects)</p>
          </div>
          
          <div className="form-section">
            <div className="teachers-container">
              <div className="teacher-group">
                <h4><span className="label-icon">📖</span> Theory Subject Teachers</h4>
                <div className="subjects-teachers">
                  {getAllSubjects().length > 0 ? (
                    getAllSubjects().map(subject => (
                      <div key={subject} className="subject-teachers">
                        <h5><span className="label-icon">📚</span> {subject}</h5>
                        <div className="teachers-list">
                          {(inputData.teachers[subject] || ['']).map((teacher, index) => (
                            <div key={index} className="teacher-input">
                              <input
                                type="text"
                                value={teacher}
                                onChange={(e) => updateTeacher(subject, index, e.target.value)}
                                placeholder="Teacher name"
                              />
                              <button onClick={() => removeTeacher(subject, index)} className="btn-remove-small">×</button>
                            </div>
                          ))}
                          <button onClick={() => addTeacher(subject)} className="btn-add-small">
                            <span className="btn-icon">+</span>
                            <span className="btn-text">Add Teacher</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="info-message">
                      <span className="info-icon">ℹ️</span>
                      Add theory subjects to classes first to assign teachers.
                    </div>
                  )}
                </div>
              </div>
              
              <div className="teacher-group">
                <h4><span className="label-icon">🔬</span> Lab Subject Teachers</h4>
                <div className="subjects-teachers">
                  {getAllLabSubjects().length > 0 ? (
                    getAllLabSubjects().map(subject => (
                      <div key={subject} className="subject-teachers">
                        <h5><span className="label-icon">🧪</span> {subject}</h5>
                        <div className="teachers-list">
                          {(inputData.lab_teachers[subject] || ['']).map((teacher, index) => (
                            <div key={index} className="teacher-input">
                              <input
                                type="text"
                                value={teacher}
                                onChange={(e) => updateTeacher(subject, index, e.target.value, true)}
                                placeholder="Teacher name"
                              />
                              <button onClick={() => removeTeacher(subject, index, true)} className="btn-remove-small">×</button>
                            </div>
                          ))}
                          <button onClick={() => addTeacher(subject, true)} className="btn-add-small">
                            <span className="btn-icon">+</span>
                            <span className="btn-text">Add Teacher</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="info-message">
                      <span className="info-icon">ℹ️</span>
                      Add lab subjects to classes first to assign teachers.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Teacher Unavailability */}
        <div className="section-wrapper">
          <div className="section-title">
            <h2><span className="title-icon">🚫</span> Teacher Unavailability</h2>
            <p>Specify when teachers are not available for classes</p>
          </div>
          
          <div className="form-section">
            <div className="unavailability-container">
              {getAllTeachers().length > 0 ? (
                <div className="teachers-unavailability">
                  {getAllTeachers().map(teacher => (
                    <div key={teacher} className="teacher-unavailability-card">
                      <div className="teacher-unavailability-header">
                        <h5><span className="label-icon">👤</span> {teacher}</h5>
                        <div className="unavailability-actions">
                          <button 
                            onClick={() => addTeacherUnavailability(teacher)} 
                            className="btn-add-small"
                          >
                            <span className="btn-icon">+</span>
                            <span className="btn-text">Add Unavailability</span>
                          </button>
                          <button 
                            onClick={() => removeTeacherFromUnavailability(teacher)} 
                            className="btn-remove-small"
                            title="Remove all unavailability for this teacher"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      
                      <div className="unavailability-list">
                        {(inputData.teacher_unavailability[teacher] || []).map((unavail, index) => (
                          <div key={index} className="unavailability-item">
                            <div className="unavailability-fields">
                              <div className="form-group">
                                <label><span className="label-icon">📅</span> Day:</label>
                                <select
                                  value={unavail.day}
                                  onChange={(e) => updateTeacherUnavailability(teacher, index, 'day', e.target.value)}
                                >
                                  <option value="">Select Day</option>
                                  {inputData.days.map(day => (
                                    <option key={day} value={day}>{day}</option>
                                  ))}
                                </select>
                              </div>
                              
                              <div className="form-group">
                                <label><span className="label-icon">⏰</span> Time Slot:</label>
                                <select
                                  value={unavail.slot}
                                  onChange={(e) => updateTeacherUnavailability(teacher, index, 'slot', e.target.value)}
                                >
                                  <option value="">Select Time Slot</option>
                                  {inputData.slots.filter(slot => slot !== 'Lunch Break').map(slot => (
                                    <option key={slot} value={slot}>{slot}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            
                            <button 
                              onClick={() => removeTeacherUnavailability(teacher, index)} 
                              className="btn-remove-small"
                              title="Remove this unavailability"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        
                        {(!inputData.teacher_unavailability[teacher] || inputData.teacher_unavailability[teacher].length === 0) && (
                          <div className="no-unavailability">
                            <span className="info-icon">ℹ️</span>
                            No unavailability set for this teacher
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="info-message">
                  <span className="info-icon">ℹ️</span>
                  Add teachers to subjects first to set unavailability.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Constraints & Requirements */}
        <div className="section-wrapper">
          <div className="section-title">
            <h2><span className="title-icon">⚙️</span> Constraints & Requirements</h2>
            <p>Define scheduling rules and lecture requirements</p>
          </div>
          
          <div className="form-section">
            <div className="constraints-container">
              <div className="constraints-grid">
                <div className="constraint-card">
                  <label><span className="label-icon">👨‍🏫</span> Max Lectures per Day (Teacher):</label>
                  <input
                    type="number"
                    value={inputData.constraints.max_lectures_per_day_teacher}
                    onChange={(e) => updateNestedState('constraints.max_lectures_per_day_teacher', parseInt(e.target.value) || 5)}
                    placeholder="5"
                  />
                </div>
                
                <div className="constraint-card">
                  <label><span className="label-icon">📚</span> Max Lectures per Subject per Day:</label>
                  <input
                    type="number"
                    value={inputData.constraints.max_lectures_per_subject_per_day}
                    onChange={(e) => updateNestedState('constraints.max_lectures_per_subject_per_day', parseInt(e.target.value) || 2)}
                    placeholder="2"
                  />
                </div>
                
                <div className="constraint-card">
                  <label><span className="label-icon">📋</span> Min Lectures per Day (Section):</label>
                  <input
                    type="number"
                    value={inputData.constraints.min_lectures_per_day_section}
                    onChange={(e) => updateNestedState('constraints.min_lectures_per_day_section', parseInt(e.target.value) || 4)}
                    placeholder="4"
                  />
                </div>
                
                <div className="constraint-card">
                  <label><span className="label-icon">📊</span> Max Lectures per Day (Section):</label>
                  <input
                    type="number"
                    value={inputData.constraints.max_lectures_per_day_section}
                    onChange={(e) => updateNestedState('constraints.max_lectures_per_day_section', parseInt(e.target.value) || 6)}
                    placeholder="6"
                  />
                </div>
                
                <div className="constraint-card">
                  <label><span className="label-icon">🔬</span> Lab Session Duration (slots):</label>
                  <input
                    type="number"
                    value={inputData.constraints.lab_session_duration}
                    onChange={(e) => updateNestedState('constraints.lab_session_duration', parseInt(e.target.value) || 2)}
                    placeholder="2"
                  />
                </div>
                
                <div className="constraint-card checkbox-card">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={inputData.constraints.distribute_across_week}
                      onChange={(e) => updateNestedState('constraints.distribute_across_week', e.target.checked)}
                    />
                    <span className="label-icon">📈</span>
                    Distribute lectures across week
                  </label>
                </div>
              </div>
              
              <div className="lecture-requirements">
                <h4><span className="label-icon">📊</span> Weekly Lecture Requirements</h4>
                {[...getAllSubjects(), ...getAllLabSubjects()].length > 0 ? (
                  <div className="requirements-grid">
                    {[...getAllSubjects(), ...getAllLabSubjects()].map(subject => (
                      <div key={subject} className="requirement-item">
                        <label><span className="label-icon">📚</span> {subject}:</label>
                        <input
                          type="number"
                          value={inputData.lecture_requirements[subject] || 0}
                          onChange={(e) => setInputData(prev => ({
                            ...prev,
                            lecture_requirements: {
                              ...prev.lecture_requirements,
                              [subject]: parseInt(e.target.value) || 0
                            }
                          }))}
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-subjects">
                    <span className="info-icon">ℹ️</span>
                    Add subjects to classes first to configure lecture requirements.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="generate-section">
          <button onClick={generateTimetable} className="btn-generate-large">
            <span className="btn-icon">🚀</span>
            <span className="btn-text">Generate Timetable</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimetableInputForm;