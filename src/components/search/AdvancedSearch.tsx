'use client';

import { useState, useCallback } from 'react';
import { logger } from '@/lib/utils/logger';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { PhotoSessionCard } from '@/components/photo-sessions/PhotoSessionCard';
import { useToast } from '@/hooks/use-toast';
import type { PhotoSessionWithOrganizer } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import {
  Search,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  DollarSign,
  Filter,
  X,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import { format } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';

interface SearchFilters {
  keyword: string;
  location: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  priceMin: number | null;
  priceMax: number | null;
  participantsMin: number | null;
  participantsMax: number | null;
  bookingTypes: string[];
  onlyAvailable: boolean;
  sortBy: 'start_time' | 'price_per_person' | 'created_at' | 'max_participants';
  sortOrder: 'asc' | 'desc';
}

// PhotoSessionWithOrganizerを使用

const BOOKING_TYPES = [
  'first_come_first_served',
  'lottery',
  'admin_lottery',
  'priority_booking',
];

export function AdvancedSearch() {
  const { toast } = useToast();
  const t = useTranslations('search');
  const tPhotoSessions = useTranslations('photoSessions');
  const locale = useLocale();
  const dateLocale = locale === 'ja' ? ja : enUS;

  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    location: '',
    dateFrom: null,
    dateTo: null,
    priceMin: null,
    priceMax: null,
    participantsMin: null,
    participantsMax: null,
    bookingTypes: [],
    onlyAvailable: false,
    sortBy: 'start_time',
    sortOrder: 'asc',
  });

  const [sessions, setSessions] = useState<PhotoSessionWithOrganizer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 検索実行
  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    setHasSearched(true);

    try {
      const supabase = createClient();

      let query = supabase
        .from('photo_sessions')
        .select(
          `
          *,
          organizer:profiles(*),
          images:photo_session_images(*),
          _count:bookings(count)
        `
        )
        .eq('is_published', true);

      // キーワード検索
      if (filters.keyword) {
        query = query.or(
          `title.ilike.%${filters.keyword}%,description.ilike.%${filters.keyword}%`
        );
      }

      // 場所検索
      if (filters.location) {
        query = query.or(
          `location.ilike.%${filters.location}%,detailed_address.ilike.%${filters.location}%`
        );
      }

      // 日付範囲
      if (filters.dateFrom) {
        query = query.gte('start_time', filters.dateFrom.toISOString());
      }

      if (filters.dateTo) {
        query = query.lte('start_time', filters.dateTo.toISOString());
      }

      // 価格範囲
      if (filters.priceMin !== null) {
        query = query.gte('price_per_person', filters.priceMin);
      }

      if (filters.priceMax !== null) {
        query = query.lte('price_per_person', filters.priceMax);
      }

      // 参加者数範囲
      if (filters.participantsMin !== null) {
        query = query.gte('max_participants', filters.participantsMin);
      }

      if (filters.participantsMax !== null) {
        query = query.lte('max_participants', filters.participantsMax);
      }

      // 予約方式フィルター
      if (filters.bookingTypes.length > 0) {
        query = query.in('booking_type', filters.bookingTypes);
      }

      // ソート
      const sortOrder = filters.sortOrder === 'desc' ? false : true;
      query = query.order(filters.sortBy, { ascending: sortOrder });

      const { data, error } = await query;

      if (error) {
        toast({
          title: t('error.searchFailed'),
          description: error.message || 'Search failed',
          variant: 'destructive',
        });
        return;
      }

      let results = (data as PhotoSessionWithOrganizer[]) || [];

      // 空きありフィルター（クライアントサイドで適用）
      if (filters.onlyAvailable) {
        results = results.filter(
          session => session.current_participants < session.max_participants
        );
      }

      setSessions(results);
    } catch (error) {
      logger.error('検索エラー:', error);
      toast({
        title: t('error.searchFailed'),
        description: t('error.unexpectedError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast, t]);

  // フィルターリセット
  const handleReset = () => {
    setFilters({
      keyword: '',
      location: '',
      dateFrom: null,
      dateTo: null,
      priceMin: null,
      priceMax: null,
      participantsMin: null,
      participantsMax: null,
      bookingTypes: [],
      onlyAvailable: false,
      sortBy: 'start_time',
      sortOrder: 'asc',
    });
    setSessions([]);
    setHasSearched(false);
  };

  // アクティブフィルター数を計算
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.keyword) count++;
    if (filters.location) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.priceMin !== null || filters.priceMax !== null) count++;
    if (filters.participantsMin !== null || filters.participantsMax !== null)
      count++;
    if (filters.bookingTypes.length > 0) count++;
    if (filters.onlyAvailable) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="space-y-6">
      {/* 検索フィルター */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('filters.title')}
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* キーワード検索 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('filters.keyword')}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={filters.keyword}
                  onChange={e =>
                    setFilters(prev => ({ ...prev, keyword: e.target.value }))
                  }
                  placeholder={t('filters.keywordPlaceholder')}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('filters.location')}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={filters.location}
                  onChange={e =>
                    setFilters(prev => ({ ...prev, location: e.target.value }))
                  }
                  placeholder={t('filters.locationPlaceholder')}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 日付範囲 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('filters.dateRange')}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {t('filters.dateFrom')}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom
                        ? format(filters.dateFrom, 'PPP', {
                            locale: dateLocale,
                          })
                        : t('filters.selectDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom || undefined}
                      onSelect={date =>
                        setFilters(prev => ({
                          ...prev,
                          dateFrom: date || null,
                        }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {t('filters.dateTo')}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo
                        ? format(filters.dateTo, 'PPP', { locale: dateLocale })
                        : t('filters.selectDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo || undefined}
                      onSelect={date =>
                        setFilters(prev => ({ ...prev, dateTo: date || null }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Separator />

          {/* 料金範囲 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('filters.priceRange')}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {t('filters.priceMin')}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={filters.priceMin || ''}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        priceMin: e.target.value
                          ? Number(e.target.value)
                          : null,
                      }))
                    }
                    placeholder="0"
                    className="pl-10"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {t('filters.priceMax')}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={filters.priceMax || ''}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        priceMax: e.target.value
                          ? Number(e.target.value)
                          : null,
                      }))
                    }
                    placeholder="100000"
                    className="pl-10"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* 参加者数範囲 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('filters.participantsRange')}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {t('filters.participantsMin')}
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={filters.participantsMin || ''}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        participantsMin: e.target.value
                          ? Number(e.target.value)
                          : null,
                      }))
                    }
                    placeholder="1"
                    className="pl-10"
                    min="1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  {t('filters.participantsMax')}
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={filters.participantsMax || ''}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        participantsMax: e.target.value
                          ? Number(e.target.value)
                          : null,
                      }))
                    }
                    placeholder="100"
                    className="pl-10"
                    min="1"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* 予約方式 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('filters.bookingTypes')}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BOOKING_TYPES.map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={type}
                    checked={filters.bookingTypes.includes(type)}
                    onCheckedChange={checked => {
                      if (checked) {
                        setFilters(prev => ({
                          ...prev,
                          bookingTypes: [...prev.bookingTypes, type],
                        }));
                      } else {
                        setFilters(prev => ({
                          ...prev,
                          bookingTypes: prev.bookingTypes.filter(
                            t => t !== type
                          ),
                        }));
                      }
                    }}
                  />
                  <label htmlFor={type} className="text-sm">
                    {tPhotoSessions(`bookingType.${type}.title`)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* その他のオプション */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('filters.options')}
            </label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="onlyAvailable"
                checked={filters.onlyAvailable}
                onCheckedChange={checked =>
                  setFilters(prev => ({ ...prev, onlyAvailable: !!checked }))
                }
              />
              <label htmlFor="onlyAvailable" className="text-sm">
                {t('filters.onlyAvailable')}
              </label>
            </div>
          </div>

          <Separator />

          {/* ソート */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('filters.sortBy')}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={filters.sortBy}
                onValueChange={(value: SearchFilters['sortBy']) =>
                  setFilters(prev => ({ ...prev, sortBy: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start_time">
                    {t('filters.sortByStartTime')}
                  </SelectItem>
                  <SelectItem value="price_per_person">
                    {t('filters.sortByPrice')}
                  </SelectItem>
                  <SelectItem value="created_at">
                    {t('filters.sortByCreatedAt')}
                  </SelectItem>
                  <SelectItem value="max_participants">
                    {t('filters.sortByParticipants')}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() =>
                  setFilters(prev => ({
                    ...prev,
                    sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
                  }))
                }
                className="gap-2"
              >
                {filters.sortOrder === 'asc' ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
                {filters.sortOrder === 'asc'
                  ? t('filters.ascending')
                  : t('filters.descending')}
              </Button>
            </div>
          </div>

          {/* アクション */}
          <div className="flex gap-2">
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('searching')}
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  {t('search')}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isLoading}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              {t('reset')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 検索結果 */}
      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('results.title')}</span>
              <Badge variant="secondary">
                {sessions.length} {t('results.count')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">
                  {t('results.noResults')}
                </p>
                <p className="text-sm">{t('results.tryDifferentFilters')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessions.map(session => (
                  <PhotoSessionCard key={session.id} session={session} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
