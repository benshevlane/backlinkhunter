-- Enable realtime on agent_messages table for live chat updates
alter publication supabase_realtime add table public.agent_messages;
