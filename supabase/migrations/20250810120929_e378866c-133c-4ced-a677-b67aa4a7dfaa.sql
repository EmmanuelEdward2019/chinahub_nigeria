-- Fix storage bucket - make it public so files can be accessed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'samples';