const express = require('express');
const { DatabaseService } = require('../config/database');
const auth = require('../middleware/auth');
const { validateRequest, schemas } = require('../utils/validation');

const router = express.Router();

// Get all users (admin only)
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.id, u.email, u.full_name, u.role, u.is_verified, u.created_at,
             p.phone, p.location, p.verification_status
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      query += ` AND u.role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await DatabaseService.query(query, params);
    
    // Get total count
    const countResult = await DatabaseService.query(
      'SELECT COUNT(*) FROM users WHERE 1=1' + 
      (search ? ' AND (full_name ILIKE $1 OR email ILIKE $1)' : '') +
      (role ? ` AND role = $${search ? 2 : 1}` : ''),
      search && role ? [`%${search}%`, role] : 
      search ? [`%${search}%`] : 
      role ? [role] : []
    );

    res.json({
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user profile
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await DatabaseService.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.is_verified, u.created_at,
              p.phone, p.location, p.bio, p.avatar_url, p.verification_status,
              p.website, p.linkedin_url, p.portfolio_url
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
router.put('/profile', auth, validateRequest(schemas.profile), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { phone, location, bio, website, linkedin_url, portfolio_url } = req.validated;

    const result = await DatabaseService.query(
      `INSERT INTO user_profiles (user_id, phone, location, bio, website, linkedin_url, portfolio_url, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         phone = EXCLUDED.phone,
         location = EXCLUDED.location,
         bio = EXCLUDED.bio,
         website = EXCLUDED.website,
         linkedin_url = EXCLUDED.linkedin_url,
         portfolio_url = EXCLUDED.portfolio_url,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [userId, phone, location, bio, website, linkedin_url, portfolio_url]
    );

    res.json({
      message: 'Profile updated successfully',
      profile: result.rows[0],
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;