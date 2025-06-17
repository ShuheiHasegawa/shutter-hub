'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, User, Plus, AtSign } from 'lucide-react';
import { MentionableUser } from '@/types/photo-consent';

interface MentionTagInputProps {
  value: string[];
  onChange: (usernames: string[]) => void;
  onSearch: (query: string) => void;
  suggestions: MentionableUser[];
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
}

export const MentionTagInput: React.FC<MentionTagInputProps> = ({
  value,
  onChange,
  onSearch,
  suggestions,
  placeholder = '@ユーザー名を入力してモデルをタグ付け...',
  disabled = false,
  maxTags = 10,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 検索実行とドロップダウン表示制御
  useEffect(() => {
    if (inputValue.length > 0) {
      onSearch(inputValue);
      setIsOpen(true);
      setFocusedIndex(-1);
    } else {
      setIsOpen(false);
    }
  }, [inputValue, onSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // @記号で始まるように調整
    if (newValue && !newValue.startsWith('@')) {
      newValue = '@' + newValue;
    }

    setInputValue(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (isOpen && suggestions.length > 0) {
          setFocusedIndex(prev =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (isOpen && suggestions.length > 0) {
          setFocusedIndex(prev =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (isOpen && focusedIndex >= 0 && suggestions[focusedIndex]) {
          addTag(suggestions[focusedIndex]);
        }
        break;

      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        inputRef.current?.blur();
        break;

      case 'Backspace':
        if (inputValue === '' && value.length > 0) {
          // 最後のタグを削除
          onChange(value.slice(0, -1));
        }
        break;
    }
  };

  const addTag = (user: MentionableUser) => {
    if (value.includes(user.username) || value.length >= maxTags) return;

    onChange([...value, user.username]);
    setInputValue('');
    setIsOpen(false);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  };

  const removeTag = (username: string) => {
    onChange(value.filter(tag => tag !== username));
    inputRef.current?.focus();
  };

  const filteredSuggestions = suggestions.filter(
    user =>
      !value.includes(user.username) &&
      user.username
        .toLowerCase()
        .includes(inputValue.replace('@', '').toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative">
      {/* 入力エリア */}
      <div
        className={`flex flex-wrap items-center gap-2 p-3 border border-gray-300 rounded-lg min-h-[3rem] bg-white ${
          disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-text'
        } ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-gray-400'}`}
        onClick={() => {
          if (!disabled) {
            inputRef.current?.focus();
          }
        }}
      >
        {/* 選択済みタグ */}
        <AnimatePresence>
          {value.map(username => (
            <motion.div
              key={username}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
            >
              <AtSign size={12} />
              <span>{username}</span>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  removeTag(username);
                }}
                className="ml-1 text-blue-600 hover:text-blue-800 transition-colors"
                disabled={disabled}
              >
                <X size={12} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 入力フィールド */}
        <div className="flex-1 min-w-[120px]">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (inputValue) {
                setIsOpen(true);
              }
            }}
            placeholder={value.length === 0 ? placeholder : ''}
            disabled={disabled || value.length >= maxTags}
            className="w-full bg-transparent outline-none text-sm placeholder-gray-400 disabled:cursor-not-allowed"
          />
        </div>

        {/* 検索アイコン */}
        <div className="text-gray-400">
          <Search size={16} />
        </div>
      </div>

      {/* タグ数表示 */}
      <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
        <span>{value.length > 0 && `${value.length}人のモデルをタグ付け`}</span>
        <span>
          {value.length}/{maxTags}
        </span>
      </div>

      {/* 候補リスト */}
      <AnimatePresence>
        {isOpen && filteredSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {filteredSuggestions.map((user, index) => (
              <motion.button
                key={user.id}
                type="button"
                onClick={() => addTag(user)}
                className={`w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 transition-colors ${
                  index === focusedIndex
                    ? 'bg-blue-50 border-l-2 border-blue-500'
                    : ''
                }`}
                whileHover={{ x: 2 }}
              >
                {/* アバター */}
                <div className="relative w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.displayName}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={16} className="text-gray-500" />
                  )}
                </div>

                {/* ユーザー情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900 truncate">
                      {user.displayName}
                    </span>
                    <span className="text-sm text-gray-500">
                      @{user.username}
                    </span>
                  </div>

                  {/* フォロー状態表示 */}
                  <div className="flex items-center space-x-2 mt-1">
                    {user.isFollowing && (
                      <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                        フォロー中
                      </span>
                    )}
                    {user.isFollower && (
                      <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                        フォロワー
                      </span>
                    )}
                  </div>
                </div>

                {/* 追加アイコン */}
                <Plus size={16} className="text-gray-400" />
              </motion.button>
            ))}

            {/* 検索結果がない場合 */}
            {inputValue && filteredSuggestions.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                {inputValue.replace('@', '')}
                に一致するユーザーが見つかりません
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
