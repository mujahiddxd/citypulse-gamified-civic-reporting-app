-- Migration: Add support for multiple images in complaints
-- Add an 'images' column as a text array to store up to 6 image URLs
ALTER TABLE public.complaints ADD COLUMN images TEXT[] DEFAULT '{}';

-- Optional: Migrate existing single image_url to the new images array if it exists
UPDATE public.complaints SET images = ARRAY[image_url] WHERE image_url IS NOT NULL;
