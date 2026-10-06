-- Seed default HR Departments and Designations (idempotent)
INSERT INTO hr_departments (code, name, description, status) VALUES
  ('ENG', 'Engineering', 'Engineering and technical team', 'Active'),
  ('SITE', 'Site Execution', 'Site execution and field operations', 'Active'),
  ('ACC', 'Accounts', 'Accounts and finance', 'Active'),
  ('HR', 'Human Resource', 'HR and administration', 'Active'),
  ('STR', 'Store', 'Material store and inventory', 'Active')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), status = VALUES(status);

INSERT INTO hr_designations (code, name, grade, description, status) VALUES
  ('PM', 'Project Manager', 'M1', 'Overall project in-charge', 'Active'),
  ('QS', 'Quantity Surveyor', 'E2', 'Billing, measurement and quantity control', 'Active'),
  ('SE', 'Site Engineer', 'E1', 'Day-to-day site execution', 'Active'),
  ('SUP', 'Supervisor', 'S1', 'Labour and work supervision', 'Active'),
  ('ACCT', 'Accountant', 'E1', 'Accounts and bookkeeping', 'Active')
ON DUPLICATE KEY UPDATE name = VALUES(name), grade = VALUES(grade), description = VALUES(description), status = VALUES(status);
