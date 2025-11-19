-- Criar políticas RLS para o bucket apk-files
CREATE POLICY "Admins can upload APK files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'apk-files' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Public can download APK files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'apk-files');

CREATE POLICY "Admins can delete APK files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'apk-files' AND
    has_role(auth.uid(), 'admin'::app_role)
  );