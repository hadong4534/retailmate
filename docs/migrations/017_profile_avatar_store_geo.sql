-- 017_profile_avatar_store_geo.sql
-- 1) profiles.avatar_path: 사용자 프로필 사진 storage 경로
-- 2) stores.lat / lng / postcode: GPS 출퇴근 + 우편번호
-- 3) avatars storage bucket + RLS 정책 (본인만 업로드/삭제, 누구나 read)
--
-- 모두 IF NOT EXISTS 사용으로 멱등 — 재실행 안전.

-- ── 1. profiles.avatar_path ────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_path text;

-- ── 2. stores 위치 컬럼 ───────────────────────────────────────────
ALTER TABLE stores ADD COLUMN IF NOT EXISTS lat numeric(9, 6);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS lng numeric(9, 6);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS postcode varchar(10);

-- ── 3. avatars storage bucket ────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 기존 정책 삭제 후 다시 생성 (멱등)
DROP POLICY IF EXISTS "avatars_read_public" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_self" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_self" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_self" ON storage.objects;

-- public read (사이드바·챗봇 등에서 이미지 노출용)
CREATE POLICY "avatars_read_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 본인 폴더(`{user_id}/...`)에만 INSERT 허용
CREATE POLICY "avatars_insert_self"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_update_self"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_delete_self"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
