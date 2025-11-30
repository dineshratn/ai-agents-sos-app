-- Fix Missing Trigger for User Profile Creation
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Create the function that handles new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop the trigger if it exists (to avoid conflicts)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 3: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Verify trigger was created
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
