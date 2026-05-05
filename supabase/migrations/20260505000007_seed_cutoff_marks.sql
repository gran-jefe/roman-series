-- Seed sample cutoff marks for demo
-- Get university IDs from the universities table
-- Adjust the UUIDs below to match universities in your database

-- For demo purposes, using placeholder UUIDs
-- Replace with actual university IDs from your database

-- University of Lagos (UI) - assuming this exists
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Medicine', 2025, 280, 60, 40, 72.5, 'Based on 2024 cutoff'
FROM universities WHERE name ILIKE '%Lagos%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Law', 2025, 240, 60, 40, 65.0, 'Based on 2024 cutoff'
FROM universities WHERE name ILIKE '%Lagos%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Engineering', 2025, 220, 60, 40, 60.0, 'Based on 2024 cutoff'
FROM universities WHERE name ILIKE '%Lagos%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Nursing', 2025, 200, 60, 40, 55.0, 'Based on 2024 cutoff'
FROM universities WHERE name ILIKE '%Lagos%' LIMIT 1
ON CONFLICT DO NOTHING;

-- University of Ibadan (UI) if exists
INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Medicine', 2025, 285, 60, 40, 74.0, 'Based on 2024 cutoff'
FROM universities WHERE name ILIKE '%Ibadan%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO cutoff_marks (university_id, course, year, utme_cutoff, utme_weight, putme_weight, combined_cutoff, notes)
SELECT id, 'Engineering', 2025, 225, 60, 40, 61.0, 'Based on 2024 cutoff'
FROM universities WHERE name ILIKE '%Ibadan%' LIMIT 1
ON CONFLICT DO NOTHING;

-- Note: To add more cutoff marks, use the admin endpoint:
-- POST /api/admin/cutoff-marks with body:
-- {
--   "university_id": "UUID",
--   "course": "Medicine",
--   "year": 2025,
--   "utme_cutoff": 280,
--   "utme_weight": 60,
--   "putme_weight": 40,
--   "combined_cutoff": 72.5,
--   "notes": "Based on 2024 cutoff"
-- }
