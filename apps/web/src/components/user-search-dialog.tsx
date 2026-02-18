'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog } from './dialog';
import { Button } from './button';
import { api } from '@/lib/api';

interface User {
  id: number;
  email: string;
  username?: string;
  subscriptionTier: string;
  isVerified: boolean;
}

interface UserSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (user: User) => void;
  title?: string;
  /** If true, allows selecting multiple users */
  multiSelect?: boolean;
  onMultiSelect?: (users: User[]) => void;
}

export function UserSearchDialog({
  open,
  onClose,
  onSelect,
  title = 'Search User',
  multiSelect = false,
  onMultiSelect,
}: UserSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedUsers([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const search = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getUsers({ search: term }) as User[];
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(value), 300);
    },
    [search],
  );

  const handleSelectUser = useCallback(
    (user: User) => {
      if (multiSelect) {
        if (!selectedUsers.find((u) => u.id === user.id)) {
          setSelectedUsers((prev) => [...prev, user]);
        }
      } else {
        onSelect(user);
      }
    },
    [multiSelect, onSelect, selectedUsers],
  );

  const removeUser = useCallback((userId: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  const handleConfirmMulti = useCallback(() => {
    if (onMultiSelect && selectedUsers.length > 0) {
      onMultiSelect(selectedUsers);
    }
  }, [onMultiSelect, selectedUsers]);

  const filteredResults = multiSelect
    ? results.filter((r) => !selectedUsers.find((s) => s.id === r.id))
    : results;

  return (
    <Dialog open={open} onClose={onClose} title={title} className="max-w-lg">
      <div className="space-y-3">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search by email or ID..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {multiSelect && selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((user) => (
              <span
                key={user.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
              >
                {user.email}
                <button
                  onClick={() => removeUser(user.id)}
                  className="text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="max-h-[300px] overflow-y-auto">
          {loading && (
            <p className="text-sm text-gray-400 py-4 text-center">Searching...</p>
          )}
          {!loading && query.length > 0 && query.length < 2 && (
            <p className="text-sm text-gray-400 py-4 text-center">
              Type at least 2 characters to search...
            </p>
          )}
          {!loading && query.length >= 2 && filteredResults.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">No users found</p>
          )}
          {!loading &&
            filteredResults.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-md flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="text-sm font-medium">{user.email}</span>
                  <span className="text-xs text-gray-400 ml-2">ID: {user.id}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {user.subscriptionTier === 'GOLD' && (
                    <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                      Gold
                    </span>
                  )}
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded ${user.isVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {user.isVerified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
              </button>
            ))}
        </div>

        {multiSelect && (
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmMulti}
              disabled={selectedUsers.length === 0}
            >
              Create Conversation ({selectedUsers.length})
            </Button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
