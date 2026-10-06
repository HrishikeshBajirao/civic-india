-- Run only after the reviewed schema has been migrated.
INSERT INTO entities (id, slug, name, type, aliases, description)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'prime-minister', 'Prime Minister of India', 'person', ARRAY['PM']::text[], 'The head of the Union government.'),
  ('00000000-0000-4000-8000-000000000002', 'prime-ministers-office', 'Prime Minister''s Office', 'office', ARRAY['PMO']::text[], 'The office supporting the Prime Minister.'),
  ('00000000-0000-4000-8000-000000000003', 'president-of-india', 'President of India', 'person', ARRAY['President']::text[], 'The constitutional head of the Republic of India.'),
  ('00000000-0000-4000-8000-000000000004', 'presidents-secretariat', 'President''s Secretariat', 'office', ARRAY[]::text[], 'The office supporting the President of India.'),
  ('00000000-0000-4000-8000-000000000005', 'parliament-of-india', 'Parliament of India', 'legislature', ARRAY['Parliament']::text[], 'India''s Union legislature.'),
  ('00000000-0000-4000-8000-000000000006', 'lok-sabha', 'Lok Sabha', 'legislature', ARRAY['House of the People']::text[], 'The lower house of Parliament.'),
  ('00000000-0000-4000-8000-000000000007', 'rajya-sabha', 'Rajya Sabha', 'legislature', ARRAY['Council of States']::text[], 'The upper house of Parliament.'),
  ('00000000-0000-4000-8000-000000000008', 'supreme-court-of-india', 'Supreme Court of India', 'court', ARRAY['Supreme Court', 'SCI']::text[], 'India''s highest court.'),
  ('00000000-0000-4000-8000-000000000009', 'ministry-of-home-affairs', 'Ministry of Home Affairs', 'ministry', ARRAY['MHA']::text[], 'Union ministry with internal security and domestic affairs responsibilities.'),
  ('00000000-0000-4000-8000-000000000010', 'ministry-of-external-affairs', 'Ministry of External Affairs', 'ministry', ARRAY['MEA']::text[], 'Union ministry responsible for India''s external relations.')
ON CONFLICT (slug) DO NOTHING;
