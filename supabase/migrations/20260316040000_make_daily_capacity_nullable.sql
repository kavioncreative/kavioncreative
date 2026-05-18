-- Remove default value and set existing freelancers' capacity to null to trigger the setup modal
ALTER TABLE profiles ALTER COLUMN daily_capacity DROP DEFAULT;

UPDATE profiles 
SET daily_capacity = NULL 
WHERE role = 'Freelancer';
