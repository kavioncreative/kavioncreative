-- Migration: Mass project approval and clearance date update (Stephen Designs)
-- Created: 2026-04-22
-- Based on: public/Approved Projects Clearance Start Date - Stephen Designs.csv

UPDATE projects
SET 
    status = 'Approved',
    clearance_start_date = CASE project_id
        WHEN 'MAD 124060' THEN '2026-03-14'::date
        WHEN 'MOS 124081' THEN '2026-02-26'::date
        WHEN 'MOS 124236' THEN '2026-03-15'::date
        WHEN 'MEM 124251' THEN '2026-03-22'::date
        WHEN 'MOS 124621' THEN '2026-03-30'::date
        WHEN 'MOS 124689' THEN '2026-04-02'::date
        WHEN 'SEO 124831' THEN '2026-04-01'::date
        WHEN 'MOS 124821' THEN '2026-04-04'::date
        WHEN 'MOS 124943' THEN '2026-04-03'::date
        WHEN 'MAD 125043' THEN '2026-04-04'::date
        WHEN 'MAD 125060' THEN '2026-04-09'::date
        WHEN 'MOS 125091' THEN '2026-04-09'::date
        WHEN 'MOS 125112' THEN '2026-04-16'::date
        WHEN 'MOS 125429' THEN '2026-04-19'::date
        WHEN 'BOS 125114' THEN '2026-04-18'::date
        WHEN 'TOK 125306' THEN '2026-04-18'::date
        WHEN 'DEN 123220' THEN '2026-04-18'::date
        WHEN 'MAD 125218' THEN '2026-04-11'::date
        WHEN 'MAN 515945' THEN '2026-03-20'::date
        WHEN 'MAN 243435' THEN '2026-04-18'::date
        WHEN 'MAN 101161' THEN '2026-04-22'::date
        WHEN 'MAN 887888' THEN '2026-03-31'::date
        WHEN 'MAN 796434' THEN '2026-03-24'::date
        WHEN 'MAN 499578' THEN '2026-03-26'::date
        WHEN 'MAN 401438' THEN '2026-03-12'::date
        WHEN 'MAN 914743' THEN '2026-04-05'::date
        WHEN 'MAN 468725' THEN '2026-04-10'::date
    END
WHERE project_id IN (
    'MAD 124060', 'MOS 124081', 'MOS 124236', 'MEM 124251', 'MOS 124621',
    'MOS 124689', 'SEO 124831', 'MOS 124821', 'MOS 124943', 'MAD 125043',
    'MAD 125060', 'MOS 125091', 'MOS 125112', 'MOS 125429', 'BOS 125114',
    'TOK 125306', 'DEN 123220', 'MAD 125218', 'MAN 515945', 'MAN 243435',
    'MAN 101161', 'MAN 887888', 'MAN 796434', 'MAN 499578', 'MAN 401438',
    'MAN 914743', 'MAN 468725'
);
