
-- Add SQL validation capability to the database

-- First, create a function to safely run SQL queries with parameters
CREATE OR REPLACE FUNCTION run_sql_query(sql_query text, query_params text[] DEFAULT '{}')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  EXECUTE sql_query INTO result USING query_params;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Add SQL validation fields to forms table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'forms' AND column_name = 'sql_validation_enabled') THEN
    ALTER TABLE forms ADD COLUMN sql_validation_enabled boolean DEFAULT false;
  END IF;
END$$;

-- Add SQL validation fields to elements table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_elements') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'form_elements' AND column_name = 'validation_query') THEN
      ALTER TABLE form_elements ADD COLUMN validation_query text;
      ALTER TABLE form_elements ADD COLUMN validation_error_message text;
    END IF;
  END IF;
END$$;
