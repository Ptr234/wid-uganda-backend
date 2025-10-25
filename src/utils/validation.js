const validator = require('joi');

// Email validation
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation (8+ chars, uppercase, lowercase, number, special char)
const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// UUID validation
const validateUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Phone number validation (Uganda format)
const validateUgandaPhone = (phone) => {
  // Uganda phone formats: +256..., 0..., 256...
  const phoneRegex = /^(\+256|256|0)?[0-9]{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Sanitize search query
const sanitizeSearchQuery = (query) => {
  return query.replace(/[%_\\]/g, '\\$&').trim();
};

// Joi schemas for complex validation
const schemas = {
  user: validator.object({
    email: validator.string().email().required(),
    password: validator.string().min(8).required(),
    full_name: validator.string().min(2).max(100).required(),
    role: validator.string().valid('client', 'supplier', 'designer', 'admin').default('client'),
  }),

  profile: validator.object({
    phone: validator.string().pattern(/^(\+256|256|0)?[0-9]{9}$/),
    location: validator.string().max(100),
    bio: validator.string().max(500),
    website: validator.string().uri(),
  }),

  project: validator.object({
    title: validator.string().min(3).max(200).required(),
    description: validator.string().min(10).max(2000).required(),
    budget_min: validator.number().min(0),
    budget_max: validator.number().min(0),
    deadline: validator.date().greater('now'),
    category: validator.string().required(),
    skills_required: validator.array().items(validator.string()),
  }),

  message: validator.object({
    content: validator.string().min(1).max(2000).required(),
    conversation_id: validator.string().uuid().required(),
  }),
};

// Validate request body against schema
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }
    
    req.validated = value;
    next();
  };
};

module.exports = {
  validateEmail,
  validatePassword,
  validateUUID,
  validateUgandaPhone,
  sanitizeSearchQuery,
  schemas,
  validateRequest,
};