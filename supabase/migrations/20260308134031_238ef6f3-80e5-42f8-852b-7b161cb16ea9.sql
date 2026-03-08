-- Insert test collaborator for second app
INSERT INTO public.project_collaborators (app_id, user_id, invited_by)
VALUES ('b07076aa-4867-4b57-bec1-c130fec12b40', 'acfacc66-ecf0-4c78-9f4c-aadb66624aac', '53e6e3b1-5718-471f-853c-be8868e4cacb')
ON CONFLICT DO NOTHING;

-- Insert test contract (pending)
INSERT INTO public.collaborator_contracts (app_id, collaborator_id, proposed_by, percentage, status)
VALUES ('b07076aa-4867-4b57-bec1-c130fec12b40', 'acfacc66-ecf0-4c78-9f4c-aadb66624aac', '53e6e3b1-5718-471f-853c-be8868e4cacb', 15, 'pending')
ON CONFLICT DO NOTHING;