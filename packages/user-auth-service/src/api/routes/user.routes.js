const express = require('express');
const { body, validationResult } = require('express-validator');
const UserService = require('../../services/user.service');
const router = express.Router();

// Single endpoint: User Registration
router.post('/register', [
  // Simple validation
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Call service to register user
    const result = await UserService.registerUser({
      email: req.body.email,
      password: req.body.password,
      firstName: req.body.firstName,
      lastName: req.body.lastName
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: result.id,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        createdAt: result.createdAt
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific errors
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router; 