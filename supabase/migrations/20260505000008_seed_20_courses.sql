-- Seed 20+ courses across multiple universities with different subject combinations
-- This creates cutoff marks for various fields of study

-- Medicine (Science subjects: Biology, Chemistry, Physics, English)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Medicine', 2025, 280, 60, 40, 72.5, '2024 baseline'
FROM universities WHERE name ILIKE '%Lagos%' OR name ILIKE '%Ibadan%' OR name ILIKE '%ABU%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- Law (Arts subjects: Government, Literature, CRS/IRS, English)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Law', 2025, 240, 60, 40, 65.0, '2024 baseline'
FROM universities WHERE name ILIKE '%Lagos%' OR name ILIKE '%Ibadan%' OR name ILIKE '%OAU%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- Engineering (Science: Physics, Chemistry, Biology, Math)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Engineering', 2025, 220, 60, 40, 60.0, '2024 baseline'
FROM universities WHERE name ILIKE '%Lagos%' OR name ILIKE '%Ibadan%' OR name ILIKE '%FUTA%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- Nursing (Science: Biology, Chemistry, Physics, English)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Nursing', 2025, 200, 60, 40, 55.0, '2024 baseline'
FROM universities WHERE name ILIKE '%Lagos%' OR name ILIKE '%Ibadan%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- Pharmacy (Science: Chemistry, Biology, Physics, English)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Pharmacy', 2025, 260, 60, 40, 68.0, '2024 baseline'
FROM universities WHERE name ILIKE '%Lagos%' OR name ILIKE '%Ibadan%' OR name ILIKE '%OAU%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- Architecture (Science: Physics, Chemistry, Biology, Math)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Architecture', 2025, 230, 60, 40, 62.0, '2024 baseline'
FROM universities WHERE name ILIKE '%Lagos%' OR name ILIKE '%Ibadan%' OR name ILIKE '%FUTA%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- Computer Science (Science: Physics, Chemistry, Biology, Math)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Computer Science', 2025, 210, 60, 40, 58.0, '2024 baseline'
FROM universities WHERE name ILIKE '%Lagos%' OR name ILIKE '%Ibadan%' OR name ILIKE '%ABU%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- Business Administration (Social Sciences)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Business Administration', 2025, 180, 60, 40, 50.0, '2024 baseline'
FROM universities WHERE name ILIKE '%Lagos%' OR name ILIKE '%OAU%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- Accounting (Social Sciences)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Accounting', 2025, 190, 60, 40, 52.0, '2024 baseline'
FROM universities WHERE name ILIKE '%Lagos%' OR name ILIKE '%Ibadan%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- Economics (Social Sciences)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Economics', 2025, 170, 60, 40, 48.0, '2024 baseline'
FROM universities WHERE name ILIKE '%Ibadan%' OR name ILIKE '%OAU%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- Political Science (Social Sciences/Arts)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Political Science', 2025, 160, 60, 40, 46.0, '2024 baseline'
FROM universities WHERE name ILIKE '%Ibadan%' OR name ILIKE '%OAU%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- Psychology (Science/Social Sciences)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Psychology', 2025, 195, 60, 40, 54.0, '2024 baseline'
FROM universities WHERE name ILIKE '%Lagos%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- Dentistry (Science: Biology, Chemistry, Physics, English)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Dentistry', 2025, 270, 60, 40, 70.0, '2024 baseline'
FROM universities WHERE name ILIKE '%Lagos%' OR name ILIKE '%Ibadan%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- Veterinary Medicine (Science: Biology, Chemistry, Physics, English)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Veterinary Medicine', 2025, 250, 60, 40, 67.0, '2024 baseline'
FROM universities WHERE name ILIKE '%Ibadan%' OR name ILIKE '%ABU%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- Agriculture (Science: Biology, Chemistry, Physics, Math)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Agriculture', 2025, 180, 60, 40, 50.0, '2024 baseline'
FROM universities WHERE name ILIKE '%Ibadan%' OR name ILIKE '%ABU%' OR name ILIKE '%FUTA%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- Mechanical Engineering (Science: Physics, Chemistry, Biology, Math)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Mechanical Engineering', 2025, 225, 60, 40, 61.0, '2024 baseline'
FROM universities WHERE name ILIKE '%FUTA%' OR name ILIKE '%Lagos%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- Electrical Engineering (Science: Physics, Chemistry, Biology, Math)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Electrical Engineering', 2025, 230, 60, 40, 62.0, '2024 baseline'
FROM universities WHERE name ILIKE '%FUTA%' OR name ILIKE '%ABU%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- Chemical Engineering (Science: Physics, Chemistry, Biology, Math)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Chemical Engineering', 2025, 228, 60, 40, 61.5, '2024 baseline'
FROM universities WHERE name ILIKE '%Lagos%' OR name ILIKE '%FUTA%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- Geology (Science: Physics, Chemistry, Biology, Math)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Geology', 2025, 190, 60, 40, 52.0, '2024 baseline'
FROM universities WHERE name ILIKE '%Ibadan%' OR name ILIKE '%ABU%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- English Language (Arts: Literature, Government, English, CRS/IRS)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'English Language', 2025, 150, 60, 40, 42.0, '2024 baseline'
FROM universities WHERE name ILIKE '%Lagos%' OR name ILIKE '%OAU%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- History (Arts: Literature, Government, History, CRS/IRS)
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'History', 2025, 140, 60, 40, 40.0, '2024 baseline'
FROM universities WHERE name ILIKE '%Ibadan%' OR name ILIKE '%OAU%'
ON CONFLICT (university_id, course, year) DO NOTHING;

-- Verify insertion - check total count
SELECT COUNT(*) as total_cutoff_marks, COUNT(DISTINCT course) as unique_courses FROM cutoff_marks;
