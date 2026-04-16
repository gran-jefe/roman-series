-- Seed data for Roman Series database
-- Insert universities and subjects

-- Universities
INSERT INTO universities (name, short_code, colour_token) VALUES
  ('University of Ibadan', 'UI', 'navy'),
  ('Obafemi Awolowo University', 'OAU', 'deep-blue'),
  ('University of Lagos', 'UNILAG', 'forest'),
  ('Ahmadu Bello University', 'ABU', 'ember'),
  ('Federal University of Technology Akure', 'FUTA', 'english'),
  ('University of Nigeria', 'UNN', 'physics'),
  ('University of Benin', 'UNIBEN', 'biology'),
  ('Federal University of Health Sciences Otukpo', 'FUHSI', 'chemistry'),
  ('Ladoke Akintola University of Technology', 'LAUTECH', 'literature')
ON CONFLICT (short_code) DO NOTHING;

-- Subjects
INSERT INTO subjects (name, colour_token) VALUES
  ('Use of English', 'english'),
  ('Biology', 'biology'),
  ('Chemistry', 'chemistry'),
  ('Physics', 'physics'),
  ('Government', 'government'),
  ('Literature', 'literature'),
  ('C.R.S.', 'crs'),
  ('I.R.S.', 'irs')
ON CONFLICT DO NOTHING;
