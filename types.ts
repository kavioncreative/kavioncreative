
// Added missing React import to fix "Cannot find namespace 'React'" errors
import React from 'react';

// CODESLOGIC - DESIGN LANGUAGE DEFINITIONS
// 'metallic' variant adapts based on component context:
// - "CodesLogic Elevated": For surfaces, cards, and headers (Raised look, diagonal shine, outer shadow)
// - "CodesLogic Recessed": For inputs and dropdowns (Deep sunken/machined look, inner top shadow, bottom rim light)
// - "CodesLogic Metallic": For buttons and active states (Vibrant orange gradient, glowing, shine overlay)
export type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'error' | 'success' | 'metallic' | 'recessed' | 'metallic-error' | 'metallic-dispute' | 'metallic-arthelp' | 'metallic-success' | 'flat';
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'none';

export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, ComponentProps {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>, ComponentProps {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: Size;
  variant?: Variant;
  inputClassName?: string;
  isLoading?: boolean;
}

export interface TableColumn<T> {
  header: React.ReactNode;
  key: string;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> extends ComponentProps {
  columns: TableColumn<T>[];
  data: T[] | null;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  skeletonCount?: number;
  isMetallicHeader?: boolean;
  disableRowHover?: boolean;
  dense?: boolean;
  isDense?: boolean;
}

export interface DropdownOption {
  value: string;
  label: string;
  labelClassName?: string;
  icon?: React.ReactNode;
  description?: string;
  descriptionClassName?: string;
  disabled?: boolean;
}

export interface DropdownProps extends ComponentProps {
  options: DropdownOption[];
  value?: string | string[];
  onChange: (value: any) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  isMulti?: boolean;
  showSearch?: boolean;
  searchPlaceholder?: string;
  error?: string;
  size?: Size;
  variant?: Variant;
  selectionLabel?: string;
  menuClassName?: string;
  isCreatable?: boolean;
  onCreate?: (value: string) => void;
}

export interface TimeSelectProps extends ComponentProps {
  value?: string; // Format: "HH:mm"
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  isInline?: boolean;
  variant?: Variant;
  applyLabel?: string;
}

export interface AvatarProps extends ComponentProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: Size;
  status?: 'online' | 'offline' | 'busy' | 'away';
  disabled?: boolean;
  loading?: boolean;
  onLoad?: () => void;
  onError?: (err: any) => void;
}

export interface KebabMenuOption {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export interface CalendarProps extends ComponentProps {
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
}

export interface DatePickerProps extends ComponentProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  variant?: Variant;
}

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface UploadPreviewProps extends ComponentProps {
  status?: UploadStatus;
  progress?: number;
  imageSrc?: string;
  variant?: 'rectangular' | 'circular' | 'recessed';
  fileName?: string;
  fileSize?: string;
  errorMessage?: string;
  onRemove?: () => void;
  onReplace?: () => void;
  onView?: () => void;
  onUpload?: () => void;
}

// Toast Types
export type ToastType = 'success' | 'error' | 'info';
export type ToastPosition = 'top-center' | 'bottom-center' | 'bottom-right';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  silent?: boolean;
}
