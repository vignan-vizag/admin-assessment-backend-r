const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Admin login
const adminLogin = async (req, res, next) => {
  console.log('Admin Login Started');
  const { username, password } = req.body;

  try {
    // Find admin by username
    const admin = await Admin.findOne({ username });
    if (!admin) {
      console.log('Admin not found');
      return res.status(404).json({ message: 'Invalid credentials' });
    }

    // Check password
    const passwordMatch = await admin.comparePassword(password);
    console.log('Password Match Result:', passwordMatch);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        adminId: admin._id, 
        username: admin.username, 
        role: admin.role,
        type: 'admin'
      }, 
      process.env.SECRET_KEY, 
      { expiresIn: '8h' } // Longer session for admin
    );

    res.json({ 
      token, 
      admin: {
        id: admin._id,
        username: admin.username,
        role: admin.role
      },
      message: 'Admin login successful'
    });
  } catch (error) {
    console.error('Error during admin login:', error);
    next(error);
  }
};

// Create default admin accounts (for initial setup)
const createDefaultAdmins = async () => {
  try {
    const adminCount = await Admin.countDocuments();
    
    if (adminCount === 0) {
      console.log('Creating default admin accounts...');
      
      const defaultAdmins = [
        {
          username: 'principal-viit',
          password: 'principal-viit',
          role: 'principal'
        },
        {
          username: 'csehod-viit',
          password: 'csehod-viit',
          role: 'hod'
        }
      ];

      for (const adminData of defaultAdmins) {
        const admin = new Admin(adminData);
        await admin.save();
        console.log(`Created admin: ${adminData.username}`);
      }
      
      console.log('Default admin accounts created successfully!');
    }
  } catch (error) {
    console.error('Error creating default admin accounts:', error);
  }
};

// Get admin profile
const getAdminProfile = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    res.json({ admin });
  } catch (error) {
    console.error('Error getting admin profile:', error);
    next(error);
  }
};

module.exports = { 
  adminLogin, 
  createDefaultAdmins,
  getAdminProfile
};
