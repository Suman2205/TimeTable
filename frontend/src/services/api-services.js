// services/api.js
const API_BASE_URL = 'http://localhost:5000';

export class TimetableAPI {
  static async generateTimetable(inputData) {
    try {
      const response = await fetch(`${API_BASE_URL}/generate_timetable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(inputData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  static async validateInput(inputData) {
    try {
      const response = await fetch(`${API_BASE_URL}/validate_input`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(inputData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Validation API Error:', error);
      throw error;
    }
  }

  static async resetTeacher(inputData, timetable, teacher, day, slot) {
    try {
      const response = await fetch(`${API_BASE_URL}/reset_teacher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          teacher,
          day,
          slot,
          inputData,
          timetable
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error('Reset Teacher API Error:', error);
      throw error;
    }
  }

  static async generateMultipleTimetables(inputData, count = 3) {
    const results = [];
    const errors = [];

    for (let i = 0; i < count; i++) {
      try {
        console.log(`Generating timetable variation ${i + 1}/${count}...`);
        
        // Add some randomization to get different results
        const modifiedInputData = {
          ...inputData,
          _generation_seed: Math.random() * 1000,
          _variation: i + 1
        };

        const result = await this.generateTimetable(modifiedInputData);
        results.push({
          id: i + 1,
          name: `Version ${i + 1}`,
          data: result,
          generated_at: new Date().toISOString()
        });

        // Small delay between generations to ensure different randomization
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        errors.push({
          variation: i + 1,
          error: error.message
        });
      }
    }

    return { results, errors };
  }
}