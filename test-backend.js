const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Mock projects endpoint
app.post('/api/projects', (req, res) => {
  console.log('Received project creation request:');
  console.log('Headers:', req.headers);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  // Validate the payload
  const { name, description, status, priority, startDate, endDate } = req.body;
  
  if (!name) {
    return res.status(400).json({ 
      message: 'Name is required',
      statusCode: 400 
    });
  }
  
  // Check for forbidden properties
  const forbiddenProps = ['phases', 'methodology', 'selectedPhases'];
  const hasForbiddenProps = forbiddenProps.some(prop => prop in req.body);
  
  if (hasForbiddenProps) {
    return res.status(400).json({ 
      message: 'Invalid properties detected',
      statusCode: 400,
      details: `Properties not allowed: ${forbiddenProps.filter(prop => prop in req.body).join(', ')}`
    });
  }
  
  // Check priority enum
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ 
      message: 'Invalid priority value',
      statusCode: 400,
      details: `Priority must be one of: ${validPriorities.join(', ')}`
    });
  }
  
  // Success response
  res.status(201).json({
    id: 'test-project-' + Date.now(),
    name,
    description,
    status: status || 'planning',
    priority: priority || 'medium',
    startDate,
    endDate,
    createdAt: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Test backend running on http://localhost:${PORT}`);
  console.log('Ready to test project creation...');
});
