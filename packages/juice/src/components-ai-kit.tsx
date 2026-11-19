"use client";
import {
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { clsx } from 'clsx';
import {
  AlertCircle,
  ArrowDown,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  RotateCcw,
  Square,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import {
  composeRefs,
  renderSlottedElement,
  useControllableState,
  useIsomorphicLayoutEffect,
  useJuice,
} from './behaviors.tsx';

// ---------------------------------------------------------------------------
// Issue #23 — ChatContainer & ScrollToBottomButton
// ---------------------------------------------------------------------------

export type ChatContainerContextValue = {
  isAtBottom: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  containerRef: RefObject<HTMLDivElement | null>;
};

const ChatContainerContext = createContext<ChatContainerContextValue | null>(null);

export function useChatContainer(): ChatContainerContextValue | null {
  return useContext(ChatContainerContext);
}

function isScrollAtBottom(el: HTMLElement, threshold: number): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

function prefersReducedMotionNow(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export type ChatContainerRootProps = HTMLAttributes<HTMLDivElement> & {
  stickToBottom?: boolean;
  threshold?: number;
  autoScrollSignal?: unknown;
};

export const ChatContainerRoot = forwardRef<HTMLDivElement, ChatContainerRootProps>(function ChatContainerRoot(
  {
    stickToBottom = true,
    threshold = 80,
    autoScrollSignal,
    className,
    children,
    ...rest
  },
  forwardedRef,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { animate } = useJuice();
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isAtBottomRef = useRef(true);
  const stickRef = useRef(stickToBottom);
  stickRef.current = stickToBottom;
  const thresholdRef = useRef(threshold);
  thresholdRef.current = threshold;

  const updateAtBottom = useCallback((next: boolean) => {
    isAtBottomRef.current = next;
    setIsAtBottom((prev) => (prev === next ? prev : next));
  }, []);

  const pinToBottomInstant = useCallback((el: HTMLDivElement) => {
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'instant' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
    updateAtBottom(true);
  }, [updateAtBottom]);

  const scrollToBottom = useCallback(
    (behavior?: ScrollBehavior) => {
      const el = containerRef.current;
      if (!el) return;
      const reduced = !animate || prefersReducedMotionNow();
      const resolvedBehavior: ScrollBehavior = reduced ? 'instant' : (behavior ?? 'smooth');
      if (typeof el.scrollTo === 'function') {
        el.scrollTo({ top: el.scrollHeight, behavior: resolvedBehavior });
      } else {
        el.scrollTop = el.scrollHeight;
      }
      updateAtBottom(true);
    },
    [animate, updateAtBottom],
  );

  useIsomorphicLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      updateAtBottom(isScrollAtBottom(el, thresholdRef.current));
    };

    handleScroll();
    el.addEventListener('scroll', handleScroll, { passive: true });

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      const contentTarget =
        el.querySelector<HTMLElement>('[data-chat-content]') ??
        (el.firstElementChild instanceof HTMLElement ? el.firstElementChild : null);

      resizeObserver = new ResizeObserver(() => {
        if (stickRef.current && isAtBottomRef.current) {
          pinToBottomInstant(el);
        } else {
          updateAtBottom(isScrollAtBottom(el, thresholdRef.current));
        }
      });

      resizeObserver.observe(el);
      if (contentTarget && contentTarget !== el) {
        resizeObserver.observe(contentTarget);
      }
    }

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver?.disconnect();
    };
  }, [pinToBottomInstant, updateAtBottom]);

  useIsomorphicLayoutEffect(() => {
    if (autoScrollSignal === undefined) return;
    const el = containerRef.current;
    if (!el) return;
    if (stickToBottom && isAtBottomRef.current) {
      pinToBottomInstant(el);
    }
  }, [autoScrollSignal, stickToBottom, pinToBottomInstant]);

  const contextValue = useMemo<ChatContainerContextValue>(
    () => ({
      isAtBottom,
      scrollToBottom,
      containerRef,
    }),
    [isAtBottom, scrollToBottom],
  );

  return (
    <ChatContainerContext.Provider value={contextValue}>
      <div
        {...rest}
        ref={composeRefs(containerRef, forwardedRef)}
        data-chat-container=""
        data-at-bottom={isAtBottom ? 'true' : 'false'}
        className={clsx('j-chat-container', className)}
      >
        {children}
      </div>
    </ChatContainerContext.Provider>
  );
});

export type ChatContainerContentProps = HTMLAttributes<HTMLDivElement>;

export const ChatContainerContent = forwardRef<HTMLDivElement, ChatContainerContentProps>(
  function ChatContainerContent({ className, ...rest }, ref) {
    return (
      <div
        {...rest}
        ref={ref}
        data-chat-content=""
        className={clsx('j-chat-content', className)}
      />
    );
  },
);

export type ChatContainerScrollAnchorProps = HTMLAttributes<HTMLDivElement>;

export const ChatContainerScrollAnchor = forwardRef<HTMLDivElement, ChatContainerScrollAnchorProps>(
  function ChatContainerScrollAnchor({ className, ...rest }, ref) {
    return (
      <div
        {...rest}
        ref={ref}
        aria-hidden="true"
        data-chat-scroll-anchor=""
        className={clsx('j-chat-scroll-anchor', className)}
      />
    );
  },
);

export type ScrollToBottomButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  visible?: boolean;
  label?: string;
  behavior?: ScrollBehavior;
  icon?: ReactNode;
};

export const ScrollToBottomButton = forwardRef<HTMLButtonElement, ScrollToBottomButtonProps>(
  function ScrollToBottomButton(
    {
      visible,
      label,
      behavior,
      icon,
      type = 'button',
      className,
      children,
      onClick,
      ...rest
    },
    ref,
  ) {
    const ctx = useChatContainer();
    const { playSound } = useJuice();
    const shown = visible !== undefined ? visible : ctx ? !ctx.isAtBottom : false;
    const ariaLabel = label ?? 'Scroll to bottom';

    return (
      <button
        {...rest}
        ref={ref}
        type={type}
        className={clsx('j-scroll-bottom', children != null && 'j-scroll-bottom--pill', className)}
        data-visible={shown ? 'true' : 'false'}
        aria-label={ariaLabel}
        aria-hidden={!shown}
        tabIndex={shown ? 0 : -1}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            playSound('tap');
            ctx?.scrollToBottom(behavior);
          }
        }}
      >
        {icon ?? <ArrowDown size={15} aria-hidden="true" />}
        {children != null && <span className="j-scroll-bottom-label">{children}</span>}
      </button>
    );
  },
);

// ---------------------------------------------------------------------------
// Issue #24 — ChatMessage, MessageAvatar, MessageContent, MessageActions,
//             MessageAction, FeedbackBar
// ---------------------------------------------------------------------------

export type ChatMessageRole = 'user' | 'assistant' | 'system';
export type ChatMessageVariant = 'bubble' | 'flat';

type ChatMessageContextValue = {
  role: ChatMessageRole;
  variant: ChatMessageVariant;
};

const ChatMessageContext = createContext<ChatMessageContextValue | null>(null);

export type ChatMessageProps = Omit<HTMLAttributes<HTMLElement>, 'role'> & {
  role?: ChatMessageRole;
  variant?: ChatMessageVariant;
};

export const ChatMessage = forwardRef<HTMLElement, ChatMessageProps>(function ChatMessage(
  {
    role = 'assistant',
    variant,
    className,
    children,
    ...rest
  },
  ref,
) {
  const resolvedVariant: ChatMessageVariant = variant ?? (role === 'user' ? 'bubble' : 'flat');
  const ctxValue = useMemo<ChatMessageContextValue>(
    () => ({ role, variant: resolvedVariant }),
    [role, resolvedVariant],
  );

  return (
    <ChatMessageContext.Provider value={ctxValue}>
      <article
        {...rest}
        ref={ref}
        data-role={role}
        data-variant={resolvedVariant}
        className={clsx('j-chat-msg', className)}
      >
        {children}
      </article>
    </ChatMessageContext.Provider>
  );
});

export type MessageAvatarProps = HTMLAttributes<HTMLDivElement> & {
  src?: string;
  alt?: string;
  fallback?: ReactNode;
  icon?: ReactNode;
};

export const MessageAvatar = forwardRef<HTMLDivElement, MessageAvatarProps>(function MessageAvatar(
  { src, alt, fallback, icon, className, children, ...rest },
  ref,
) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const showImg = Boolean(src) && !imgFailed;

  return (
    <div {...rest} ref={ref} className={clsx('j-msg-avatar', className)}>
      {showImg ? (
        <img
          src={src}
          alt={alt ?? ''}
          className="j-msg-avatar-img"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="j-msg-avatar-fallback" aria-label={!showImg && alt ? alt : undefined}>
          {icon ?? fallback ?? children}
        </span>
      )}
    </div>
  );
});

export type MessageContentProps = HTMLAttributes<HTMLDivElement> & {
  variant?: ChatMessageVariant;
};

export const MessageContent = forwardRef<HTMLDivElement, MessageContentProps>(function MessageContent(
  { variant, className, children, ...rest },
  ref,
) {
  const msgCtx = useContext(ChatMessageContext);
  const resolvedVariant = variant ?? msgCtx?.variant ?? 'flat';

  return (
    <div
      {...rest}
      ref={ref}
      data-variant={resolvedVariant}
      className={clsx(
        'j-chat-msg-content',
        resolvedVariant === 'bubble' && 'j-chat-bubble',
        className,
      )}
    >
      {children}
    </div>
  );
});

export type MessageActionsProps = HTMLAttributes<HTMLDivElement> & {
  reveal?: 'hover' | 'always';
};

export const MessageActions = forwardRef<HTMLDivElement, MessageActionsProps>(function MessageActions(
  { reveal = 'hover', className, role = 'toolbar', ...rest },
  ref,
) {
  return (
    <div
      {...rest}
      ref={ref}
      role={role}
      data-reveal={reveal}
      className={clsx('j-msg-actions', className)}
    />
  );
});

export type MessageActionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
};

export const MessageAction = forwardRef<HTMLButtonElement, MessageActionProps>(function MessageAction(
  {
    label,
    active,
    type = 'button',
    disabled = false,
    className,
    children,
    onClick,
    ...rest
  },
  ref,
) {
  const { playSound } = useJuice();

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      data-active={active ? 'true' : undefined}
      className={clsx('j-msg-action', className)}
      onClick={(event) => {
        if (!disabled) playSound('tap');
        onClick?.(event);
      }}
    >
      {children}
    </button>
  );
});

export type FeedbackValue = 'up' | 'down' | null;

export type FeedbackBarProps = HTMLAttributes<HTMLDivElement> & {
  onCopy?: () => void;
  copied?: boolean;
  onRegenerate?: () => void;
  feedback?: FeedbackValue;
  onFeedback?: (next: FeedbackValue) => void;
  extra?: ReactNode;
  reveal?: 'hover' | 'always';
  copyLabel?: string;
  copiedLabel?: string;
  regenerateLabel?: string;
  helpfulLabel?: string;
  unhelpfulLabel?: string;
};

export const FeedbackBar = forwardRef<HTMLDivElement, FeedbackBarProps>(function FeedbackBar(
  {
    onCopy,
    copied = false,
    onRegenerate,
    feedback = null,
    onFeedback,
    extra,
    reveal = 'hover',
    copyLabel = 'Copy',
    copiedLabel = 'Copied',
    regenerateLabel = 'Regenerate',
    helpfulLabel = 'Helpful',
    unhelpfulLabel = 'Not helpful',
    className,
    ...rest
  },
  ref,
) {
  return (
    <MessageActions
      {...rest}
      ref={ref}
      reveal={reveal}
      className={clsx('j-feedback-bar', className)}
    >
      {onCopy && (
        <MessageAction
          label={copied ? copiedLabel : copyLabel}
          active={copied}
          onClick={onCopy}
        >
          {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
        </MessageAction>
      )}
      {onRegenerate && (
        <MessageAction label={regenerateLabel} onClick={onRegenerate}>
          <RotateCcw size={13} aria-hidden="true" />
        </MessageAction>
      )}
      {onFeedback && (
        <>
          <MessageAction
            label={helpfulLabel}
            active={feedback === 'up'}
            onClick={() => onFeedback(feedback === 'up' ? null : 'up')}
          >
            <ThumbsUp size={13} aria-hidden="true" />
          </MessageAction>
          <MessageAction
            label={unhelpfulLabel}
            active={feedback === 'down'}
            onClick={() => onFeedback(feedback === 'down' ? null : 'down')}
          >
            <ThumbsDown size={13} aria-hidden="true" />
          </MessageAction>
        </>
      )}
      {extra}
    </MessageActions>
  );
});

// ---------------------------------------------------------------------------
// Issue #25 — ChainOfThought*, ToolCallCard, ThinkingBar
// ---------------------------------------------------------------------------

export type ChainOfThoughtProps = HTMLAttributes<HTMLDivElement>;

export const ChainOfThought = forwardRef<HTMLDivElement, ChainOfThoughtProps>(function ChainOfThought(
  { className, ...rest },
  ref,
) {
  return <div {...rest} ref={ref} className={clsx('j-cot', className)} />;
});

export type ChainOfThoughtStepStatus = 'pending' | 'running' | 'done' | 'error';

type ChainOfThoughtStepContextValue = {
  status: ChainOfThoughtStepStatus;
  open: boolean;
  setOpen: (next: boolean) => void;
  contentId: string;
};

const ChainOfThoughtStepContext = createContext<ChainOfThoughtStepContextValue | null>(null);

export type ChainOfThoughtStepProps = HTMLAttributes<HTMLDivElement> & {
  status?: ChainOfThoughtStepStatus;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const ChainOfThoughtStep = forwardRef<HTMLDivElement, ChainOfThoughtStepProps>(
  function ChainOfThoughtStep(
    {
      status = 'done',
      open: controlledOpen,
      defaultOpen = false,
      onOpenChange,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const contentId = useId();
    const [expanded, setExpanded] = useControllableState({
      value: controlledOpen,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    });

    const ctxValue = useMemo<ChainOfThoughtStepContextValue>(
      () => ({
        status,
        open: expanded,
        setOpen: setExpanded,
        contentId,
      }),
      [status, expanded, setExpanded, contentId],
    );

    return (
      <ChainOfThoughtStepContext.Provider value={ctxValue}>
        <div
          {...rest}
          ref={ref}
          data-status={status}
          data-state={expanded ? 'open' : 'closed'}
          className={clsx('j-cot-step', className)}
        >
          <span className="j-cot-rail" aria-hidden="true" />
          {children}
        </div>
      </ChainOfThoughtStepContext.Provider>
    );
  },
);

export type ChainOfThoughtTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  leftIcon?: ReactNode;
  meta?: ReactNode;
  collapsible?: boolean;
};

export const ChainOfThoughtTrigger = forwardRef<HTMLButtonElement, ChainOfThoughtTriggerProps>(
  function ChainOfThoughtTrigger(
    {
      leftIcon,
      meta,
      collapsible = true,
      type = 'button',
      className,
      children,
      onClick,
      ...rest
    },
    ref,
  ) {
    const ctx = useContext(ChainOfThoughtStepContext);
    const { playSound } = useJuice();
    const status = ctx?.status ?? 'done';
    const isOpen = ctx?.open ?? false;

    const statusNode =
      leftIcon != null ? (
        leftIcon
      ) : status === 'running' ? (
        <span className="j-status-dot j-status-dot-pulse" data-tone="signal" aria-hidden="true" />
      ) : status === 'done' ? (
        <Check size={12} className="j-cot-icon-ok" aria-hidden="true" />
      ) : status === 'error' ? (
        <AlertCircle size={12} className="j-cot-icon-error" aria-hidden="true" />
      ) : (
        <span className="j-status-dot" aria-hidden="true" />
      );

    return (
      <button
        {...rest}
        ref={ref}
        type={type}
        aria-expanded={collapsible && ctx ? isOpen : undefined}
        aria-controls={collapsible && ctx ? ctx.contentId : undefined}
        data-collapsible={collapsible ? 'true' : 'false'}
        data-state={isOpen ? 'open' : 'closed'}
        className={clsx('j-cot-trigger', className)}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented && collapsible && ctx) {
            playSound('tap');
            ctx.setOpen(!ctx.open);
          }
        }}
      >
        <span className="j-cot-node" aria-hidden="true">
          {statusNode}
        </span>
        <span className={clsx('j-cot-label', status === 'running' && 'j-text-shimmer')}>
          {children}
        </span>
        {meta != null && <span className="j-cot-meta">{meta}</span>}
        {collapsible && (
          <ChevronDown
            size={13}
            className="j-cot-chevron"
            data-open={isOpen ? 'true' : undefined}
            aria-hidden="true"
          />
        )}
      </button>
    );
  },
);

export type ChainOfThoughtContentProps = HTMLAttributes<HTMLDivElement>;

export const ChainOfThoughtContent = forwardRef<HTMLDivElement, ChainOfThoughtContentProps>(
  function ChainOfThoughtContent({ className, children, ...rest }, ref) {
    const ctx = useContext(ChainOfThoughtStepContext);
    const isOpen = ctx ? ctx.open : true;

    return (
      <div
        {...rest}
        ref={ref}
        id={ctx?.contentId}
        data-state={isOpen ? 'open' : 'closed'}
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
        className={clsx('j-collapsible-grid j-cot-content-grid', className)}
      >
        <div className="j-collapsible-inner">
          <div className="j-cot-content">{children}</div>
        </div>
      </div>
    );
  },
);

export type ChainOfThoughtItemProps = HTMLAttributes<HTMLDivElement>;

export const ChainOfThoughtItem = forwardRef<HTMLDivElement, ChainOfThoughtItemProps>(
  function ChainOfThoughtItem({ className, ...rest }, ref) {
    return <div {...rest} ref={ref} className={clsx('j-cot-item', className)} />;
  },
);

export type ToolCallStatus = 'pending' | 'running' | 'completed' | 'error';

export type ToolCallCardProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
  name: string;
  title?: ReactNode;
  status?: ToolCallStatus;
  summary?: ReactNode;
  input?: ReactNode;
  output?: ReactNode;
  error?: ReactNode;
  duration?: string;
  actions?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const ToolCallCard = forwardRef<HTMLDivElement, ToolCallCardProps>(function ToolCallCard(
  {
    name,
    title,
    status = 'completed',
    summary,
    input,
    output,
    error,
    duration,
    actions,
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    className,
    children,
    ...rest
  },
  ref,
) {
  const bodyId = useId();
  const { playSound } = useJuice();
  const [expanded, setExpanded] = useControllableState({
    value: controlledOpen,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const hasBody = input != null || output != null || error != null || children != null;

  const statusIndicator =
    status === 'running' ? (
      <span className="j-status-dot j-status-dot-pulse" data-tone="signal" aria-hidden="true" />
    ) : status === 'completed' ? (
      <Check size={13} className="j-tool-icon-ok" aria-hidden="true" />
    ) : status === 'error' ? (
      <AlertCircle size={13} className="j-tool-icon-error" aria-hidden="true" />
    ) : (
      <span className="j-status-dot" aria-hidden="true" />
    );

  return (
    <div
      {...rest}
      ref={ref}
      data-tool={name}
      data-status={status}
      data-state={expanded ? 'open' : 'closed'}
      className={clsx('j-tool-card', className)}
    >
      <div className="j-tool-card-head">
        {hasBody ? (
          <button
            type="button"
            className="j-tool-card-trigger"
            aria-expanded={expanded}
            aria-controls={bodyId}
            onClick={() => {
              playSound('tap');
              setExpanded(!expanded);
            }}
          >
            <span className="j-tool-card-indicator">{statusIndicator}</span>
            <span className={clsx('j-tool-card-title', status === 'running' && 'j-text-shimmer')}>
              {title ?? name}
            </span>
            {summary != null && <span className="j-tool-card-summary">{summary}</span>}
            {duration != null && <span className="j-tool-card-duration">{duration}</span>}
            <ChevronDown
              size={13}
              className="j-cot-chevron"
              data-open={expanded ? 'true' : undefined}
              aria-hidden="true"
            />
          </button>
        ) : (
          <div className="j-tool-card-static">
            <span className="j-tool-card-indicator">{statusIndicator}</span>
            <span className={clsx('j-tool-card-title', status === 'running' && 'j-text-shimmer')}>
              {title ?? name}
            </span>
            {summary != null && <span className="j-tool-card-summary">{summary}</span>}
            {duration != null && <span className="j-tool-card-duration">{duration}</span>}
          </div>
        )}
        {actions != null && <div className="j-tool-card-actions">{actions}</div>}
      </div>

      {hasBody && (
        <div
          id={bodyId}
          className="j-collapsible-grid"
          data-state={expanded ? 'open' : 'closed'}
          aria-hidden={!expanded}
          inert={!expanded ? true : undefined}
        >
          <div className="j-collapsible-inner">
            <div className="j-tool-card-body">
              {input != null && (
                <div className="j-tool-section">
                  <div className="j-tool-section-label">Input</div>
                  <div className="j-tool-section-content">{input}</div>
                </div>
              )}
              {output != null && (
                <div className="j-tool-section">
                  <div className="j-tool-section-label">Output</div>
                  <div className="j-tool-section-content">{output}</div>
                </div>
              )}
              {error != null && (
                <div className="j-tool-section" data-tone="error">
                  <div className="j-tool-section-label">Error</div>
                  <div className="j-tool-section-content">{error}</div>
                </div>
              )}
              {children != null && <div className="j-tool-card-custom">{children}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export type ThinkingBarProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  detail?: ReactNode;
  active?: boolean;
  onExpand?: () => void;
  onStop?: () => void;
  stopLabel?: string;
};

export const ThinkingBar = forwardRef<HTMLDivElement, ThinkingBarProps>(function ThinkingBar(
  {
    label,
    detail,
    active = true,
    onExpand,
    onStop,
    stopLabel = 'Stop',
    className,
    ...rest
  },
  ref,
) {
  const { playSound } = useJuice();

  const innerContent = (
    <>
      <span
        className={clsx('j-status-dot', active && 'j-status-dot-pulse')}
        data-tone={active ? 'signal' : 'ok'}
        aria-hidden="true"
      />
      <span className={clsx('j-thinking-bar-label', active && 'j-text-shimmer')}>{label}</span>
      {detail != null && <span className="j-thinking-bar-detail">{detail}</span>}
      {onExpand && <ChevronRight size={13} className="j-thinking-bar-chevron" aria-hidden="true" />}
    </>
  );

  return (
    <div
      {...rest}
      ref={ref}
      role="status"
      aria-live="polite"
      data-active={active ? 'true' : 'false'}
      className={clsx('j-thinking-bar', className)}
    >
      {onExpand ? (
        <button
          type="button"
          className="j-thinking-bar-main j-thinking-bar-expand"
          onClick={() => {
            playSound('tap');
            onExpand();
          }}
        >
          {innerContent}
        </button>
      ) : (
        <div className="j-thinking-bar-main">{innerContent}</div>
      )}

      {onStop && (
        <button
          type="button"
          className="j-thinking-bar-stop"
          aria-label={stopLabel}
          onClick={() => {
            playSound('tap');
            onStop();
          }}
        >
          <Square size={10} aria-hidden="true" />
          <span>{stopLabel}</span>
        </button>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Issue #26 — PromptSuggestion, CodeBlock*, SourceChip, SourceList
// ---------------------------------------------------------------------------

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderHighlightedText(text: string, highlight: string): ReactNode {
  if (!highlight) return text;
  const regex = new RegExp(`(${escapeRegExp(highlight)})`, 'gi');
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  const lower = highlight.toLowerCase();
  return parts.map((part, index) =>
    part.toLowerCase() === lower ? (
      <mark key={index} className="j-prompt-suggestion-mark">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export type PromptSuggestionVariant = 'pill' | 'row';

export type PromptSuggestionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: PromptSuggestionVariant;
  highlight?: string;
  icon?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
};

export const PromptSuggestion = forwardRef<HTMLButtonElement, PromptSuggestionProps>(
  function PromptSuggestion(
    {
      variant = 'pill',
      highlight,
      icon,
      description,
      disabled = false,
      type = 'button',
      className,
      children,
      onClick,
      ...rest
    },
    ref,
  ) {
    const { playSound } = useJuice();
    const labelNode =
      highlight && typeof children === 'string'
        ? renderHighlightedText(children, highlight)
        : children;

    return (
      <button
        {...rest}
        ref={ref}
        type={type}
        disabled={disabled}
        data-variant={variant}
        className={clsx(
          'j-prompt-suggestion',
          variant === 'row' && 'j-prompt-suggestion--row',
          className,
        )}
        onClick={(event) => {
          if (!disabled) playSound('tap');
          onClick?.(event);
        }}
      >
        {icon != null && (
          <span className="j-prompt-suggestion-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="j-prompt-suggestion-body">
          <span className="j-prompt-suggestion-label">{labelNode}</span>
          {description != null && (
            <span className="j-prompt-suggestion-desc">{description}</span>
          )}
        </span>
      </button>
    );
  },
);

export type CodeBlockProps = HTMLAttributes<HTMLDivElement>;

export const CodeBlock = forwardRef<HTMLDivElement, CodeBlockProps>(function CodeBlock(
  { className, ...rest },
  ref,
) {
  return <div {...rest} ref={ref} className={clsx('j-code-block', className)} />;
});

export type CodeBlockHeaderProps = HTMLAttributes<HTMLDivElement> & {
  language?: string;
  filename?: string;
  code?: string;
  copyLabel?: string;
  copiedLabel?: string;
  actions?: ReactNode;
};

export const CodeBlockHeader = forwardRef<HTMLDivElement, CodeBlockHeaderProps>(
  function CodeBlockHeader(
    {
      language,
      filename,
      code,
      copyLabel = 'Copy',
      copiedLabel = 'Copied',
      actions,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const { playSound } = useJuice();
    const [copied, setCopied] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      return () => {
        if (timerRef.current !== null) clearTimeout(timerRef.current);
      };
    }, []);

    const handleCopy = async () => {
      if (code === undefined) return;
      try {
        await navigator.clipboard?.writeText(code);
      } catch {
        // Clipboard API may be unavailable in non-secure contexts
      }
      playSound('tap');
      setCopied(true);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    };

    return (
      <div {...rest} ref={ref} className={clsx('j-code-block-head', className)}>
        <div className="j-code-block-lead">
          {filename != null && <span className="j-code-block-filename">{filename}</span>}
          {language != null && <span className="j-code-block-lang">{language}</span>}
          {children}
        </div>
        <div className="j-code-block-actions">
          {actions}
          {code !== undefined && (
            <button
              type="button"
              className="j-code-copy-btn"
              aria-label={copied ? copiedLabel : copyLabel}
              data-copied={copied ? 'true' : undefined}
              onClick={handleCopy}
            >
              {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
              <span>{copied ? copiedLabel : copyLabel}</span>
            </button>
          )}
        </div>
      </div>
    );
  },
);

export type CodeBlockCodeProps = HTMLAttributes<HTMLDivElement> & {
  code?: string;
  showLineNumbers?: boolean;
};

export const CodeBlockCode = forwardRef<HTMLDivElement, CodeBlockCodeProps>(function CodeBlockCode(
  { code, children, showLineNumbers = false, className, ...rest },
  ref,
) {
  const lines = useMemo(() => {
    if (!showLineNumbers || code === undefined) return null;
    return code.split('\n');
  }, [code, showLineNumbers]);

  return (
    <div
      {...rest}
      ref={ref}
      data-line-numbers={showLineNumbers ? 'true' : undefined}
      className={clsx('j-code-block-body', className)}
    >
      <pre className="j-code-block-pre">
        <code className="j-code-block-code">
          {lines ? (
            lines.map((line, idx) => (
              <span key={idx} className="j-code-line">
                <span className="j-code-line-num" aria-hidden="true">
                  {idx + 1}
                </span>
                <span className="j-code-line-text">{line}</span>
                {idx < lines.length - 1 ? '\n' : null}
              </span>
            ))
          ) : (
            code ?? children
          )}
        </code>
      </pre>
    </div>
  );
});

export type SourceChipProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  icon?: ReactNode;
  label?: ReactNode;
  meta?: ReactNode;
  asChild?: boolean;
};

export const SourceChip = forwardRef<HTMLAnchorElement, SourceChipProps>(function SourceChip(
  {
    icon,
    label,
    meta,
    href,
    target,
    rel,
    asChild = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  const chipClass = clsx('j-source-chip', className);
  const resolvedRel = rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined);

  if (asChild && isValidElement(children)) {
    return renderSlottedElement<HTMLAnchorElement>(
      children as ReactElement,
      { ...rest, href, target, rel: resolvedRel, className: chipClass },
      ref,
      { asChild: true },
    );
  }

  return (
    <a
      {...rest}
      ref={ref}
      href={href}
      target={target}
      rel={resolvedRel}
      className={chipClass}
    >
      {icon != null && (
        <span className="j-source-chip-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {label != null && <span className="j-source-chip-label">{label}</span>}
      {children}
      {meta != null && <span className="j-source-chip-meta">{meta}</span>}
    </a>
  );
});

export type SourceListProps = HTMLAttributes<HTMLDivElement>;

export const SourceList = forwardRef<HTMLDivElement, SourceListProps>(function SourceList(
  { className, role = 'list', ...rest },
  ref,
) {
  return <div {...rest} ref={ref} role={role} className={clsx('j-source-list', className)} />;
});
