-- Add search vector columns
ALTER TABLE "bins" ADD COLUMN "search_vector" tsvector;
ALTER TABLE "items" ADD COLUMN "search_vector" tsvector;

-- Create GIN indexes for fast text search
CREATE INDEX "bins_search_vector_idx" ON "bins" USING gin("search_vector");
CREATE INDEX "items_search_vector_idx" ON "items" USING gin("search_vector");

-- Function to update bin search vector
CREATE OR REPLACE FUNCTION update_bin_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', 
    COALESCE(NEW.label, '') || ' ' ||
    COALESCE(NEW.location, '') || ' ' ||
    COALESCE(NEW.description, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update item search vector
CREATE OR REPLACE FUNCTION update_item_search_vector()
RETURNS trigger AS $$
DECLARE
  category_name text;
BEGIN
  -- Get the category name
  SELECT name INTO category_name 
  FROM categories 
  WHERE id = NEW.category_id;
  
  NEW.search_vector := to_tsvector('english', 
    COALESCE(NEW.name, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(category_name, '') || ' ' ||
    COALESCE(NEW.unit, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update search vectors
CREATE TRIGGER bins_search_vector_update
  BEFORE INSERT OR UPDATE ON "bins"
  FOR EACH ROW
  EXECUTE FUNCTION update_bin_search_vector();

CREATE TRIGGER items_search_vector_update
  BEFORE INSERT OR UPDATE ON "items"
  FOR EACH ROW
  EXECUTE FUNCTION update_item_search_vector();

-- Populate existing search vectors
UPDATE "bins" SET search_vector = to_tsvector('english', 
  COALESCE(label, '') || ' ' ||
  COALESCE(location, '') || ' ' ||
  COALESCE(description, '')
);

UPDATE "items" SET search_vector = to_tsvector('english', 
  COALESCE(name, '') || ' ' ||
  COALESCE(description, '') || ' ' ||
  COALESCE((SELECT name FROM categories WHERE id = items.category_id), '') || ' ' ||
  COALESCE(unit, '')
);