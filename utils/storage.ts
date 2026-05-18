import { supabase } from '../lib/supabase';

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * @param file The file to upload
 * @param bucket The bucket to upload to (defaults to 'attachments')
 * @returns An object containing the public URL and file metadata
 */
export const uploadFile = async (file: File, bucket: string = 'attachments') => {
  try {
    const nameParts = file.name.split('.');
    const fileExt = nameParts.length > 1 ? nameParts.pop()?.toLowerCase() : 'bin';
    const cleanBaseName = (nameParts.join('.') || 'file').replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    const fileName = `${cleanBaseName}_${Math.random().toString(36).substring(2, 7)}_${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type // Ensure browser knows it's an image
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    if (!data || !data.publicUrl) {
      throw new Error('Failed to generate public URL for uploaded file');
    }

    return {
      name: file.name,
      type: file.type,
      size: file.size,
      url: data.publicUrl,
      storagePath: filePath,
      bucket: bucket
    };
  } catch (error) {
    console.error('Error in uploadFile:', error);
    throw error;
  }
};
