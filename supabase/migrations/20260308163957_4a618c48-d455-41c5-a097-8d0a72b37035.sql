
-- Friendships table
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sender_id, receiver_id)
);

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_friendship()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.sender_id = NEW.receiver_id THEN
    RAISE EXCEPTION 'Cannot friend yourself';
  END IF;
  IF NEW.status NOT IN ('pending', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid friendship status';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_friendship
  BEFORE INSERT OR UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.validate_friendship();

-- RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Anyone involved can view
CREATE POLICY "Users can view own friendships"
  ON public.friendships FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Sender can create
CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Receiver can update (accept/reject), sender can update too
CREATE POLICY "Involved users can update friendship"
  ON public.friendships FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Either party can delete (unfriend)
CREATE POLICY "Involved users can delete friendship"
  ON public.friendships FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Public friend count: allow anyone to see accepted friendships for profile display
CREATE POLICY "Anyone can view accepted friendships"
  ON public.friendships FOR SELECT
  USING (status = 'accepted');
