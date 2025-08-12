-- Fix the task data: make some tasks floating (not anchored)
-- Keep some key milestone tasks as anchored but make development tasks floating

UPDATE public.tasks 
SET is_anchored = false
WHERE goal_id = '72f106e6-a849-4dd3-81a3-54198443239f' 
  AND title IN (
    'Complete remaining development tasks',
    'Create app store assets', 
    'Conduct internal testing',
    'Gather beta testers',
    'Fix identified bugs',
    'Plan marketing launch',
    'Gather initial user feedback'
  );

-- Keep these as anchored (key deadlines):
-- 'Set up Google Play Developer account' 
-- 'Submit app for review'
-- 'Monitor review status'