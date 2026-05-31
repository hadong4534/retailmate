'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, UserMinus, X, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import { MoreIcon } from '@/components/icons';
import {
  updateMemberProfile,
  resignMember,
  promoteToManager,
  demoteToEmployee,
} from './actions';

interface Props {
  memberId: string;
  role: 'owner' | 'manager' | 'employee';
  isActive: boolean;
  /** 표시용 — 현재 저장된 이름과 연락처 (편집 모달 초기값) */
  initialName: string;
  initialPhone: string;
}

/**
 * 직원 행 더보기 메뉴 — 4개 액션을 ⋯ 드롭다운에 통합.
 *   • 이름/연락처 편집 (모달)
 *   • 매니저 승격 / 직원 강등 (역할 토글)
 *   • 퇴사 처리 / 복직 (is_active 토글)
 *
 * 사장(owner) 본인은 ⋯ 메뉴 자체를 숨겨 자기 자신 강등·퇴사 사고 방지.
 */
export function MemberActions({ memberId, role, isActive, initialName, initialPhone }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // owner는 액션 메뉴 숨김
  if (role === 'owner') return null;

  function handlePromote() {
    setOpen(false);
    if (!confirm('이 직원을 매니저로 임명하시겠습니까?\n매니저는 사장님과 동일한 관리 권한을 가집니다.')) return;
    startTransition(async () => {
      const r = await promoteToManager(memberId);
      if ('error' in r) {
        alert(r.error);
        return;
      }
      router.refresh();
    });
  }
  function handleDemote() {
    setOpen(false);
    if (!confirm('이 매니저를 일반 직원으로 강등하시겠습니까?')) return;
    startTransition(async () => {
      const r = await demoteToEmployee(memberId);
      if ('error' in r) {
        alert(r.error);
        return;
      }
      router.refresh();
    });
  }
  function handleResign() {
    setOpen(false);
    if (!confirm(
      '이 직원을 완전히 삭제하시겠습니까?\n\n' +
      '• 직원 목록에서 즉시 제거됩니다.\n' +
      '• 근무·계약서 기록은 유지되지만 직원으로는 검색되지 않습니다.\n' +
      '• 복직이 필요하면 새 근로계약서를 작성해주세요.\n\n' +
      '이 작업은 되돌릴 수 없습니다.'
    )) return;
    startTransition(async () => {
      const r = await resignMember(memberId);
      if ('error' in r) {
        alert(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="직원 관리 더보기"
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={pending}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-[#EAECF5] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <MoreIcon className="h-4 w-4" />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-lg border border-[#EAECF5] bg-white shadow-lg"
          >
            <MenuItem
              Icon={Pencil}
              onClick={() => { setOpen(false); setEditOpen(true); }}
            >
              이름·연락처 편집
            </MenuItem>
            {isActive && role === 'employee' && (
              <MenuItem Icon={ChevronUp} onClick={handlePromote}>
                매니저로 승격
              </MenuItem>
            )}
            {isActive && role === 'manager' && (
              <MenuItem Icon={ChevronDown} onClick={handleDemote}>
                직원으로 강등
              </MenuItem>
            )}
            <div className="border-t border-slate-100" />
            <MenuItem Icon={UserMinus} onClick={handleResign} tone="danger">
              퇴사 (직원 삭제)
            </MenuItem>
          </div>
        )}
      </div>

      {editOpen && (
        <EditProfileModal
          memberId={memberId}
          initialName={initialName}
          initialPhone={initialPhone}
          onClose={() => setEditOpen(false)}
        />
      )}
    </>
  );
}

function MenuItem({
  Icon, children, onClick, tone = 'default',
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  const color = tone === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50';
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium transition ${color}`}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} />
      {children}
    </button>
  );
}

/* ───────────────────── 편집 모달 ───────────────────── */
function EditProfileModal({
  memberId, initialName, initialPhone, onClose,
}: {
  memberId: string;
  initialName: string;
  initialPhone: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName === '이름 미입력' || initialName === '이름 미등록' ? '' : initialName);
  const [phone, setPhone] = useState(initialPhone === '연락처 없음' || initialPhone === '-' ? '' : initialPhone);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ESC로 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await updateMemberProfile(memberId, { name, phone });
      if ('error' in r) {
        setError(r.error);
        return;
      }
      // 서버 액션의 revalidatePath가 캐시를 무효화한 뒤,
      // 클라이언트 router도 명시적으로 refresh — 안 그러면 페이지가 즉시 갱신 안 되어
      // 사용자에게 "수정이 반영 안 됨"으로 보임.
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[#EAECF5] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-[15px] font-bold text-slate-900">직원 정보 편집</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div>
            <label htmlFor="emp-name" className="block text-[13px] font-medium text-slate-700">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              id="emp-name"
              type="text"
              required
              maxLength={30}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="mt-1 h-11 w-full rounded-md border border-[#E3E5F0] px-3 text-base focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
            />
          </div>
          <div>
            <label htmlFor="emp-phone" className="block text-[13px] font-medium text-slate-700">
              연락처
            </label>
            <input
              id="emp-phone"
              type="tel"
              inputMode="tel"
              maxLength={20}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-1234-5678"
              className="mt-1 h-11 w-full rounded-md border border-[#E3E5F0] px-3 text-base focus:border-[#7177EE] focus:outline-none focus:ring-2 focus:ring-[#E4E6FB]"
            />
            <p className="mt-1 text-[11px] text-slate-400">선택 입력 · 비워두면 연락처 없음으로 저장됩니다.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 p-2.5 text-[12px] text-red-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-md border border-[#E3E5F0] bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {pending ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
