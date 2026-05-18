-- ============================================
-- SALES DATA IMPORT FROM SALES RECORDS.XLSX
-- ============================================

-- ============================================
-- STEP 1: Ensure all required accounts exist
-- ============================================
INSERT INTO accounts (name, prefix, display_prefix) VALUES ('ARS Account', 'ARS', 'ARS-01') ON CONFLICT (display_prefix) DO NOTHING;
INSERT INTO accounts (name, prefix, display_prefix) VALUES ('GHA Account', 'GHA', 'GHA-01') ON CONFLICT (display_prefix) DO NOTHING;
INSERT INTO accounts (name, prefix, display_prefix) VALUES ('MAN Account', 'MAN', 'MAN-01') ON CONFLICT (display_prefix) DO NOTHING;

-- NOTE: Pricing slabs are NOT touched here (they already exist in your DB).
-- If the trigger fails with "No pricing slab" for a particular price, check your slabs in Settings.

-- ============================================
-- STEP 2: Ensure platform commissions are linked to accounts
-- (so the fee trigger can find the commission rate)
-- ============================================
DO $$
DECLARE
    v_direct_id uuid;
    v_ars_id uuid;
    v_gha_id uuid;
    v_man_id uuid;
BEGIN
    -- Get or create a "Direct / Fiverr" platform commission
    SELECT id INTO v_direct_id FROM platform_commissions WHERE platform_name = 'Fiverr' LIMIT 1;
    IF v_direct_id IS NULL THEN
        INSERT INTO platform_commissions (platform_name, commission_percentage, clearance_days)
        VALUES ('Fiverr', 20, 14) RETURNING id INTO v_direct_id;
    END IF;

    -- Link to each account if not already linked
    SELECT id INTO v_ars_id FROM accounts WHERE prefix = 'ARS' LIMIT 1;
    SELECT id INTO v_gha_id FROM accounts WHERE prefix = 'GHA' LIMIT 1;
    SELECT id INTO v_man_id FROM accounts WHERE prefix = 'MAN' LIMIT 1;

    IF v_ars_id IS NOT NULL THEN
        INSERT INTO platform_commission_accounts (platform_commission_id, account_id)
        VALUES (v_direct_id, v_ars_id) ON CONFLICT DO NOTHING;
    END IF;
    IF v_gha_id IS NOT NULL THEN
        INSERT INTO platform_commission_accounts (platform_commission_id, account_id)
        VALUES (v_direct_id, v_gha_id) ON CONFLICT DO NOTHING;
    END IF;
    IF v_man_id IS NOT NULL THEN
        INSERT INTO platform_commission_accounts (platform_commission_id, account_id)
        VALUES (v_direct_id, v_man_id) ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================
-- STEP 4: Insert Projects (Sales Records)
-- NOTE: The designer_fee is auto-calculated by the trigger on INSERT.
-- NOTE: We use the original project IDs from the Excel if available.
-- ============================================

-- Row 1: instapain relief [ARS]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'ARS 100001',
    'Add',
    'instapain relief',
    'ARS',
    (SELECT id FROM accounts WHERE prefix = 'ARS' LIMIT 1),
    'puptgk',
    'Arsalan Hussain',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    40,
    'Approved',
    'Cleared',
    '2026-01-02',
    '2026-01-14',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 2: scale the contractor [ARS]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'ARS 100002',
    'Add',
    'scale the contractor',
    'ARS',
    (SELECT id FROM accounts WHERE prefix = 'ARS' LIMIT 1),
    'finnoomen',
    'Arsalan Hussain',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    30,
    'Approved',
    'Cleared',
    '2026-01-05',
    '2026-01-08',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 3: Canada Address Finder [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100003',
    'Add',
    'Canada Address Finder',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'mohab321',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    50,
    'Approved',
    'Cleared',
    '2026-01-05',
    '2026-01-12',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 4: Good Theology [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100004',
    'Add',
    'Good Theology',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'donnydondon',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    10,
    'Approved',
    'Cleared',
    '2026-01-05',
    '2026-01-08',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 5: Marysville Lux Detailing [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100005',
    'Add',
    'Marysville Lux Detailing',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'vladvlasiuk',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Samad' LIMIT 1),
    'Samad',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    25,
    'Approved',
    'Cleared',
    '2026-01-07',
    '2026-01-10',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 6: Final files [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100006',
    'Add',
    'Final files',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'markboosti',
    'Arsalan Hussain',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    10,
    'Approved',
    'Cleared',
    '2026-01-07',
    '2026-01-10',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 7: O2 Vision [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100007',
    'Add',
    'O2 Vision',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'evenomadic',
    'Taha Khan',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    100,
    'Approved',
    'Cleared',
    '2026-01-07',
    '2026-01-10',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 8: AVERTO [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100008',
    'Add',
    'AVERTO',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'urbanrnbeatz',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    10,
    'Approved',
    'Cleared',
    '2026-01-08',
    '2026-01-20',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 9: The Birdie’s Nest Creative [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100009',
    'Add',
    'The Birdie’s Nest Creative',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'keekan2',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Order Brief',
    25,
    'Approved',
    'Cleared',
    '2026-01-09',
    '2026-01-09',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 10: T shirts mockp [ARS]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'ARS 100010',
    'Add',
    'T shirts mockp',
    'ARS',
    (SELECT id FROM accounts WHERE prefix = 'ARS' LIMIT 1),
    'shurnymarengo',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    40,
    'Approved',
    'Cleared',
    '2026-01-09',
    '2026-01-12',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 11: HELIA VITALIS CLINIC [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100011',
    'Add',
    'HELIA VITALIS CLINIC',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'urbanrnbeatz',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    10,
    'Approved',
    'Cleared',
    '2026-01-09',
    '2026-01-21',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 12: MY NEST [ARS]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'ARS 100012',
    'Add',
    'MY NEST',
    'ARS',
    (SELECT id FROM accounts WHERE prefix = 'ARS' LIMIT 1),
    'prezascy',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    15,
    'Approved',
    'Cleared',
    '2026-01-10',
    '2026-01-26',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 13: Insta/pain relief [ARS]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'ARS 100013',
    'Add',
    'Insta/pain relief',
    'ARS',
    (SELECT id FROM accounts WHERE prefix = 'ARS' LIMIT 1),
    'puptgk',
    'Arsalan Hussain',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    10,
    'Approved',
    'Cleared',
    '2026-01-14',
    '2026-01-18',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 14: Cover book [ARS]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'ARS 100014',
    'Add',
    'Cover book',
    'ARS',
    (SELECT id FROM accounts WHERE prefix = 'ARS' LIMIT 1),
    'maxben9',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    10,
    'Approved',
    'Cleared',
    '2026-01-16',
    '2026-01-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 15: Two Little Crumbs [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100015',
    'Add',
    'Two Little Crumbs',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'aking1234',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    40,
    'Approved',
    'Cleared',
    '2026-01-16',
    '2026-01-21',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 16: Jaye Chestnut [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100016',
    'Add',
    'Jaye Chestnut',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'jayechestnut',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    20,
    'Approved',
    'Cleared',
    '2026-01-18',
    '2026-01-25',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 17: A Room to Heal [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100017',
    'Add',
    'A Room to Heal',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'beckfordjr',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'Approved',
    'Cleared',
    '2026-01-21',
    '2026-01-11',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 18: Recreate [ARS]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'ARS 100018',
    'Add',
    'Recreate',
    'ARS',
    (SELECT id FROM accounts WHERE prefix = 'ARS' LIMIT 1),
    'finnoomen',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    20,
    'Approved',
    'Cleared',
    '2026-01-23',
    '2026-02-10',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 19: Glomra [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100019',
    'Add',
    'Glomra',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'zabikhan321',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'Approved',
    'Cleared',
    '2026-01-24',
    '2026-02-02',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 20: 7 Doors Investments Seven Doors Investments [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100020',
    'Add',
    '7 Doors Investments Seven Doors Investments',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'airiq_',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    20,
    'Approved',
    'Cleared',
    '2026-01-24',
    '2026-01-26',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 21: Kamloops Carts Plus, Carts Plus, Carts + [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100021',
    'Add',
    'Kamloops Carts Plus, Carts Plus, Carts +',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'cartsplus',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    70,
    'Approved',
    'Cleared',
    '2026-01-25',
    '2026-02-26',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 22: Community Response Network [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100022',
    'Add',
    'Community Response Network',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'milpagrille',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    10,
    'Approved',
    'Cleared',
    '2026-01-25',
    '2026-01-29',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 23: Direct Darts [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100023',
    'Add',
    'Direct Darts',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'directdarts',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'Approved',
    'Cleared',
    '2026-01-26',
    '2026-01-31',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 24: S.H.A.R.E 74 ou SHARE 74 [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100024',
    'Add',
    'S.H.A.R.E 74 ou SHARE 74',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'marclanneau',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'Approved',
    'Cleared',
    '2026-01-26',
    '2026-01-31',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 25: RP [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100025',
    'Add',
    'RP',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'hvardskjelsvik',
    'Arsalan Hussain',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    18,
    'Approved',
    'Cleared',
    '2026-01-26',
    '2026-01-27',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 26: Recreate [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100026',
    'Add',
    'Recreate',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'khalifaalmar448',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'Approved',
    'Cleared',
    '2026-01-26',
    '2026-01-28',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 27: Refine [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100027',
    'Add',
    'Refine',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'purcyl',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    10,
    'Approved',
    'Cleared',
    '2026-01-26',
    '2026-03-05',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 28: TriggerSign [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100028',
    'Add',
    'TriggerSign',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'blinx_media',
    'Arsalan Hussain',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'Approved',
    'Cleared',
    '2026-01-27',
    '2026-01-30',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 29: Gingerbread Aesthetics [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100029',
    'Add',
    'Gingerbread Aesthetics',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'flyingcookieuk',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'Approved',
    'Cleared',
    '2026-01-27',
    '2026-01-31',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 30: East Coast Latinas [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100030',
    'Add',
    'East Coast Latinas',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'avanicj',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    40,
    'Approved',
    'Cleared',
    '2026-01-28',
    '2026-02-26',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 31: BOMBAKERY [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100031',
    'Add',
    'BOMBAKERY',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'sergio_ivorra',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    20,
    'Approved',
    'Cleared',
    '2026-01-28',
    '2026-02-10',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 32: Team Global Inc. [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100032',
    'Add',
    'Team Global Inc.',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'ramziami',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Order Brief',
    70,
    'Approved',
    'Cleared',
    '2026-01-28',
    '2026-02-02',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 33: National plumbing service [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100033',
    'Add',
    'National plumbing service',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'abdulhanif84',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'Approved',
    'Cleared',
    '2026-01-29',
    '2026-02-04',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 34: Heartwork Visuals [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100034',
    'Add',
    'Heartwork Visuals',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'heartworkvisual',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    40,
    'Approved',
    'Cleared',
    '2026-01-29',
    '2026-01-31',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 35: Live Rezume [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100035',
    'Add',
    'Live Rezume',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'awesomecookie',
    'Arsalan Hussain',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'Approved',
    'Cleared',
    '2026-01-29',
    '2026-01-31',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 36: Weddo [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100036',
    'Add',
    'Weddo',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'kornel47',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'Approved',
    'Cleared',
    '2026-01-29',
    '2026-02-04',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 37: Powerlink Radiators [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100037',
    'Add',
    'Powerlink Radiators',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'priyanshu0499',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'Approved',
    'Cleared',
    '2026-01-29',
    '2026-02-08',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 38: Palm Hoodie Mark [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100038',
    'Add',
    'Palm Hoodie Mark',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'jgold5f',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    55,
    'Approved',
    'Cleared',
    '2026-01-29',
    '2026-02-26',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 39: Afroho [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100039',
    'Add',
    'Afroho',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'reviewmyyelp',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'Approved',
    'Cleared',
    '2026-01-30',
    '2026-01-31',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 40: “Lace Up Your Boots, Let’s Ride With Jesus!” [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100040',
    'Add',
    '“Lace Up Your Boots, Let’s Ride With Jesus!”',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'almilgrands',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Order Brief',
    80,
    'Approved',
    'Cleared',
    '2026-01-31',
    '2026-02-04',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 41: Nearshore Golf [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100041',
    'Add',
    'Nearshore Golf',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'wildbill84z',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    20,
    'Approved',
    'Cleared',
    '2026-01-31',
    '2026-02-26',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 42: My Life Continues [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100042',
    'Add',
    'My Life Continues',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'ageekiara',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'Approved',
    'Cleared',
    '2026-01-31',
    '2026-02-03',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 43: Newtown Walk [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100043',
    'Add',
    'Newtown Walk',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'larrybret',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    15,
    'Approved',
    'Cleared',
    '2026-02-03',
    '2026-02-06',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 44: stamp 2 [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100044',
    'Add',
    'stamp 2',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'sherlockholm291',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    40,
    'Approved',
    'Cleared',
    '2026-02-04',
    '2026-02-10',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 45: Yaal Digital Marketing Sumit [ARS]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'ARS 100045',
    'Add',
    'Yaal Digital Marketing Sumit',
    'ARS',
    (SELECT id FROM accounts WHERE prefix = 'ARS' LIMIT 1),
    'jobzer',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    30,
    'Approved',
    'Cleared',
    '2026-02-04',
    '2026-02-08',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 46: Logo [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100046',
    'Add',
    'Logo',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'lkko90',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    20,
    'Approved',
    'Cleared',
    '2026-02-04',
    '2026-02-07',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 47: HippoLink [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100047',
    'Add',
    'HippoLink',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'arjenhippolink',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    40,
    'Cancelled',
    'Pending',
    '2026-02-04',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 48: She Lead Her Ship Leadership Collective [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100048',
    'Add',
    'She Lead Her Ship Leadership Collective',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'mskristy531',
    'Arsalan Hussain',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    40,
    'Approved',
    'Cleared',
    '2026-02-04',
    '2026-02-07',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 49: Spring Mill [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100049',
    'Add',
    'Spring Mill',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'larrybret',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    20,
    'Approved',
    'Cleared',
    '2026-02-06',
    '2026-02-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 50: Country Crossing [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100050',
    'Add',
    'Country Crossing',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'larrybret',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    20,
    'Approved',
    'Cleared',
    '2026-02-06',
    '2026-02-11',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 51: T- shirt logo [ARS]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'ARS 100051',
    'Add',
    'T- shirt logo',
    'ARS',
    (SELECT id FROM accounts WHERE prefix = 'ARS' LIMIT 1),
    'finnoomen',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    20,
    'Approved',
    'Cleared',
    '2026-02-06',
    '2026-01-26',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 52: JUST OWN GREATNESS [ARS]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'ARS 100052',
    'Add',
    'JUST OWN GREATNESS',
    'ARS',
    (SELECT id FROM accounts WHERE prefix = 'ARS' LIMIT 1),
    'taj0071',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    40,
    'Approved',
    'Cleared',
    '2026-02-07',
    '2026-02-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 53: Limbic System Rewire [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100053',
    'Add',
    'Limbic System Rewire',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'brooklynhanna3',
    'Arsalan Hussain',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    40,
    'Approved',
    'Cleared',
    '2026-02-08',
    '2026-02-11',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 54: Recreate [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100054',
    'Add',
    'Recreate',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'yannick465',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    20,
    'In Progress',
    'Pending',
    '2026-02-09',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 55: variations [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100055',
    'Add',
    'variations',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'brooklynhanna3',
    'Arsalan Hussain',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    30,
    'Approved',
    'Cleared',
    '2026-02-10',
    '2026-02-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 56: TEXPRO ROOFING & CONSTRUCTION [ARS]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'ARS 100056',
    'Add',
    'TEXPRO ROOFING & CONSTRUCTION',
    'ARS',
    (SELECT id FROM accounts WHERE prefix = 'ARS' LIMIT 1),
    'dustin2626',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    25,
    'Approved',
    'Cleared',
    '2026-02-10',
    '2026-02-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 57: SAKK [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100057',
    'Add',
    'SAKK',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'f4rooqh',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    65,
    'Approved',
    'Cleared',
    '2026-02-11',
    '2026-03-05',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 58: PAPPOU'S [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100058',
    'Add',
    'PAPPOU''S',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'consti21',
    'Arsalan Hussain',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    30,
    'Approved',
    'Cleared',
    '2026-02-11',
    '2026-02-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 59: UW Medicine [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100059',
    'Add',
    'UW Medicine',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'mminick626',
    'Arsalan Hussain',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    30,
    'Approved',
    'Cleared',
    '2026-02-11',
    '2026-02-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 60: VlotVerduurzamen [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100060',
    'Add',
    'VlotVerduurzamen',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'tommie076',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    30,
    'Approved',
    'Cleared',
    '2026-02-11',
    '2026-02-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 61: MOGOA [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100061',
    'Add',
    'MOGOA',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'japancake22',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    10,
    'Approved',
    'Cleared',
    '2026-02-11',
    '2026-02-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 62: Marc Mikhail [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100062',
    'Add',
    'Marc Mikhail',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'baghdadddy',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    30,
    'Approved',
    'Cleared',
    '2026-02-11',
    '2026-02-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 63: motorsports [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100063',
    'Add',
    'motorsports',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'ruggedx4755',
    'Arsalan Hussain',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    10,
    'Approved',
    'Cleared',
    '2026-02-11',
    '2026-02-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 64: second line [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100064',
    'Add',
    'second line',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'sareena4144',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    150,
    'Approved',
    'Cleared',
    '2026-02-12',
    '2026-02-26',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 65: Fairway Feet Golf [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100065',
    'Add',
    'Fairway Feet Golf',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'betagolf',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    30,
    'Approved',
    'Cleared',
    '2026-02-12',
    '2026-02-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 66: MF [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100066',
    'Add',
    'MF',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'daniquemotzheim',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    40,
    'Approved',
    'Cleared',
    '2026-02-12',
    '2026-02-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 67: A Room to Heal [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100067',
    'Add',
    'A Room to Heal',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'beckfordjr',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    30,
    'Approved',
    'Cleared',
    '2026-02-12',
    '2026-02-26',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 68: K.E (Kingdom Encouragement) [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100068',
    'Add',
    'K.E (Kingdom Encouragement)',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'dhatterchosen',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    40,
    'Approved',
    'Cleared',
    '2026-02-12',
    '2026-02-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 69: Gulshan farm [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100069',
    'Add',
    'Gulshan farm',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'nasirrashid472',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    30,
    'Approved',
    'Cleared',
    '2026-02-12',
    '2026-02-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 70: OVERHAUL. [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100070',
    'Add',
    'OVERHAUL.',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'ianjones754',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    10,
    'Approved',
    'Cleared',
    '2026-02-13',
    '2026-02-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 71: ISTRA PROPERTY CARE [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100071',
    'Add',
    'ISTRA PROPERTY CARE',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'jerdam',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    10,
    'Approved',
    'Cleared',
    '2026-02-13',
    '2026-02-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 72: Beyond My Surface Books [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100072',
    'Add',
    'Beyond My Surface Books',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'dstlowbeam',
    'Arsalan Hussain',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    40,
    'Approved',
    'Cleared',
    '2026-02-13',
    '2026-02-26',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 73: GrowDGT [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100073',
    'Add',
    'GrowDGT',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'groyaldisc',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    60,
    'Approved',
    'Cleared',
    '2026-02-13',
    '2026-02-26',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 74: Sprungly Education [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100074',
    'Add',
    'Sprungly Education',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'ayyash6',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    60,
    'Cancelled',
    'Pending',
    '2026-02-13',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 75: Prodigy Fitness. [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100075',
    'Add',
    'Prodigy Fitness.',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'bobby_vent',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    30,
    'Approved',
    'Cleared',
    '2026-02-13',
    '2026-02-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 76: Nangfitness [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100076',
    'Add',
    'Nangfitness',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'forsath',
    'Arsalan Hussain',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    30,
    'Cancelled',
    'Pending',
    '2026-02-13',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 77: Empathway Counselling [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100077',
    'Add',
    'Empathway Counselling',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'meshaaleman',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    10,
    'In Progress',
    'Pending',
    '2026-02-14',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 78: iSpot Property [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100078',
    'Add',
    'iSpot Property',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'thatstappd',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    65,
    'Approved',
    'Cleared',
    '2026-02-14',
    '2026-03-05',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 79: Spiritas Logo [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100079',
    'Add',
    'Spiritas Logo',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'kendrickjolin',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    40,
    'Approved',
    'Cleared',
    '2026-02-16',
    '2026-02-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 80: Precision Courier Group [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100080',
    'Add',
    'Precision Courier Group',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'capkale11',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'Approved',
    'Cleared',
    '2026-02-16',
    '2026-02-26',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 81: Iron & Instinct [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100081',
    'Add',
    'Iron & Instinct',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'mweems202',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Referred',
    100,
    'Approved',
    'Cleared',
    '2026-02-16',
    '2026-02-19',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 82: Leilene & Co [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100082',
    'Add',
    'Leilene & Co',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'leileneandco',
    'Arsalan Hussain',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    40,
    'Cancelled',
    'Pending',
    '2026-02-16',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 83: Confidence Cămin de bătrâni / CĂMIN DE BĂTRÂNI [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100083',
    'Add',
    'Confidence Cămin de bătrâni / CĂMIN DE BĂTRÂNI',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'consta24',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'Approved',
    'Cleared',
    '2026-02-17',
    '2026-02-26',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 84: Prodigy Fitness [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100084',
    'Add',
    'Prodigy Fitness',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'bobby_vent',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    150,
    'In Progress',
    'Pending',
    '2026-02-17',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 85: thinkless [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100085',
    'Add',
    'thinkless',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'pasqualepell948',
    'Arsalan Hussain',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    30,
    'Approved',
    'Cleared',
    '2026-02-17',
    '2026-02-26',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 86: Station 10 SFFD (instead of United States of America) [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100086',
    'Add',
    'Station 10 SFFD (instead of United States of America)',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'kejofaro',
    'Arsalan Hussain',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    10,
    'In Progress',
    'Pending',
    '2026-02-17',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 87: Momentra Apparel [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100087',
    'Add',
    'Momentra Apparel',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'zagiam',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    40,
    'Approved',
    'Cleared',
    '2026-02-17',
    '2026-02-26',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 88: Huskio [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100088',
    'Add',
    'Huskio',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'arde44',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'Approved',
    'Cleared',
    '2026-02-18',
    '2026-02-26',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 89: Halo Peptide Science [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100089',
    'Add',
    'Halo Peptide Science',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'nvetica',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'Approved',
    'Cleared',
    '2026-02-18',
    '2026-02-26',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 90: agency logo [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100090',
    'Add',
    'agency logo',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'silverlazer',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    15,
    'Approved',
    'Cleared',
    '2026-02-23',
    '2026-02-26',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 91: Jihad Almajidi [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100091',
    'Add',
    'Jihad Almajidi',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'jihadhasan3',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'Approved',
    'Cleared',
    '2026-02-23',
    '2026-03-08',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 92: Human Success Software™ (H2S™) [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100092',
    'Add',
    'Human Success Software™ (H2S™)',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'dallesmaxwell',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    25,
    'Approved',
    'Cleared',
    '2026-02-23',
    '2026-03-07',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 93: Perun Outdoors [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100093',
    'Add',
    'Perun Outdoors',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'mmaple',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'Approved',
    'Cleared',
    '2026-02-24',
    '2026-03-05',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 94: ilazy [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100094',
    'Add',
    'ilazy',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'mrnich',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    60,
    'Approved',
    'Cleared',
    '2026-02-24',
    '2026-03-05',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 95: La Voz Tejana [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100095',
    'Add',
    'La Voz Tejana',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'ororos_child',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    40,
    'Approved',
    'Cleared',
    '2026-02-24',
    '2026-03-05',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 96: Recreate [ARS]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'ARS 100096',
    'Add',
    'Recreate',
    'ARS',
    (SELECT id FROM accounts WHERE prefix = 'ARS' LIMIT 1),
    'nickspirit',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    20,
    'Approved',
    'Cleared',
    '2026-02-25',
    '2026-03-05',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 97: Lympha Luxury Apartments [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100097',
    'Add',
    'Lympha Luxury Apartments',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'christinesieko',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    40,
    'Approved',
    'Cleared',
    '2026-02-26',
    '2026-03-05',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 98: Coldstream Garage Door [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100098',
    'Add',
    'Coldstream Garage Door',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'janyland',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    60,
    'Approved',
    'Cleared',
    '2026-02-27',
    '2026-03-11',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 99: PURE EDITION [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100099',
    'Add',
    'PURE EDITION',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'sabernal',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-02-27',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 100: The Executive assist [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100100',
    'Add',
    'The Executive assist',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'kbear2197',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    40,
    'Approved',
    'Cleared',
    '2026-02-27',
    '2026-03-05',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 101: No Brainer AI Solutions [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100101',
    'Add',
    'No Brainer AI Solutions',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'kconway134',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    60,
    'Cancelled',
    'Pending',
    '2026-02-27',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 102: AI Tookit [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100102',
    'Add',
    'AI Tookit',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'dymatrix',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'Approved',
    'Cleared',
    '2026-02-28',
    '2026-03-05',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 103: Lenté Group [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100103',
    'Add',
    'Lenté Group',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'mohab321',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    120,
    'In Progress',
    'Pending',
    '2026-02-28',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 104: Toward Arete [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100104',
    'Add',
    'Toward Arete',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'tylermatzzz',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-01',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 105: Official Brand [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100105',
    'Add',
    'Official Brand',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'janettecamacho',
    'Touseef Ahmed',
    NULL,
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'Approved',
    'Cleared',
    '2026-03-01',
    '2026-03-05',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 106: B-MACO [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100106',
    'Add',
    'B-MACO',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'chizzywizzy',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Promoted',
    30,
    'In Progress',
    'Pending',
    '2026-03-01',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 107: 4 Oaks Drafting Company [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100107',
    'Add',
    '4 Oaks Drafting Company',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'vksamaroo',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    40,
    'Approved',
    'Cleared',
    '2026-03-02',
    '2026-03-06',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 108: Tourist eSIM [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100108',
    'Add',
    'Tourist eSIM',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'Younus Ahammod',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    20,
    'In Progress',
    'Pending',
    '2026-03-02',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 109: MY NEST Modifications [ARS]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'ARS 100109',
    'Add',
    'MY NEST Modifications',
    'ARS',
    (SELECT id FROM accounts WHERE prefix = 'ARS' LIMIT 1),
    'prezascy',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Repeat Buyer',
    10,
    'In Progress',
    'Pending',
    '2026-03-02',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 110: step into [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100110',
    'Add',
    'step into',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'victorhoud',
    'Touseef Ahmed',
    NULL,
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-02',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 111: Value Property Solution.com [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100111',
    'Add',
    'Value Property Solution.com',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'determin44',
    'Stephen',
    NULL,
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'Approved',
    'Cleared',
    '2026-03-02',
    '2026-03-07',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 112: admitedly [GHA]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'GHA 100112',
    'Add',
    'admitedly',
    'GHA',
    (SELECT id FROM accounts WHERE prefix = 'GHA' LIMIT 1),
    'ravichandras',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    20,
    'In Progress',
    'Pending',
    '2026-03-02',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 113: VALTERIA [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100113',
    'Add',
    'VALTERIA',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'chadgorecho',
    'Touseef Ahmed',
    NULL,
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'Approved',
    'Cleared',
    '2026-03-03',
    '2026-03-08',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 114: Avantis Security Group [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100114',
    'Add',
    'Avantis Security Group',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'luuu12',
    'Taha Khan',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'Approved',
    'Cleared',
    '2026-03-03',
    '2026-03-09',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 115: Markos Fotiou [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100115',
    'Add',
    'Markos Fotiou',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'markosfotiou',
    'Taha Khan',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    40,
    'Approved',
    'Cleared',
    '2026-03-03',
    '2026-03-08',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 116: The Salty Dog [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100116',
    'Add',
    'The Salty Dog',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'staciez2012',
    'Touseef Ahmed',
    NULL,
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-03',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 117: MyStateMLS CRM (powered by Breadlist) [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100117',
    'Add',
    'MyStateMLS CRM (powered by Breadlist)',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'nickmcelmurry',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-03',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 118: Alliance Machine [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100118',
    'Add',
    'Alliance Machine',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'paulyaccuate',
    'Taha Khan',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    15,
    'In Progress',
    'Pending',
    '2026-03-03',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 119: UnaVida Press [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100119',
    'Add',
    'UnaVida Press',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'jdelgado0440',
    'Zeeshan Alam',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    40,
    'In Progress',
    'Pending',
    '2026-03-03',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 120: Marcus Haug [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100120',
    'Add',
    'Marcus Haug',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'webgep',
    'Touseef Ahmed',
    NULL,
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-03',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 121: DINA UNITED performance [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100121',
    'Add',
    'DINA UNITED performance',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'andy879',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-04',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 122: Organic almond flour [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100122',
    'Add',
    'Organic almond flour',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'mohamedfarah122',
    'Zeeshan Alam',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    15,
    'Approved',
    'Cleared',
    '2026-03-04',
    '2026-03-07',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 123: nowshades [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100123',
    'Add',
    'nowshades',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'uppway',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    20,
    'In Progress',
    'Pending',
    '2026-03-04',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 124: JOWI Manufacturer – Outlet [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100124',
    'Add',
    'JOWI Manufacturer – Outlet',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'dominicvenne108',
    'Zeeshan Alam',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    20,
    'In Progress',
    'Pending',
    '2026-03-04',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 125: JY Notary Services [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100125',
    'Add',
    'JY Notary Services',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'juyahh',
    'Touseef Ahmed',
    NULL,
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-04',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 126: Paws & Happy Tails [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100126',
    'Add',
    'Paws & Happy Tails',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'asamitier',
    'Zeeshan Alam',
    NULL,
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'Approved',
    'Cleared',
    '2026-03-04',
    '2026-03-11',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 127: CST [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100127',
    'Add',
    'CST',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'angeljoel20',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    20,
    'In Progress',
    'Pending',
    '2026-03-04',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 128: NikToons [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100128',
    'Add',
    'NikToons',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'nikkiwhitelive',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-04',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 129: Nesi The Messenger [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100129',
    'Add',
    'Nesi The Messenger',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'neccat',
    'Touseef Ahmed',
    NULL,
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-05',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 130: Ghostly [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100130',
    'Add',
    'Ghostly',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'xontrippe',
    'Taha Khan',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'Approved',
    'Cleared',
    '2026-03-05',
    '2026-03-09',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 131: Blissful Studios [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100131',
    'Add',
    'Blissful Studios',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'joshbliss222',
    'Taha Khan',
    NULL,
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-05',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 132: Spiritist Federation of Florida's CYC [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100132',
    'Add',
    'Spiritist Federation of Florida''s CYC',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'andy1857',
    'Taha Khan',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-05',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 133: Nico the Lefty [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100133',
    'Add',
    'Nico the Lefty',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'nicogv',
    'Taha Khan',
    NULL,
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-05',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 134: SAVAGE HORIZON [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100134',
    'Add',
    'SAVAGE HORIZON',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'valymei',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'Approved',
    'Cleared',
    '2026-03-05',
    '2026-03-11',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 135: Laklevi Enterprises [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100135',
    'Add',
    'Laklevi Enterprises',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'happitaxes',
    'Zeeshan Alam',
    NULL,
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-05',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 136: My AI HelpLine [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100136',
    'Add',
    'My AI HelpLine',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'raja_gomath',
    'Zeeshan Alam',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-05',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 137: Cosmic cards [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100137',
    'Add',
    'Cosmic cards',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'lupog12',
    'Zeeshan Alam',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-05',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 138: Eagle Travel [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100138',
    'Add',
    'Eagle Travel',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'moshekohn934',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-05',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 139: Press Lounge Beauty Salon LLC [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100139',
    'Add',
    'Press Lounge Beauty Salon LLC',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'presslounge96',
    'Zeeshan Alam',
    NULL,
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-06',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 140: UKKO Games [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100140',
    'Add',
    'UKKO Games',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'ugolodev',
    'Zeeshan Alam',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'Approved',
    'Cleared',
    '2026-03-06',
    '2026-03-10',
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 141: The Ahnest Hour [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100141',
    'Add',
    'The Ahnest Hour',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'shakaiaa',
    'Touseef Ahmed',
    NULL,
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-06',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 142: No Title [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100142',
    'Add',
    NULL,
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'sazd79',
    'Touseef Ahmed',
    NULL,
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-06',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 143: “Where Clean Meets Sparkle.” [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100143',
    'Add',
    '“Where Clean Meets Sparkle.”',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'trent4prez',
    'Zeeshan Alam',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-07',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 144: EHILF E-SCOOTER PANNENHILFE SWISS [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100144',
    'Add',
    'EHILF E-SCOOTER PANNENHILFE SWISS',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'npcn20',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-07',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 145: FitnessLeadX [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100145',
    'Add',
    'FitnessLeadX',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'fitnessleadx',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-07',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 146: The Goat [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100146',
    'Add',
    'The Goat',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'aureal77',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    40,
    'In Progress',
    'Pending',
    '2026-03-07',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 147: Canticula [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100147',
    'Add',
    'Canticula',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'jdelpratt',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-07',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 148: Recreate [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100148',
    'Add',
    'Recreate',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'kreaks',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-07',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 149: Dunn Builds [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100149',
    'Add',
    'Dunn Builds',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'tannerdunn398',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-07',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 150: Cleo [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100150',
    'Add',
    'Cleo',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'amr_aboeldahab',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-07',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 151: CONQUER [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100151',
    'Add',
    'CONQUER',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'lorenzzo_miguel',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-07',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 152: Boreal Knife Co [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100152',
    'Add',
    'Boreal Knife Co',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'borealknives',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-07',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 153: Author Eva Legre [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100153',
    'Add',
    'Author Eva Legre',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'thinflower',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-07',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 154: Sjællands-Rengøring [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100154',
    'Add',
    'Sjællands-Rengøring',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'brodoceanu',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-08',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 155: Cooper Point Woodworking Established 2026 [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100155',
    'Add',
    'Cooper Point Woodworking Established 2026',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'driverdon123',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-08',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 156: Hypnothérapeute à ANIANE [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100156',
    'Add',
    'Hypnothérapeute à ANIANE',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'svp34000',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-08',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 157: Lucky Leaf Painting [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100157',
    'Add',
    'Lucky Leaf Painting',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'spinqueen85',
    'Taha Khan',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-08',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 158: Cat's Crown Games [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100158',
    'Add',
    'Cat''s Crown Games',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'mournerslament',
    'Taha Khan',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    60,
    'In Progress',
    'Pending',
    '2026-03-08',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 159: TrackCheck! [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100159',
    'Add',
    'TrackCheck!',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'leertaste1337',
    'Zeeshan Alam',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-08',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 160: Honey Hire Recruiting [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100160',
    'Add',
    'Honey Hire Recruiting',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'bruce1423',
    'Zeeshan Alam',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-08',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 161: Esther Capital Group LLC [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100161',
    'Add',
    'Esther Capital Group LLC',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'star2911',
    'Zeeshan Alam',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-08',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 162: Recreate [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100162',
    'Add',
    'Recreate',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'lowkeymikel',
    'Zeeshan Alam',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    20,
    'In Progress',
    'Pending',
    '2026-03-08',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 163: The Hundred Bar [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100163',
    'Add',
    'The Hundred Bar',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'anestisgaitanid',
    'Zeeshan Alam',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-08',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 164: BeneFIT+ B+ [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100164',
    'Add',
    'BeneFIT+ B+',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'easy_life',
    'Taha Khan',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-08',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 165: Mex-Islander Eats [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100165',
    'Add',
    'Mex-Islander Eats',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'mexislanders',
    'Taha Khan',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-08',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 166: Beyond Sixty Club [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100166',
    'Add',
    'Beyond Sixty Club',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'chefdevagi',
    'Taha Khan',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    55,
    'In Progress',
    'Pending',
    '2026-03-09',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 167: Le petit canard [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100167',
    'Add',
    'Le petit canard',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'polo_canard',
    'Chetan Jhetwa',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-09',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 168: BICORNIO [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100168',
    'Add',
    'BICORNIO',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'purchasingbicor',
    'Zeeshan Alam',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    60,
    'In Progress',
    'Pending',
    '2026-03-09',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 169: Warm Fuzzy [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100169',
    'Add',
    'Warm Fuzzy',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'pierrequinn',
    'Syed Jawad Ul Hasan',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-09',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 170: Buzz Properties [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100170',
    'Add',
    'Buzz Properties',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'angelaself453',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-09',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 171: good guys tyre [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100171',
    'Add',
    'good guys tyre',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'raziqataie',
    'Zeeshan Alam',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    50,
    'In Progress',
    'Pending',
    '2026-03-09',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 172: GOHCO Logo [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100172',
    'Add',
    'GOHCO Logo',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'candyhutzell',
    'Taha Khan',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-09',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 173: Psychesport [ARS]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'ARS 100173',
    'Add',
    'Psychesport',
    'ARS',
    (SELECT id FROM accounts WHERE prefix = 'ARS' LIMIT 1),
    'shugue',
    'Syed Jawad Ul Hasan',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-09',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 174: Pier 17 Seafood [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100174',
    'Add',
    'Pier 17 Seafood',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'asanchez1000',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-09',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 175: FO [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100175',
    'Add',
    'FO',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'freelancebutter',
    'Taha Khan',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    15,
    'In Progress',
    'Pending',
    '2026-03-09',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 176: christ the king [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100176',
    'Add',
    'christ the king',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'ats2020',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-09',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 177: STEVEN [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100177',
    'Add',
    'STEVEN',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'miracle8',
    'Touseef Ahmed',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-09',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 178: Almeda Dental of Pearland [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100178',
    'Add',
    'Almeda Dental of Pearland',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'thunguyen127',
    'Zeeshan Alam',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-09',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 179: EDEN [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100179',
    'Add',
    'EDEN',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'chanelrogers',
    'Zeeshan Alam',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-10',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 180: SouthSideTCG [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100180',
    'Add',
    'SouthSideTCG',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'serfabios',
    'Muhammad Salman',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-10',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 181: Brew Mechanics [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100181',
    'Add',
    'Brew Mechanics',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'williamfrost21',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    60,
    'In Progress',
    'Pending',
    '2026-03-10',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 182: whiffwhiffs [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100182',
    'Add',
    'whiffwhiffs',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'qlarkin6',
    'Stephen',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    20,
    'In Progress',
    'Pending',
    '2026-03-10',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 183: Sprachwerk Leipzig [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100183',
    'Add',
    'Sprachwerk Leipzig',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'jbalden',
    'Muhammad Salman',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-10',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 184: Jamaica Eldercare Placement Services [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100184',
    'Add',
    'Jamaica Eldercare Placement Services',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'sweeneyg',
    'Muhammad Salman',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    20,
    'In Progress',
    'Pending',
    '2026-03-10',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 185: The Prime Collective [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100185',
    'Add',
    'The Prime Collective',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'beckyhorne22',
    'Muhammad Salman',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-10',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 186: Kinly Society [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100186',
    'Add',
    'Kinly Society',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'abourque1',
    'Chetan Jhetwa',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-10',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 187: 5inku [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100187',
    'Add',
    '5inku',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'senkoenes',
    'Chetan Jhetwa',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    10,
    'In Progress',
    'Pending',
    '2026-03-10',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 188: Botwatch [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100188',
    'Add',
    'Botwatch',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'johnecheck',
    'Chetan Jhetwa',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-10',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 189: Wax Paper Pattern Design [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100189',
    'Add',
    'Wax Paper Pattern Design',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'tadalist',
    'Taha Khan',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    'Arsalan Ali Shah',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-10',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 190: FROM EARTH [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100190',
    'Add',
    'FROM EARTH',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'mauriciozavala',
    'Taha Khan',
    (SELECT id FROM profiles WHERE name = 'Arsalan Ali Shah' LIMIT 1),
    NULL,
    'Direct',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-10',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 191: Iron blood [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100191',
    'Add',
    'Iron blood',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'mataous123',
    'Syed Jawad Ul Hasan',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-11',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Row 192: SayCheeze Logo (Fotobooth) [MAN]
INSERT INTO projects (
    project_id, action_move, project_title, account, account_id,
    client_name, assignee, primary_manager_id, converted_by, order_type,
    items_sold, medium, price, status, funds_status,
    created_at, clearance_start_date, updated_at
) VALUES (
    'MAN 100192',
    'Add',
    'SayCheeze Logo (Fotobooth)',
    'MAN',
    (SELECT id FROM accounts WHERE prefix = 'MAN' LIMIT 1),
    'arzionc',
    'Syed Jawad Ul Hasan',
    (SELECT id FROM profiles WHERE name = 'Zara Khan' LIMIT 1),
    'Zara Khan',
    'Converted',
    '{"items":["Logo"],"other":null}',
    'Ranking',
    30,
    'In Progress',
    'Pending',
    '2026-03-11',
    NULL,
    NOW()
) ON CONFLICT (project_id) DO NOTHING;

-- Total records inserted: 192
