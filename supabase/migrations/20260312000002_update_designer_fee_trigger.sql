-- Update the designer fee calculation trigger to also run on PRICE or ACCOUNT_ID updates
-- This ensures that if an admin edits the price, the freelancer's fee is recalculated correctly

DROP TRIGGER IF EXISTS trg_calculate_designer_fee ON projects;

CREATE TRIGGER trg_calculate_designer_fee
BEFORE INSERT OR UPDATE OF price, account_id ON projects
FOR EACH ROW
EXECUTE FUNCTION calculate_project_designer_fee();
