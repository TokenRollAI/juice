"use client";
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { clsx } from 'clsx';
import { ArrowUp, Check, ChevronDown, Loader2, Search, Square, X } from 'lucide-react';
import {
  composeRefs,
  useControllableState,
  useIsomorphicLayoutEffect,
  useJuice,
} from './behaviors.tsx';
import { Dialog } from './components-composable.tsx';
import { Collapsible } from './components-radix-primitives.tsx';

// ---------------------------------------------------------------------------
// 1. CommandDialog / CommandPalettePrimitive
// ---------------------------------------------------------------------------

export type CommandItem = {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
  shortcut?: ReactNode;
  keywords?: readonly string[];
  disabled?: boolean;
  onSelect?: () => void;
};

export type CommandGroup = {
  id: string;
  heading?: ReactNode;
  items: readonly CommandItem[];
};

export type CommandDialogProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  groups?: readonly CommandGroup[];
  filter?: boolean | ((item: CommandItem, query: string) => boolean);
  placeholder?: string;
  emptyLabel?: ReactNode;
  loading?: boolean;
  loadingLabel?: ReactNode;
  ariaLabel?: string;
  clearLabel?: string;
  closeOnSelect?: boolean;
  children?: ReactNode;
  className?: string;
};

function defaultCommandMatch(item: CommandItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (typeof item.label === 'string' && item.label.toLowerCase().includes(q)) return true;
  if (typeof item.description === 'string' && item.description.toLowerCase().includes(q)) return true;
  if (item.id.toLowerCase().includes(q)) return true;
  if (item.keywords?.some((kw) => kw.toLowerCase().includes(q))) return true;
  return false;
}

export function CommandDialog({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  query: controlledQuery,
  defaultQuery = '',
  onQueryChange,
  groups,
  filter,
  placeholder = 'Search commands…',
  emptyLabel = 'No results found',
  loading = false,
  loadingLabel = 'Loading…',
  ariaLabel = 'Command palette',
  clearLabel = 'Clear search',
  closeOnSelect = true,
  children,
  className,
}: CommandDialogProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { playSound } = useJuice();

  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const [query, setQuery] = useControllableState({
    value: controlledQuery,
    defaultValue: defaultQuery,
    onChange: onQueryChange,
  });

  const shouldFilter = filter !== undefined ? filter : controlledQuery === undefined;

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    if (!shouldFilter || !query.trim()) return groups;
    const predicate = typeof shouldFilter === 'function' ? shouldFilter : defaultCommandMatch;
    return groups
      .map((group) => ({ ...group, items: group.items.filter((item) => predicate(item, query)) }))
      .filter((group) => group.items.length > 0);
  }, [groups, query, shouldFilter]);

  const enabledItems = useMemo(
    () => filteredGroups.flatMap((group) => group.items.filter((item) => !item.disabled)),
    [filteredGroups],
  );

  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const resolvedActiveId = useMemo(() => {
    if (activeId && enabledItems.some((item) => item.id === activeId)) return activeId;
    return enabledItems[0]?.id;
  }, [activeId, enabledItems]);

  useEffect(() => {
    if (!open || !resolvedActiveId) return;
    const container = listRef.current;
    if (!container) return;
    const activeEl = container.querySelector<HTMLElement>(`[data-cmd-id="${CSS.escape ? CSS.escape(resolvedActiveId) : resolvedActiveId}"]`);
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [open, resolvedActiveId]);

  const selectItem = useCallback(
    (item: CommandItem) => {
      if (item.disabled) return;
      playSound('tap');
      item.onSelect?.();
      if (closeOnSelect) {
        setOpen(false);
      }
    },
    [closeOnSelect, playSound, setOpen],
  );

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Escape') {
      if (query.length > 0) {
        event.preventDefault();
        event.stopPropagation();
        setQuery('');
        return;
      }
      // Second Escape (when query is empty) lets Dialog close and restore focus to opener.
      return;
    }

    if (enabledItems.length === 0) return;
    const idx = Math.max(0, enabledItems.findIndex((item) => item.id === resolvedActiveId));

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveId(enabledItems[(idx + 1) % enabledItems.length]?.id);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveId(enabledItems[(idx - 1 + enabledItems.length) % enabledItems.length]?.id);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveId(enabledItems[0]?.id);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveId(enabledItems.at(-1)?.id);
    } else if (event.key === 'Enter') {
      const current = enabledItems.find((item) => item.id === resolvedActiveId);
      if (current) {
        event.preventDefault();
        selectItem(current);
      }
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content
          aria-label={ariaLabel}
          className={clsx('j-cmd-dialog', className)}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus({ preventScroll: true });
          }}
          onEscapeKeyDown={(event) => {
            if (query.length > 0) {
              event.preventDefault();
              setQuery('');
              inputRef.current?.focus({ preventScroll: true });
            }
          }}
        >
          <div className="j-cmd-input-row">
            <Search size={15} className="j-cmd-search-icon" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              className="j-cmd-input"
              value={query}
              placeholder={placeholder}
              aria-label={ariaLabel}
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={resolvedActiveId ? `${listId}-${resolvedActiveId}` : undefined}
              onChange={(event) => {
                setQuery(event.currentTarget.value);
                setActiveId(undefined);
              }}
              onKeyDown={handleInputKeyDown}
            />
            {loading && <Loader2 size={14} className="j-btn-spinner-spin j-cmd-spinner" aria-hidden="true" />}
            {query.length > 0 && (
              <button
                type="button"
                className="j-cmd-clear"
                aria-label={clearLabel}
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus({ preventScroll: true });
                }}
              >
                <X size={13} aria-hidden="true" />
              </button>
            )}
          </div>

          <div ref={listRef} id={listId} role="listbox" aria-label={ariaLabel} className="j-cmd-list">
            {children !== undefined ? (
              children
            ) : loading && enabledItems.length === 0 ? (
              <div role="status" className="j-cmd-empty">{loadingLabel}</div>
            ) : filteredGroups.length === 0 ? (
              <div role="status" className="j-cmd-empty">{emptyLabel}</div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.id} role="group" className="j-cmd-group">
                  {group.heading != null && <div className="j-cmd-group-heading">{group.heading}</div>}
                  {group.items.map((item) => {
                    const active = item.id === resolvedActiveId;
                    return (
                      <button
                        key={item.id}
                        id={`${listId}-${item.id}`}
                        type="button"
                        role="option"
                        tabIndex={-1}
                        disabled={item.disabled}
                        aria-selected={active}
                        aria-disabled={item.disabled || undefined}
                        data-cmd-id={item.id}
                        data-active={active ? 'true' : undefined}
                        className="j-cmd-item"
                        onMouseMove={() => {
                          if (!item.disabled && activeId !== item.id) setActiveId(item.id);
                        }}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectItem(item)}
                      >
                        {item.icon != null && <span className="j-cmd-item-icon" aria-hidden="true">{item.icon}</span>}
                        <span className="j-cmd-item-text">
                          <span className="j-cmd-item-label">{item.label}</span>
                          {item.description != null && <span className="j-cmd-item-desc">{item.description}</span>}
                        </span>
                        {item.meta != null && <span className="j-cmd-item-meta">{item.meta}</span>}
                        {item.shortcut != null && <span className="j-cmd-item-shortcut">{item.shortcut}</span>}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const CommandPalettePrimitive = CommandDialog;

// ---------------------------------------------------------------------------
// 2. AgentActionCard
// ---------------------------------------------------------------------------

export type AgentActionStatus = 'waiting' | 'pending' | 'resolved' | 'rejected' | 'error';

export type AgentActionCardProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  status?: AgentActionStatus;
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  pinned?: boolean;
};

export const AgentActionCard = forwardRef<HTMLDivElement, AgentActionCardProps>(function AgentActionCard(
  {
    status = 'waiting',
    icon,
    title,
    subtitle,
    badge,
    children,
    actions,
    footer,
    pinned = false,
    className,
    ...rest
  },
  ref,
) {
  const dotTone =
    status === 'waiting'
      ? 'signal'
      : status === 'resolved'
        ? 'ok'
        : status === 'rejected' || status === 'error'
          ? 'danger'
          : undefined;
  const resolvedFooter = actions ?? footer;

  return (
    <div
      {...rest}
      ref={ref}
      data-status={status}
      data-pinned={pinned ? 'true' : undefined}
      className={clsx('j-agent-action-card', className)}
    >
      <div className="j-agent-action-head">
        <div className="j-agent-action-lead">
          {icon != null ? (
            <span className="j-agent-action-icon" aria-hidden="true">{icon}</span>
          ) : (
            <span
              className={clsx('j-status-dot', status === 'waiting' && 'j-status-dot-pulse')}
              data-tone={dotTone}
              aria-hidden="true"
            />
          )}
          <div className="j-agent-action-titles">
            <div className="j-agent-action-title">{title}</div>
            {subtitle != null && <div className="j-agent-action-sub">{subtitle}</div>}
          </div>
        </div>
        {badge != null && <div className="j-agent-action-badge">{badge}</div>}
      </div>
      {children != null && <div className="j-agent-action-body">{children}</div>}
      {resolvedFooter != null && <div className="j-agent-action-footer">{resolvedFooter}</div>}
    </div>
  );
});

// ---------------------------------------------------------------------------
// 3. AgentStepRow & AgentReasoningBlock
// ---------------------------------------------------------------------------

export type AgentStepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

export type AgentStepRowProps = HTMLAttributes<HTMLDivElement> & {
  status: AgentStepStatus;
  icon?: ReactNode;
  label: ReactNode;
  meta?: ReactNode;
  detail?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  action?: ReactNode;
};

export function AgentStepRow({
  status,
  icon,
  label,
  meta,
  detail,
  collapsible,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  action,
  className,
  ...rest
}: AgentStepRowProps) {
  const isCollapsible = collapsible ?? detail != null;
  const [expanded, setExpanded] = useControllableState({
    value: controlledOpen,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const statusIndicator = icon ?? (
    status === 'running' ? (
      <span className="j-status-dot j-status-dot-pulse" data-tone="signal" aria-hidden="true" />
    ) : status === 'done' ? (
      <Check size={13} className="j-step-icon-ok" aria-hidden="true" />
    ) : status === 'error' ? (
      <span className="j-status-dot" data-tone="danger" aria-hidden="true" />
    ) : (
      <span className="j-status-dot" aria-hidden="true" />
    )
  );

  const labelContent = (
    <span className={clsx('j-step-label', status === 'running' && 'j-text-shimmer')}>
      {label}
    </span>
  );

  if (isCollapsible && detail != null) {
    return (
      <Collapsible.Root
        {...rest}
        open={expanded}
        onOpenChange={setExpanded}
        data-status={status}
        className={clsx('j-step-row', className)}
      >
        <div className="j-step-row-header">
          <Collapsible.Trigger className="j-step-row-trigger">
            <span className="j-step-indicator">{statusIndicator}</span>
            {labelContent}
            {meta != null && <span className="j-step-meta">{meta}</span>}
            <ChevronDown size={13} className="j-step-chevron" data-open={expanded ? 'true' : undefined} aria-hidden="true" />
          </Collapsible.Trigger>
          {action != null && <div className="j-step-action">{action}</div>}
        </div>
        <Collapsible.Content className="j-step-detail-wrap">
          <div className="j-step-detail">{detail}</div>
        </Collapsible.Content>
      </Collapsible.Root>
    );
  }

  return (
    <div {...rest} data-status={status} className={clsx('j-step-row', className)}>
      <div className="j-step-row-header">
        <div className="j-step-row-static">
          <span className="j-step-indicator">{statusIndicator}</span>
          {labelContent}
          {meta != null && <span className="j-step-meta">{meta}</span>}
        </div>
        {action != null && <div className="j-step-action">{action}</div>}
      </div>
      {detail != null && <div className="j-step-detail">{detail}</div>}
    </div>
  );
}

export type AgentReasoningBlockProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  active?: boolean;
  title: ReactNode;
  icon?: ReactNode;
  duration?: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
};

export function AgentReasoningBlock({
  active = false,
  title,
  icon,
  duration,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  children,
  className,
  ...rest
}: AgentReasoningBlockProps) {
  const [expanded, setExpanded] = useControllableState({
    value: controlledOpen,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  return (
    <Collapsible.Root
      {...rest}
      open={expanded}
      onOpenChange={setExpanded}
      data-active={active ? 'true' : undefined}
      className={clsx('j-reasoning-block', className)}
    >
      <Collapsible.Trigger className="j-reasoning-trigger">
        <span className="j-reasoning-lead">
          {icon != null ? (
            <span className="j-reasoning-icon" aria-hidden="true">{icon}</span>
          ) : (
            <span
              className={clsx('j-status-dot', active && 'j-status-dot-pulse')}
              data-tone={active ? 'signal' : undefined}
              aria-hidden="true"
            />
          )}
          <span className={clsx('j-reasoning-title', active && 'j-text-shimmer')}>{title}</span>
        </span>
        <span className="j-reasoning-trail">
          {duration != null && <span className="j-reasoning-duration">{duration}</span>}
          <ChevronDown size={13} className="j-step-chevron" data-open={expanded ? 'true' : undefined} aria-hidden="true" />
        </span>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <div className="j-reasoning-body">{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

// ---------------------------------------------------------------------------
// 4. PromptComposer
// ---------------------------------------------------------------------------

export type PromptComposerVariant = 'hero' | 'thread' | 'compact';

export type PromptComposerProps = Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'onSubmit'> & {
  variant?: PromptComposerVariant;
  attachments?: ReactNode;
  status?: ReactNode;
  leadingTools?: ReactNode;
  trailingTools?: ReactNode;
  children?: ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  rows?: number;
  textareaRef?: Ref<HTMLTextAreaElement>;
  onSubmit?: (value: string) => void;
  running?: boolean;
  queueing?: boolean;
  onStop?: () => void;
  sendLabel?: string;
  stopLabel?: string;
  queueLabel?: string;
  sendDisabled?: boolean;
};

export const PromptComposer = forwardRef<HTMLDivElement, PromptComposerProps>(function PromptComposer(
  {
    variant = 'thread',
    attachments,
    status,
    leadingTools,
    trailingTools,
    children,
    value: controlledValue,
    defaultValue = '',
    onChange,
    placeholder,
    ariaLabel,
    disabled = false,
    rows,
    textareaRef,
    onSubmit,
    running = false,
    queueing = false,
    onStop,
    sendLabel = 'Send',
    stopLabel = 'Stop',
    queueLabel = 'Queue',
    sendDisabled,
    className,
    ...rest
  },
  forwardedRef,
) {
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { playSound } = useJuice();
  const [value, setValue] = useControllableState({
    value: controlledValue,
    defaultValue,
    onChange,
  });

  const defaultRows = rows ?? (variant === 'hero' ? 3 : variant === 'compact' ? 1 : 2);

  useIsomorphicLayoutEffect(() => {
    const el = internalTextareaRef.current;
    if (!el || children !== undefined) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value, children]);

  const canSend = !disabled && (sendDisabled !== undefined ? !sendDisabled : (children !== undefined || value.trim().length > 0));

  const submit = () => {
    if (!canSend) return;
    playSound('tap');
    onSubmit?.(value);
  };

  const showStop = running && !queueing && Boolean(onStop);

  return (
    <div
      {...rest}
      ref={forwardedRef}
      data-variant={variant}
      data-running={running ? 'true' : undefined}
      data-disabled={disabled ? 'true' : undefined}
      className={clsx('j-composer', className)}
    >
      {attachments != null && <div className="j-composer-attachments">{attachments}</div>}
      {status != null && <div className="j-composer-status">{status}</div>}

      <div className="j-composer-input-area">
        {children !== undefined ? (
          children
        ) : (
          <textarea
            ref={composeRefs(internalTextareaRef, textareaRef)}
            className="j-composer-textarea"
            rows={defaultRows}
            value={value}
            placeholder={placeholder}
            aria-label={ariaLabel ?? placeholder}
            disabled={disabled}
            onChange={(event) => setValue(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === 'Enter' && !event.shiftKey && onSubmit) {
                event.preventDefault();
                submit();
              }
            }}
          />
        )}
      </div>

      <div className="j-composer-toolbar">
        <div className="j-composer-tools-leading">{leadingTools}</div>
        <div className="j-composer-tools-trailing">
          {trailingTools}
          {showStop ? (
            <button
              type="button"
              className="j-btn j-composer-action"
              data-variant="danger"
              data-size="sm"
              aria-label={stopLabel}
              onClick={() => {
                playSound('tap');
                onStop?.();
              }}
            >
              <Square size={12} aria-hidden="true" />
              <span>{stopLabel}</span>
            </button>
          ) : (
            <button
              type="button"
              className="j-btn j-composer-action"
              data-variant={queueing ? 'secondary' : 'primary'}
              data-size="sm"
              disabled={!canSend}
              aria-label={queueing ? queueLabel : sendLabel}
              onClick={submit}
            >
              <ArrowUp size={13} aria-hidden="true" />
              <span>{queueing ? queueLabel : sendLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// 5. DiffBlock
// ---------------------------------------------------------------------------

export type DiffLine = {
  type: 'context' | 'add' | 'del';
  text: string;
  lineNumber?: number;
};

export type DiffBlockProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  lines: readonly DiffLine[];
  title?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
};

export const DiffBlock = forwardRef<HTMLDivElement, DiffBlockProps>(function DiffBlock(
  { lines, title, meta, actions, className, ...rest },
  ref,
) {
  const hasHeader = title != null || meta != null || actions != null;
  return (
    <div {...rest} ref={ref} className={clsx('j-diff-block', className)}>
      {hasHeader && (
        <div className="j-diff-header">
          <div className="j-diff-header-lead">
            {title != null && <span className="j-diff-title">{title}</span>}
            {meta != null && <span className="j-diff-meta">{meta}</span>}
          </div>
          {actions != null && <div className="j-diff-actions">{actions}</div>}
        </div>
      )}
      <div className="j-diff-body" role="region" aria-label={typeof title === 'string' ? title : undefined}>
        {lines.map((line, index) => {
          const prefix = line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' ';
          return (
            <div key={index} className="j-diff-line" data-type={line.type}>
              {line.lineNumber !== undefined && (
                <span className="j-diff-gutter" aria-hidden="true">{line.lineNumber}</span>
              )}
              <span className="j-diff-sign" aria-hidden="true">{prefix}</span>
              <span className="j-diff-text">{line.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
