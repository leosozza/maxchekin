-- Add admin role to current user
INSERT INTO user_roles (user_id, role)
VALUES ('08f81b65-b0b7-4a93-a6a2-2b405a5f09fb', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;