-- Insert admin user only (since tables already exist)
-- Execute this in your Supabase SQL Editor

-- Insert admin user (password: admin123)
INSERT INTO users (email, password_hash, full_name, role) 
VALUES (
  'admin@wid-uganda.org',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'WID Uganda Admin',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- Insert sample designer
INSERT INTO users (email, password_hash, full_name, role) 
VALUES (
  'designer@wid-uganda.org',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Sample Designer',
  'designer'
) ON CONFLICT (email) DO NOTHING;