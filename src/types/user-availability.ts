// ユーザー空き時間管理の型定義

export interface UserAvailability {
  id: string;
  user_id: string;
  available_date: string; // YYYY-MM-DD
  start_time_minutes: number; // 0-1439
  end_time_minutes: number; // 0-1439
  availability_type: 'manual' | 'recurring_copy' | 'bulk_set';
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserAvailabilityData {
  available_date: string;
  start_time_minutes: number;
  end_time_minutes: number;
  availability_type?: 'manual' | 'recurring_copy' | 'bulk_set';
  notes?: string;
}

export interface UpdateUserAvailabilityData {
  start_time_minutes?: number;
  end_time_minutes?: number;
  notes?: string;
  is_active?: boolean;
}

// UI用の時間スロット型
export interface TimeSlot {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  startMinutes: number;
  endMinutes: number;
  notes?: string;
  type: 'manual' | 'recurring_copy' | 'bulk_set';
}

// 運営重複情報（モデル専用）
export interface OrganizerOverlap {
  organizerId: string;
  organizerName: string;
  overlappingSlots: {
    startMinutes: number;
    endMinutes: number;
    overlapType: 'partial' | 'complete';
    notes?: string;
  }[];
}

// 重複チェック結果
export interface OverlapCheckResult {
  hasOverlap: boolean;
  overlapDetails: {
    overlapCount: number;
    requestedTime: string;
    overlappingSlots: {
      id: string;
      startMinutes: number;
      endMinutes: number;
      notes?: string;
    }[];
  };
}

// 複製操作用の型
export interface CopyAvailabilityRequest {
  sourceSlotIds: string[];
  targetDates: string[];
  excludeDates?: string[];
}

// ユーティリティ関数の型
export interface TimeUtils {
  timeToMinutes: (time: string) => number;
  minutesToTime: (minutes: number) => string;
  formatTimeRange: (startMinutes: number, endMinutes: number) => string;
}
