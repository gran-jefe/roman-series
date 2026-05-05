-- Migration: Add utme_score column to profiles table
-- Created: 2026-05-05
-- Description: Adds UTME score field to track student's UTME performance for prediction

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS utme_score INT;

-- Add constraint to ensure UTME score is between 0-400
ALTER TABLE profiles
ADD CONSTRAINT utme_score_range CHECK (utme_score IS NULL OR (utme_score >= 0 AND utme_score <= 400));
