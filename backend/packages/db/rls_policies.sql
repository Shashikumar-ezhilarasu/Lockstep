-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is in org
CREATE OR REPLACE FUNCTION public.is_org_member(check_org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_members 
    WHERE org_id = check_org_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check org role
CREATE OR REPLACE FUNCTION public.has_org_role(check_org_id uuid, check_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.org_members 
    WHERE org_id = check_org_id 
    AND user_id = auth.uid()
    AND role = ANY(check_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations: Users can only see orgs they are members of
CREATE POLICY "Users can view organizations they belong to" 
ON organizations FOR SELECT 
USING (is_org_member(id));

-- Org Members: Users can see members of their orgs
CREATE POLICY "Users can view members of their organizations" 
ON org_members FOR SELECT 
USING (is_org_member(org_id));

-- Projects: Visibility cascades from org membership
CREATE POLICY "Users can view projects in their organizations" 
ON projects FOR SELECT 
USING (is_org_member(org_id));

-- Queues: Visibility cascades from org via project
CREATE POLICY "Users can view queues in their organizations" 
ON queues FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = queues.project_id
    AND is_org_member(projects.org_id)
  )
);

CREATE POLICY "Admins/Owners can modify queues" 
ON queues FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = queues.project_id
    AND has_org_role(projects.org_id, ARRAY['owner', 'admin'])
  )
);

-- Jobs: Visibility cascades from org via project -> queue
CREATE POLICY "Users can view jobs in their organizations" 
ON jobs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM queues
    JOIN projects ON queues.project_id = projects.id
    WHERE queues.id = jobs.queue_id
    AND is_org_member(projects.org_id)
  )
);

CREATE POLICY "Members can insert jobs" 
ON jobs FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM queues
    JOIN projects ON queues.project_id = projects.id
    WHERE queues.id = jobs.queue_id
    AND is_org_member(projects.org_id)
  )
);
