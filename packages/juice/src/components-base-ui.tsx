"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type CSSProperties,
  type FieldsetHTMLAttributes,
  type FormEvent,
  type FormHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
} from 'react';
import { clsx } from 'clsx';
import {
  Check,
  ExternalLink,
  Globe,
  Minus,
  MoveHorizontal,
  Plus,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  useControllableState,
  useJuice,
  useJuiceAgentNode,
  useRovingFocus,
  useScrubDrag,
} from './behaviors.tsx';
import {
  Badge,
  Checkbox,
  Kbd,
  RollingNumber,
  SegmentedControl,
} from './components.tsx';

// ---------------------------------------------------------------------------
// Shared Layout Helpers (320px Concentric Slab Geometry: 20px -> 14px -> 10px)
// ---------------------------------------------------------------------------

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const betweenStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
};

const surfaceStyle: CSSProperties = {
  borderRadius: 14,
  background: 'var(--juice-w6)',
  padding: '9px 10px',
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
};

function clampSnap(raw: number, min: number, max: number, step: number, decimals = 4): number {
  if (!Number.isFinite(raw)) return min;
  const bounded = Math.min(max, Math.max(min, raw));
  const snapped = Math.round((bounded - min) / step) * step + min;
  return Number(Math.min(max, Math.max(min, snapped)).toFixed(decimals));
}

// ---------------------------------------------------------------------------
// 0. Base UI Compound Primitives: Form, Fieldset, Field, Meter, Progress,
//    Autocomplete, CheckboxGroup, ScrubNumberField, PreviewCard
// ---------------------------------------------------------------------------

type FormContextValue = {
  errors: Record<string, string | undefined>;
  clearError: (name: string) => void;
};

const FormContext = createContext<FormContextValue | null>(null);

export type FormProps = FormHTMLAttributes<HTMLFormElement> & {
  errors?: Record<string, string | undefined>;
  onClearErrors?: (next: Record<string, string | undefined>) => void;
};

export function Form({
  errors = {},
  onClearErrors,
  children,
  noValidate = true,
  ...rest
}: FormProps) {
  const clearError = useCallback(
    (name: string) => {
      if (!onClearErrors || !errors[name]) return;
      const next = { ...errors };
      delete next[name];
      onClearErrors(next);
    },
    [errors, onClearErrors],
  );

  const ctx = useMemo<FormContextValue>(() => ({ errors, clearError }), [errors, clearError]);

  return (
    <FormContext.Provider value={ctx}>
      <form noValidate={noValidate} {...rest}>
        {children}
      </form>
    </FormContext.Provider>
  );
}

type FieldsetContextValue = {
  legendId: string;
  disabled: boolean;
  setHasLegend: (mounted: boolean) => void;
};

const FieldsetContext = createContext<FieldsetContextValue | null>(null);

function FieldsetRoot({
  disabled = false,
  className,
  style,
  children,
  ...rest
}: FieldsetHTMLAttributes<HTMLFieldSetElement>) {
  const legendId = useId();
  const [hasLegend, setHasLegend] = useState(false);

  const ctx = useMemo<FieldsetContextValue>(
    () => ({ legendId, disabled, setHasLegend }),
    [legendId, disabled],
  );

  return (
    <FieldsetContext.Provider value={ctx}>
      <fieldset
        {...rest}
        disabled={disabled}
        aria-labelledby={rest['aria-labelledby'] ?? (hasLegend ? legendId : undefined)}
        data-disabled={disabled ? 'true' : undefined}
        className={className}
        style={{
          border: 0,
          margin: 0,
          padding: 0,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          ...style,
        }}
      >
        {children}
      </fieldset>
    </FieldsetContext.Provider>
  );
}

function FieldsetLegend({
  id,
  className,
  style,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  const ctx = useContext(FieldsetContext);
  const setHasLegend = ctx?.setHasLegend;

  useEffect(() => {
    if (!setHasLegend) return;
    setHasLegend(true);
    return () => setHasLegend(false);
  }, [setHasLegend]);

  return (
    <div
      {...rest}
      id={id ?? ctx?.legendId}
      data-disabled={ctx?.disabled ? 'true' : undefined}
      className={className}
      style={{
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        ...betweenStyle,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export const Fieldset = {
  Root: FieldsetRoot,
  Legend: FieldsetLegend,
};

type FieldContextValue = {
  name?: string;
  controlId: string;
  descriptionId: string;
  errorId: string;
  describedBy?: string;
  invalid: boolean;
  dirty: boolean;
  touched: boolean;
  disabled: boolean;
  resolvedError?: string;
  setHasDescription: (mounted: boolean) => void;
  setHasError: (mounted: boolean) => void;
  notifyChange: () => void;
};

const FieldContext = createContext<FieldContextValue | null>(null);

function FieldRoot({
  name,
  invalid: invalidProp,
  dirty = false,
  touched = false,
  disabled: disabledProp = false,
  error,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  name?: string;
  invalid?: boolean;
  dirty?: boolean;
  touched?: boolean;
  disabled?: boolean;
  error?: string;
}) {
  const formCtx = useContext(FormContext);
  const fieldsetCtx = useContext(FieldsetContext);
  const controlId = useId();
  const descriptionId = `${controlId}-description`;
  const errorId = `${controlId}-error`;
  const [hasDescription, setHasDescription] = useState(false);
  const [hasError, setHasError] = useState(false);

  const formError = name ? formCtx?.errors[name] : undefined;
  const resolvedError = error ?? formError;
  const invalid = Boolean(invalidProp || resolvedError);
  const disabled = Boolean(disabledProp || fieldsetCtx?.disabled);
  const describedBy = clsx(hasDescription && descriptionId, hasError && errorId) || undefined;

  const notifyChange = useCallback(() => {
    if (name) formCtx?.clearError(name);
  }, [formCtx, name]);

  const ctx = useMemo<FieldContextValue>(
    () => ({
      name,
      controlId,
      descriptionId,
      errorId,
      describedBy,
      invalid,
      dirty,
      touched,
      disabled,
      resolvedError,
      setHasDescription,
      setHasError,
      notifyChange,
    }),
    [
      name,
      controlId,
      descriptionId,
      errorId,
      describedBy,
      invalid,
      dirty,
      touched,
      disabled,
      resolvedError,
      notifyChange,
    ],
  );

  return (
    <FieldContext.Provider value={ctx}>
      <div
        {...rest}
        className={clsx('j-field', className)}
        data-invalid={invalid ? 'true' : undefined}
        data-dirty={dirty ? 'true' : undefined}
        data-touched={touched ? 'true' : undefined}
        data-disabled={disabled ? 'true' : undefined}
      >
        {children}
      </div>
    </FieldContext.Provider>
  );
}

function FieldLabel({
  htmlFor,
  className,
  children,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement>) {
  const ctx = useContext(FieldContext);
  return (
    <label
      {...rest}
      htmlFor={htmlFor ?? ctx?.controlId}
      className={className}
      data-invalid={ctx?.invalid ? 'true' : undefined}
      data-dirty={ctx?.dirty ? 'true' : undefined}
      data-touched={ctx?.touched ? 'true' : undefined}
      data-disabled={ctx?.disabled ? 'true' : undefined}
    >
      {children}
    </label>
  );
}

function FieldControl({
  id,
  name,
  disabled,
  className,
  onChange,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  const ctx = useContext(FieldContext);
  const isDisabled = disabled ?? ctx?.disabled;
  const describedBy = clsx(rest['aria-describedby'], ctx?.describedBy) || undefined;

  return (
    <input
      {...rest}
      id={id ?? ctx?.controlId}
      name={name ?? ctx?.name}
      disabled={isDisabled}
      className={clsx('j-input-el', className)}
      aria-invalid={rest['aria-invalid'] ?? (ctx?.invalid ? true : undefined)}
      aria-describedby={describedBy}
      data-invalid={ctx?.invalid ? 'true' : undefined}
      data-dirty={ctx?.dirty ? 'true' : undefined}
      data-touched={ctx?.touched ? 'true' : undefined}
      onChange={(event) => {
        ctx?.notifyChange();
        onChange?.(event);
      }}
    />
  );
}

function FieldDescription({
  id,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  const ctx = useContext(FieldContext);
  const setHasDescription = ctx?.setHasDescription;

  useEffect(() => {
    if (!setHasDescription) return;
    setHasDescription(true);
    return () => setHasDescription(false);
  }, [setHasDescription]);

  return (
    <div
      {...rest}
      id={id ?? ctx?.descriptionId}
      className={clsx('j-field-hint', className)}
      data-invalid={ctx?.invalid ? 'true' : undefined}
      data-dirty={ctx?.dirty ? 'true' : undefined}
      data-touched={ctx?.touched ? 'true' : undefined}
    >
      {children}
    </div>
  );
}

function FieldError({
  id,
  match,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  match?: boolean;
}) {
  const ctx = useContext(FieldContext);
  const setHasError = ctx?.setHasError;
  const content = children ?? ctx?.resolvedError;
  const visible = match ?? Boolean(ctx?.invalid && content);

  useEffect(() => {
    if (!setHasError) return;
    setHasError(visible);
    return () => setHasError(false);
  }, [setHasError, visible]);

  if (!visible) return null;

  return (
    <div
      {...rest}
      id={id ?? ctx?.errorId}
      role="alert"
      aria-live="polite"
      className={clsx('j-field-error', className)}
      data-invalid="true"
    >
      {content}
    </div>
  );
}

export const Field = {
  Root: FieldRoot,
  Label: FieldLabel,
  Control: FieldControl,
  Description: FieldDescription,
  Error: FieldError,
};

export function Meter({
  value,
  min = 0,
  max = 100,
  label,
  valueLabel,
}: {
  value: number;
  min?: number;
  max?: number;
  label: string;
  valueLabel?: string;
}) {
  const labelId = useId();
  const safeVal = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
  const pct = max > min ? Math.min(100, Math.max(0, ((safeVal - min) / (max - min)) * 100)) : 0;
  const tone: 'ok' | 'warn' | 'danger' = pct >= 90 ? 'danger' : pct >= 75 ? 'warn' : 'ok';
  const fillColor =
    tone === 'danger'
      ? 'var(--juice-danger)'
      : tone === 'warn'
        ? 'var(--juice-warn)'
        : 'var(--juice-ok)';
  const displayValue = valueLabel ?? `${Math.round(pct)}%`;

  return (
    <div className="j-field" data-status={tone}>
      <div className="j-field-label-row">
        <span id={labelId} style={{ color: 'var(--fill-on)', fontWeight: 500 }}>
          {label}
        </span>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--fill-on)' }}>
          {displayValue}
        </span>
      </div>
      <div
        role="meter"
        aria-labelledby={labelId}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.round(safeVal * 100) / 100}
        aria-valuetext={displayValue}
        data-status={tone}
        className="j-slider-rail"
        style={{ height: 7 }}
      >
        <div
          className="j-slider-fill"
          style={{
            width: `${pct}%`,
            background: fillColor,
            transition: 'width 200ms var(--juice-out), background-color 180ms ease',
          }}
        />
      </div>
    </div>
  );
}

export function Progress({
  value,
  min = 0,
  max = 100,
  label,
  valueLabel,
  compact = false,
  indeterminateLabel = 'In progress',
  'aria-label': ariaLabel,
  'aria-labelledby': labelledBy,
  className,
  style,
}: {
  value: number | null;
  min?: number;
  max?: number;
  label?: string;
  compact?: boolean;
  indeterminateLabel?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  style?: CSSProperties;
  valueLabel?: string;
} & ({ label: string } | { 'aria-label': string } | { 'aria-labelledby': string } | { compact: true })) {
  const labelId = useId();
  const indeterminate = value === null || !Number.isFinite(value);
  const safeVal = indeterminate ? min : Math.min(max, Math.max(min, value));
  const pct = indeterminate
    ? 100
    : max > min
      ? Math.min(100, Math.max(0, ((safeVal - min) / (max - min)) * 100))
      : 0;
  const complete = !indeterminate && safeVal >= max;
  const displayValue = indeterminate ? indeterminateLabel : (valueLabel ?? `${Math.round(pct)}%`);
  const visibleLabel = !compact && label && !ariaLabel ? labelId : undefined;
  const compactLabel = compact && !labelledBy ? label ?? 'Progress' : undefined;

  const track = (
    <div
      role="progressbar"
      aria-labelledby={labelledBy ?? visibleLabel}
      aria-label={ariaLabel ?? compactLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={indeterminate ? undefined : Math.round(safeVal * 100) / 100}
      aria-valuetext={displayValue}
      data-indeterminate={indeterminate ? 'true' : undefined}
      data-complete={complete ? 'true' : undefined}
      className={clsx('j-slider-rail', compact && className)}
      style={{ height: 7, ...(compact && style) }}
    >
      {indeterminate ? (
        <div className="j-skel-bar" style={{ width: '100%', height: '100%', borderRadius: 99 }} />
      ) : (
        <div
          className="j-slider-fill"
          style={{
            width: `${pct}%`,
            background: complete ? 'var(--juice-ok)' : 'var(--juice-signal)',
            transition: 'width 200ms var(--juice-out), background-color 180ms ease',
          }}
        />
      )}
    </div>
  );
  if (compact) return track;

  return (
    <div
      className={clsx('j-field', className)}
      style={style}
      data-indeterminate={indeterminate ? 'true' : undefined}
      data-complete={complete ? 'true' : undefined}
    >
      <div className="j-field-label-row">
        {label && (
          <span id={labelId} style={{ color: 'var(--fill-on)', fontWeight: 500 }}>
            {label}
          </span>
        )}
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--fill-on)' }}>
          {displayValue}
        </span>
      </div>
      {track}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. FieldsetFormKit (id = 'fieldset-form-kit')
// ---------------------------------------------------------------------------

const INITIAL_SLUG = 'juice-edge-api';
const INITIAL_ORIGIN = 'https://api.juice.dev';

const SERVER_ERROR_PRESET: Record<string, string> = {
  slug: '409 Conflict: route slug "juice-edge-api" is already claimed in iad-1.',
  origin: '522 Origin Timeout: upstream TLS handshake rejected edge probe.',
};

function validateRouteFields(slug: string, origin: string): Record<string, string | undefined> {
  const next: Record<string, string | undefined> = {};
  const trimmedSlug = slug.trim();
  const trimmedOrigin = origin.trim();

  if (trimmedSlug.length < 3 || !/^[a-z0-9-]+$/.test(trimmedSlug)) {
    next.slug = 'Use 3+ lowercase letters, digits, or hyphens.';
  }
  if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmedOrigin)) {
    next.origin = 'Origin must be a valid https:// endpoint URL.';
  }
  return next;
}

export function FieldsetFormKit({ id = 'fieldset-form-kit' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const [slug, setSlug] = useState(INITIAL_SLUG);
  const [origin, setOrigin] = useState(INITIAL_ORIGIN);
  const [touched, setTouched] = useState<{ slug: boolean; origin: boolean }>({
    slug: false,
    origin: false,
  });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [status, setStatus] = useState<'idle' | 'submitted' | 'error'>('idle');

  const dirtySlug = slug !== INITIAL_SLUG;
  const dirtyOrigin = origin !== INITIAL_ORIGIN;
  const errorEntries = Object.entries(errors).filter(
    (entry): entry is [string, string] => Boolean(entry[1]),
  );

  const submitValid = useCallback(() => {
    const validSlug =
      slug.trim().length >= 3 && /^[a-z0-9-]+$/.test(slug.trim()) ? slug.trim() : INITIAL_SLUG;
    const validOrigin = /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(origin.trim())
      ? origin.trim()
      : INITIAL_ORIGIN;
    setSlug(validSlug);
    setOrigin(validOrigin);
    setTouched({ slug: true, origin: true });
    setErrors({});
    setStatus('submitted');
    playSound('paid');
  }, [origin, playSound, slug]);

  const injectError = useCallback(() => {
    setTouched({ slug: true, origin: true });
    setErrors({ ...SERVER_ERROR_PRESET });
    setStatus('error');
    playSound('deny');
  }, [playSound]);

  const clearErrors = useCallback(() => {
    setErrors({});
    setStatus('idle');
    playSound('tap');
  }, [playSound]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ slug: true, origin: true });
    const schemaErrors = validateRouteFields(slug, origin);
    if (Object.keys(schemaErrors).length > 0) {
      setErrors(schemaErrors);
      setStatus('error');
      playSound('deny');
      return;
    }
    setErrors({});
    setStatus('submitted');
    playSound('paid');
  };

  useJuiceAgentNode(
    id,
    'FieldsetFormKit',
    {
      slug,
      origin,
      dirty: { slug: dirtySlug, origin: dirtyOrigin },
      touched,
      errors,
      errorCount: errorEntries.length,
      status,
    },
    { submitValid, injectError, clearErrors },
  );

  const renderStatePills = (dirty: boolean, isTouched: boolean, invalid: boolean) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--juice-font-mono)', fontSize: 10 }}>
      {dirty && <span style={{ color: 'var(--juice-signal)' }}>dirty</span>}
      {isTouched && <span style={{ color: 'var(--juice-mute)' }}>touched</span>}
      {invalid && <span style={{ color: 'var(--juice-danger)', fontWeight: 600 }}>invalid</span>}
    </span>
  );

  return (
    <div id={id} className="j-slab j-fnd-card">
      <Form errors={errors} onClearErrors={setErrors} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Fieldset.Root>
          <Fieldset.Legend style={{ padding: '1px 2px' }}>
            <span>Edge Route Binding</span>
            <Badge tone={errorEntries.length > 0 ? 'danger' : status === 'submitted' ? 'ok' : 'neutral'}>
              {errorEntries.length > 0
                ? `${errorEntries.length} ${errorEntries.length === 1 ? 'error' : 'errors'}`
                : status === 'submitted'
                  ? 'Synced'
                  : 'Ready'}
            </Badge>
          </Fieldset.Legend>

          <Field.Root name="slug" dirty={dirtySlug} touched={touched.slug}>
            <div className="j-field-label-row">
              <Field.Label>Worker Slug</Field.Label>
              {renderStatePills(dirtySlug, touched.slug, Boolean(errors.slug))}
            </div>
            <div className="j-input-box" data-invalid={errors.slug ? 'true' : undefined}>
              <Field.Control
                value={slug}
                placeholder="juice-edge-api"
                spellCheck={false}
                onBlur={() => setTouched((prev) => ({ ...prev, slug: true }))}
                onChange={(e) => {
                  setSlug(e.currentTarget.value);
                  if (status === 'submitted') setStatus('idle');
                }}
              />
            </div>
            <Field.Description>Bound to *.workers.dev edge subdomain.</Field.Description>
            <Field.Error />
          </Field.Root>

          <Field.Root name="origin" dirty={dirtyOrigin} touched={touched.origin}>
            <div className="j-field-label-row">
              <Field.Label>Upstream Origin</Field.Label>
              {renderStatePills(dirtyOrigin, touched.origin, Boolean(errors.origin))}
            </div>
            <div className="j-input-box" data-invalid={errors.origin ? 'true' : undefined}>
              <Field.Control
                value={origin}
                placeholder="https://api.juice.dev"
                spellCheck={false}
                onBlur={() => setTouched((prev) => ({ ...prev, origin: true }))}
                onChange={(e) => {
                  setOrigin(e.currentTarget.value);
                  if (status === 'submitted') setStatus('idle');
                }}
              />
            </div>
            <Field.Description>Verified HTTPS origin for cache miss pass-through.</Field.Description>
            <Field.Error />
          </Field.Root>
        </Fieldset.Root>

        {errorEntries.length > 0 && (
          <div
            role="status"
            className="j-alert"
            data-tone="danger"
            style={{ padding: '7px 9px', fontSize: 11.5, alignItems: 'center' }}
          >
            <span>Error map active ({errorEntries.map(([k]) => k).join(', ')})</span>
            <button
              type="button"
              className="j-btn"
              data-size="xs"
              data-variant="ghost"
              aria-label="Clear form errors"
              onClick={clearErrors}
              style={{ height: 22, padding: '0 6px' }}
            >
              <RotateCcw size={11} aria-hidden="true" />
              Clear
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="submit" className="j-btn" data-size="sm" data-variant="primary" style={{ flex: 1 }}>
            Validate &amp; Submit
          </button>
          <button
            type="button"
            className="j-btn"
            data-size="sm"
            data-variant="danger"
            onClick={injectError}
          >
            Inject Server Error
          </button>
        </div>
      </Form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Autocomplete & AutocompleteKit (id = 'autocomplete-kit')
// ---------------------------------------------------------------------------

export type AutocompleteSuggestion = {
  value: string;
  category?: string;
};

const HEADER_SUGGESTIONS: readonly AutocompleteSuggestion[] = [
  { value: 'cache-control: max-age=3600', category: 'Cache' },
  { value: 'content-type: application/json', category: 'MIME' },
  { value: 'x-edge-region: global', category: 'Edge' },
  { value: 'strict-transport-security', category: 'TLS' },
] as const;

export function Autocomplete({
  label,
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  suggestions,
  placeholder = 'Type header or custom rule…',
  onAccept,
}: {
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  suggestions: readonly AutocompleteSuggestion[];
  placeholder?: string;
  onAccept?: (value: string) => void;
}) {
  const { playSound } = useJuice();
  const inputId = useId();
  const listId = `${inputId}-list`;
  const inputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useControllableState({
    value: controlledValue,
    defaultValue,
    onChange: onValueChange,
  });
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const [highlighted, setHighlighted] = useState<string>('');

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter(
      (item) =>
        item.value.toLowerCase().includes(q) ||
        (item.category?.toLowerCase().includes(q) ?? false),
    );
  }, [suggestions, value]);

  const itemValues = useMemo(() => filtered.map((item) => item.value), [filtered]);
  const activeSuggestion =
    (highlighted && itemValues.includes(highlighted) ? highlighted : itemValues[0]) ?? '';

  const inlineSuffix = useMemo(() => {
    if (!value || value.length > 24 || !activeSuggestion) return '';
    if (activeSuggestion.toLowerCase().startsWith(value.toLowerCase()) && activeSuggestion !== value) {
      return activeSuggestion.slice(value.length);
    }
    return '';
  }, [activeSuggestion, value]);

  const { onKeyDown: onRoveKeyDown } = useRovingFocus({
    items: itemValues,
    active: activeSuggestion,
    onSelect: (next) => {
      playSound('tick');
      setHighlighted(next);
    },
    orientation: 'vertical',
  });

  const accept = useCallback(
    (next: string) => {
      playSound('latch');
      setValue(next);
      setHighlighted(next);
      setOpen(false);
      onAccept?.(next);
      inputRef.current?.focus();
    },
    [onAccept, playSound, setOpen, setValue],
  );

  const canCompleteActive = Boolean(activeSuggestion && activeSuggestion !== value);

  return (
    <div
      className="j-field"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <div className="j-field-label-row">
        <label htmlFor={inputId}>{label}</label>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Kbd>↑↓</Kbd>
          <Kbd>Tab</Kbd>
        </span>
      </div>

      <div className="j-input-box" style={{ position: 'relative' }}>
        <Search size={14} color="var(--juice-mute)" aria-hidden="true" style={{ flexShrink: 0 }} />
        <div style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
          {inlineSuffix && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
                fontFamily: 'var(--juice-font-mono)',
                fontSize: 12,
                whiteSpace: 'pre',
                overflow: 'hidden',
              }}
            >
              <span style={{ color: 'transparent' }}>{value}</span>
              <span style={{ color: 'var(--juice-faint)' }}>{inlineSuffix}</span>
            </div>
          )}
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            aria-autocomplete="both"
            aria-expanded={open && filtered.length > 0}
            aria-controls={open && filtered.length > 0 ? listId : undefined}
            aria-activedescendant={
              open && activeSuggestion
                ? `${listId}-${itemValues.indexOf(activeSuggestion)}`
                : undefined
            }
            autoComplete="off"
            spellCheck={false}
            className="j-input-el"
            placeholder={placeholder}
            value={value}
            style={{ fontFamily: 'var(--juice-font-mono)', fontSize: 12, position: 'relative' }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onChange={(event) => {
              setValue(event.currentTarget.value);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === 'Escape' && open) {
                event.preventDefault();
                setOpen(false);
                return;
              }
              if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !open) {
                event.preventDefault();
                setOpen(true);
                return;
              }
              if (open && (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End')) {
                onRoveKeyDown(event);
                return;
              }
              if (event.key === 'Tab' && open && canCompleteActive) {
                event.preventDefault();
                accept(activeSuggestion);
                return;
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                if (open && canCompleteActive) {
                  accept(activeSuggestion);
                } else if (value.trim()) {
                  accept(value.trim());
                }
              }
            }}
          />
        </div>
      </div>

      {open && (
        filtered.length > 0 ? (
          <div id={listId} role="listbox" aria-label={`${label} suggestions`} className="j-menu-list">
            {filtered.map((item, idx) => {
              const isHighlighted = item.value === activeSuggestion;
              const isExact = item.value === value;
              return (
                <button
                  key={item.value}
                  id={`${listId}-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={isHighlighted}
                  data-highlighted={isHighlighted ? 'true' : undefined}
                  className="j-menu-item"
                  style={{ height: 30, padding: '0 8px' }}
                  onMouseMove={() => setHighlighted(item.value)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => accept(item.value)}
                >
                  <span
                    style={{
                      fontFamily: 'var(--juice-font-mono)',
                      fontSize: 11.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.value}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    {item.category && (
                      <span style={{ fontSize: 10.5, color: 'var(--juice-mute)' }}>{item.category}</span>
                    )}
                    {isExact && <Check size={12} strokeWidth={2.5} aria-hidden="true" />}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div
            role="status"
            style={{
              borderRadius: 11,
              background: 'var(--juice-w6)',
              padding: '7px 10px',
              fontSize: 11.5,
              color: 'var(--juice-mute)',
              ...betweenStyle,
            }}
          >
            <span>Custom header kept verbatim</span>
            <Kbd>Enter</Kbd>
          </div>
        )
      )}
    </div>
  );
}

export function AutocompleteKit({ id = 'autocomplete-kit' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const [input, setInputState] = useState('');
  const [open, setOpen] = useState(true);
  const [committed, setCommitted] = useState('cache-control: max-age=3600');

  const isPresetMatch = HEADER_SUGGESTIONS.some((item) => item.value === (input.trim() || committed));

  const setInput = useCallback(
    (val: string) => {
      if (typeof val !== 'string') return;
      playSound('tap');
      setInputState(val);
      setOpen(true);
    },
    [playSound],
  );

  const acceptSuggestion = useCallback(
    (s: string) => {
      if (typeof s !== 'string') return;
      const trimmed = s.trim();
      const matched =
        HEADER_SUGGESTIONS.find((item) => item.value.toLowerCase() === trimmed.toLowerCase())?.value ??
        trimmed;
      if (!matched) return;
      playSound('latch');
      setInputState(matched);
      setCommitted(matched);
      setOpen(false);
    },
    [playSound],
  );

  useJuiceAgentNode(
    id,
    'AutocompleteKit',
    {
      input,
      committed,
      open,
      mode: HEADER_SUGGESTIONS.some((item) => item.value === input) ? 'preset' : 'custom',
    },
    { setInput, acceptSuggestion },
  );

  return (
    <div id={id} className="j-slab j-fnd-card">
      <Autocomplete
        label="Response Header Rule"
        value={input}
        onValueChange={setInputState}
        open={open}
        onOpenChange={setOpen}
        suggestions={HEADER_SUGGESTIONS}
        onAccept={setCommitted}
      />

      <div
        style={{
          borderRadius: 11,
          background: 'var(--juice-w6)',
          padding: '7px 10px',
          ...betweenStyle,
        }}
      >
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 10.5, color: 'var(--juice-mute)' }}>Active expression</span>
          <code
            style={{
              fontFamily: 'var(--juice-font-mono)',
              fontSize: 11.5,
              color: 'var(--fill-on)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {input.trim() || committed}
          </code>
        </div>
        <Badge tone={isPresetMatch ? 'signal' : 'neutral'}>
          {isPresetMatch ? 'Preset' : 'Custom'}
        </Badge>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. CheckboxGroup & CheckboxGroupKit (id = 'checkbox-group-kit')
// ---------------------------------------------------------------------------

type CheckboxGroupContextValue = {
  value: readonly string[];
  allValues: readonly string[];
  allChecked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  toggleParent: () => void;
  toggleItem: (item: string, silent?: boolean) => void;
};

const CheckboxGroupContext = createContext<CheckboxGroupContextValue | null>(null);

function CheckboxGroupRoot({
  value: controlledValue,
  defaultValue = [],
  onValueChange,
  allValues,
  disabled = false,
  label,
  children,
}: {
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (next: string[]) => void;
  allValues: readonly string[];
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  const { playSound } = useJuice();
  const [value, setValue] = useControllableState<readonly string[]>({
    value: controlledValue,
    defaultValue,
    onChange: (next) => onValueChange?.([...next]),
  });

  const allChecked = allValues.length > 0 && allValues.every((item) => value.includes(item));
  const someChecked = allValues.some((item) => value.includes(item));
  const indeterminate = someChecked && !allChecked;

  const toggleParent = useCallback(() => {
    if (disabled) return;
    if (allChecked) {
      playSound('tap');
      setValue([]);
    } else {
      playSound('latch');
      setValue([...allValues]);
    }
  }, [allChecked, allValues, disabled, playSound, setValue]);

  const toggleItem = useCallback(
    (item: string, silent = false) => {
      if (disabled) return;
      const exists = value.includes(item);
      if (!silent) playSound(exists ? 'tap' : 'latch');
      setValue(exists ? value.filter((v) => v !== item) : [...value, item]);
    },
    [disabled, playSound, setValue, value],
  );

  const ctx = useMemo<CheckboxGroupContextValue>(
    () => ({
      value,
      allValues,
      allChecked,
      indeterminate,
      disabled,
      toggleParent,
      toggleItem,
    }),
    [value, allValues, allChecked, indeterminate, disabled, toggleParent, toggleItem],
  );

  return (
    <CheckboxGroupContext.Provider value={ctx}>
      <div
        role="group"
        aria-label={label}
        data-disabled={disabled ? 'true' : undefined}
        className="j-menu-list"
        style={{ padding: 6, gap: 3 }}
      >
        {children}
      </div>
    </CheckboxGroupContext.Provider>
  );
}

function CheckboxGroupParent({
  label,
  hint,
}: {
  label: ReactNode;
  hint?: ReactNode;
}) {
  const ctx = useContext(CheckboxGroupContext);
  const allChecked = ctx?.allChecked ?? false;
  const indeterminate = ctx?.indeterminate ?? false;
  const activeVisual = allChecked || indeterminate;

  return (
    <div
      style={{
        ...betweenStyle,
        padding: '5px 6px 7px',
        borderBottom: '1px solid var(--juice-edge)',
        marginBottom: 2,
      }}
    >
      <div
        style={{ ...rowStyle, cursor: ctx?.disabled ? 'default' : 'pointer', flex: 1, minWidth: 0 }}
        onClick={() => ctx?.toggleParent()}
      >
        <button
          type="button"
          role="checkbox"
          aria-label={typeof label === 'string' ? label : 'Toggle all permissions'}
          aria-checked={indeterminate ? 'mixed' : allChecked}
          disabled={ctx?.disabled}
          data-checked={allChecked ? 'true' : 'false'}
          data-indeterminate={indeterminate ? 'true' : undefined}
          className="j-checkbox"
          style={
            activeVisual
              ? { background: 'var(--fill-on)', color: 'var(--fill-slab)', boxShadow: 'none' }
              : undefined
          }
          onClick={(event) => {
            event.stopPropagation();
            ctx?.toggleParent();
          }}
        >
          {indeterminate ? (
            <Minus size={11} strokeWidth={2.75} aria-hidden="true" />
          ) : (
            allChecked && <Check size={11} strokeWidth={2.75} aria-hidden="true" />
          )}
        </button>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fill-on)' }}>{label}</span>
      </div>
      {hint}
    </div>
  );
}

function CheckboxGroupItem({
  value,
  description,
}: {
  value: string;
  description?: string;
}) {
  const ctx = useContext(CheckboxGroupContext);
  const checked = ctx?.value.includes(value) ?? false;

  return (
    <div
      style={{
        ...betweenStyle,
        minHeight: 30,
        padding: '2px 6px',
        borderRadius: 9,
        cursor: ctx?.disabled ? 'default' : 'pointer',
      }}
      onClick={() => ctx?.toggleItem(value)}
    >
      <div style={{ ...rowStyle, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={checked}
          aria-label={value}
          onChange={() => ctx?.toggleItem(value, true)}
        />
        <code
          onClick={() => ctx?.toggleItem(value)}
          style={{
            fontFamily: 'var(--juice-font-mono)',
            fontSize: 12,
            color: checked ? 'var(--fill-on)' : 'var(--juice-soft)',
            cursor: 'pointer',
          }}
        >
          {value}
        </code>
      </div>
      {description && <span style={{ fontSize: 11, color: 'var(--juice-mute)' }}>{description}</span>}
    </div>
  );
}

export const CheckboxGroup = {
  Root: CheckboxGroupRoot,
  Parent: CheckboxGroupParent,
  Item: CheckboxGroupItem,
};

const PERMISSIONS = [
  { key: 'read:workers', desc: 'Inspect scripts' },
  { key: 'write:kv', desc: 'Mutate KV keys' },
  { key: 'deploy:stage', desc: 'Promote builds' },
  { key: 'admin:billing', desc: 'Manage invoices' },
] as const;

type PermissionKey = (typeof PERMISSIONS)[number]['key'];
const ALL_PERMISSION_KEYS: readonly PermissionKey[] = PERMISSIONS.map((p) => p.key);

export function CheckboxGroupKit({ id = 'checkbox-group-kit' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const [selected, setSelected] = useState<string[]>(['read:workers', 'write:kv']);

  const allChecked = ALL_PERMISSION_KEYS.every((k) => selected.includes(k));
  const indeterminate = selected.length > 0 && !allChecked;
  const parentState = allChecked ? 'checked' : indeterminate ? 'indeterminate' : 'unchecked';

  const toggleParent = useCallback(() => {
    if (allChecked) {
      playSound('tap');
      setSelected([]);
    } else {
      playSound('latch');
      setSelected([...ALL_PERMISSION_KEYS]);
    }
  }, [allChecked, playSound]);

  const togglePermission = useCallback(
    (perm: string) => {
      if (typeof perm !== 'string') return;
      const match = ALL_PERMISSION_KEYS.find((k) => k.toLowerCase() === perm.trim().toLowerCase());
      if (!match) return;
      setSelected((prev) => {
        const exists = prev.includes(match);
        playSound(exists ? 'tap' : 'latch');
        return exists ? prev.filter((item) => item !== match) : [...prev, match];
      });
    },
    [playSound],
  );

  const selectSubset = useCallback(() => {
    playSound('latch');
    setSelected((prev) =>
      prev.length === 2 && prev.includes('read:workers') && prev.includes('deploy:stage')
        ? ['read:workers', 'write:kv']
        : ['read:workers', 'deploy:stage'],
    );
  }, [playSound]);

  useJuiceAgentNode(
    id,
    'CheckboxGroupKit',
    {
      selected,
      parentState,
      indeterminate,
      allChecked,
      count: selected.length,
      total: ALL_PERMISSION_KEYS.length,
    },
    { toggleParent, togglePermission, selectSubset },
  );

  return (
    <div id={id} className="j-slab j-fnd-card">
      <CheckboxGroup.Root
        label="API Token Permissions"
        allValues={ALL_PERMISSION_KEYS}
        value={selected}
        onValueChange={setSelected}
      >
        <CheckboxGroup.Parent
          label="Token Scopes"
          hint={
            <Badge tone={allChecked ? 'ok' : indeterminate ? 'signal' : 'neutral'}>
              {allChecked ? 'All 4' : indeterminate ? `${selected.length}/4 mixed` : 'None'}
            </Badge>
          }
        />
        {PERMISSIONS.map((perm) => (
          <CheckboxGroup.Item key={perm.key} value={perm.key} description={perm.desc} />
        ))}
      </CheckboxGroup.Root>

      <div style={{ ...betweenStyle, padding: '0 2px' }}>
        <span style={{ fontFamily: 'var(--juice-font-mono)', fontSize: 11, color: 'var(--juice-mute)' }}>
          aria-checked=&quot;{indeterminate ? 'mixed' : String(allChecked)}&quot;
        </span>
        <button
          type="button"
          className="j-btn"
          data-size="xs"
          data-variant="ghost"
          onClick={selectSubset}
        >
          Select subset
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. ScrubNumberField & NumberScrubFieldKit (id = 'number-scrub-field-kit')
// ---------------------------------------------------------------------------

type ScrubNumberFieldContextValue = {
  labelId: string;
  value: number;
  min: number;
  max: number;
  step: number;
  decimals: number;
  suffix: string;
  scrub: ReturnType<typeof useScrubDrag>;
  decrement: () => void;
  increment: () => void;
};

const ScrubNumberFieldContext = createContext<ScrubNumberFieldContextValue | null>(null);

function ScrubNumberRoot({
  value: controlledValue,
  defaultValue = 0,
  min = 0,
  max = 100,
  step = 1,
  decimals = 0,
  suffix = '',
  onValueChange,
  children,
}: {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  suffix?: string;
  onValueChange?: (next: number) => void;
  children: ReactNode;
}) {
  const { playSound } = useJuice();
  const labelId = useId();
  const [value, setValue] = useControllableState({
    value: controlledValue,
    defaultValue,
    onChange: onValueChange,
  });

  const commit = useCallback(
    (raw: number) => {
      const snapped = clampSnap(raw, min, max, step, decimals);
      setValue(snapped);
    },
    [decimals, max, min, setValue, step],
  );

  const scrub = useScrubDrag({
    value,
    min,
    max,
    step,
    onChange: commit,
    onScrubSound: () => playSound('scrub'),
  });

  const decrement = useCallback(() => {
    const next = clampSnap(value - step, min, max, step, decimals);
    if (next !== value) {
      playSound('tap');
      setValue(next);
    }
  }, [decimals, max, min, playSound, setValue, step, value]);

  const increment = useCallback(() => {
    const next = clampSnap(value + step, min, max, step, decimals);
    if (next !== value) {
      playSound('tap');
      setValue(next);
    }
  }, [decimals, max, min, playSound, setValue, step, value]);

  const ctx = useMemo<ScrubNumberFieldContextValue>(
    () => ({ labelId, value, min, max, step, decimals, suffix, scrub, decrement, increment }),
    [labelId, value, min, max, step, decimals, suffix, scrub, decrement, increment],
  );

  return (
    <ScrubNumberFieldContext.Provider value={ctx}>
      <div style={{ ...surfaceStyle, padding: '8px 9px', gap: 6 }}>{children}</div>
    </ScrubNumberFieldContext.Provider>
  );
}

function ScrubNumberScrubArea({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  const ctx = useContext(ScrubNumberFieldContext);
  if (!ctx) return null;

  return (
    <div
      ref={(node) => {
        ctx.scrub.trackRef.current = node;
      }}
      {...ctx.scrub.scrubProps}
      aria-label={`${label} scrub control`}
      data-scrubbing={ctx.scrub.held ? 'true' : undefined}
      style={{
        position: 'relative',
        height: 28,
        padding: '0 8px',
        borderRadius: 9,
        background: 'var(--juice-w6)',
        overflow: 'hidden',
        cursor: 'ew-resize',
        touchAction: 'none',
        userSelect: 'none',
        ...betweenStyle,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '0 auto 0 0',
          width: `${ctx.scrub.percent}%`,
          background: ctx.scrub.held
            ? 'color-mix(in srgb, var(--juice-signal) 22%, transparent)'
            : 'var(--juice-w12)',
          transition: ctx.scrub.held ? 'none' : 'width 150ms var(--juice-out)',
          pointerEvents: 'none',
        }}
      />
      <span
        id={ctx.labelId}
        style={{
          position: 'relative',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--fill-on)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <MoveHorizontal
          size={12}
          color={ctx.scrub.held ? 'var(--juice-signal)' : 'var(--juice-mute)'}
          aria-hidden="true"
        />
        {children}
      </span>
      <span
        style={{
          position: 'relative',
          fontFamily: 'var(--juice-font-mono)',
          fontSize: 10.5,
          color: 'var(--juice-mute)',
        }}
      >
        drag
      </span>
    </div>
  );
}

function ScrubNumberGroup({ label }: { label: string }) {
  const ctx = useContext(ScrubNumberFieldContext);
  if (!ctx) return null;

  const formatted = `${ctx.value.toFixed(ctx.decimals)}${ctx.suffix}`;

  return (
    <div style={betweenStyle}>
      <span style={{ fontSize: 11.5, color: 'var(--juice-mute)', fontVariantNumeric: 'tabular-nums' }}>
        {label}: <strong style={{ color: 'var(--fill-on)', fontWeight: 600 }}>{formatted}</strong>
      </span>
      <div className="j-num-stepper" role="group" aria-labelledby={ctx.labelId}>
        <button
          type="button"
          className="j-num-btn"
          aria-label={`Decrease ${label}`}
          disabled={ctx.value <= ctx.min}
          onClick={ctx.decrement}
        >
          <Minus size={13} aria-hidden="true" />
        </button>
        <output className="j-num-val" aria-label={formatted} style={{ minWidth: 58, padding: '0 4px' }}>
          <RollingNumber value={ctx.value} decimals={ctx.decimals} suffix={ctx.suffix} />
        </output>
        <button
          type="button"
          className="j-num-btn"
          aria-label={`Increase ${label}`}
          disabled={ctx.value >= ctx.max}
          onClick={ctx.increment}
        >
          <Plus size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export const ScrubNumberField = {
  Root: ScrubNumberRoot,
  ScrubArea: ScrubNumberScrubArea,
  Group: ScrubNumberGroup,
};

const FPS_BOUNDS = { min: 15, max: 240, step: 1, defaultValue: 60 } as const;
const DAMPING_BOUNDS = { min: 0.1, max: 2.0, step: 0.02, defaultValue: 0.82 } as const;

export function NumberScrubFieldKit({ id = 'number-scrub-field-kit' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const [fps, setFpsState] = useState<number>(FPS_BOUNDS.defaultValue);
  const [damping, setDampingState] = useState<number>(DAMPING_BOUNDS.defaultValue);

  const setFps = useCallback(
    (next: number) => {
      if (!Number.isFinite(next)) return;
      playSound('scrub');
      setFpsState(clampSnap(next, FPS_BOUNDS.min, FPS_BOUNDS.max, FPS_BOUNDS.step, 0));
    },
    [playSound],
  );

  const setDamping = useCallback(
    (next: number) => {
      if (!Number.isFinite(next)) return;
      playSound('scrub');
      setDampingState(clampSnap(next, DAMPING_BOUNDS.min, DAMPING_BOUNDS.max, 0.01, 2));
    },
    [playSound],
  );

  const resetDefaults = () => {
    playSound('tap');
    setFpsState(FPS_BOUNDS.defaultValue);
    setDampingState(DAMPING_BOUNDS.defaultValue);
  };

  const frameBudgetMs = (1000 / fps).toFixed(1);
  const springRegime =
    damping < 0.75 ? 'Bouncy' : damping <= 1.05 ? 'Critically damped' : 'Overdamped';

  useJuiceAgentNode(
    id,
    'NumberScrubFieldKit',
    {
      fps,
      damping,
      formattedFps: `Frame Rate: ${fps} fps`,
      formattedDamping: `Damping Ratio: ${damping.toFixed(2)}`,
      frameBudgetMs: Number(frameBudgetMs),
      springRegime,
    },
    { setFps, setDamping },
  );

  return (
    <div id={id} className="j-slab j-fnd-card">
      <ScrubNumberField.Root
        value={fps}
        min={FPS_BOUNDS.min}
        max={FPS_BOUNDS.max}
        step={FPS_BOUNDS.step}
        decimals={0}
        suffix=" fps"
        onValueChange={setFpsState}
      >
        <ScrubNumberField.ScrubArea label="Frame Rate">Frame Rate</ScrubNumberField.ScrubArea>
        <ScrubNumberField.Group label="Frame Rate" />
      </ScrubNumberField.Root>

      <ScrubNumberField.Root
        value={damping}
        min={DAMPING_BOUNDS.min}
        max={DAMPING_BOUNDS.max}
        step={DAMPING_BOUNDS.step}
        decimals={2}
        onValueChange={setDampingState}
      >
        <ScrubNumberField.ScrubArea label="Damping Ratio">Damping Ratio</ScrubNumberField.ScrubArea>
        <ScrubNumberField.Group label="Damping Ratio" />
      </ScrubNumberField.Root>

      <div style={{ ...betweenStyle, padding: '0 3px', fontSize: 11.5, color: 'var(--juice-mute)' }}>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {frameBudgetMs} ms/frame · {springRegime}
        </span>
        {(fps !== FPS_BOUNDS.defaultValue || damping !== DAMPING_BOUNDS.defaultValue) && (
          <button
            type="button"
            className="j-btn"
            data-size="xs"
            data-variant="ghost"
            aria-label="Reset scrub fields"
            onClick={resetDefaults}
            style={{ height: 22, padding: '0 6px' }}
          >
            <RotateCcw size={11} aria-hidden="true" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. MeterProgressKit (id = 'meter-progress-kit')
// ---------------------------------------------------------------------------

const PROGRESS_MODES = [
  { value: 'determinate', label: 'Determinate' },
  { value: 'indeterminate', label: 'Shimmer' },
] as const;

type ProgressMode = (typeof PROGRESS_MODES)[number]['value'];

export function MeterProgressKit({ id = 'meter-progress-kit' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const [meterLoad, setMeterLoadState] = useState(64);
  const [progressVal, setProgressValState] = useState(72);
  const [mode, setMode] = useState<ProgressMode>('determinate');

  const meterTone: 'ok' | 'warn' | 'danger' =
    meterLoad >= 90 ? 'danger' : meterLoad >= 75 ? 'warn' : 'ok';
  const meterStatus =
    meterTone === 'danger' ? 'Crit' : meterTone === 'warn' ? 'Warn' : 'Opt';

  const isIndeterminate = mode === 'indeterminate';
  const progressTone: 'ok' | 'signal' | 'neutral' = isIndeterminate
    ? 'neutral'
    : progressVal >= 100
      ? 'ok'
      : 'signal';
  const progressStatus = isIndeterminate ? 'Queue' : progressVal >= 100 ? 'Done' : 'Build';

  const setMeterLoad = useCallback(
    (pct: number) => {
      if (!Number.isFinite(pct)) return;
      const bounded = Math.max(0, Math.min(100, Math.round(pct)));
      playSound(bounded >= 90 ? 'deny' : 'tap');
      setMeterLoadState(bounded);
    },
    [playSound],
  );

  const setProgressVal = useCallback(
    (pct: number) => {
      if (pct === null || !Number.isFinite(pct) || pct < 0) {
        playSound('tap');
        setMode('indeterminate');
        return;
      }
      const bounded = Math.max(0, Math.min(100, Math.round(pct)));
      playSound(bounded >= 100 ? 'paid' : 'tap');
      setMode('determinate');
      setProgressValState(bounded);
    },
    [playSound],
  );

  useJuiceAgentNode(
    id,
    'MeterProgressKit',
    {
      meterLoad,
      meterTone,
      progressVal,
      indeterminate: isIndeterminate,
      progressRole: 'progressbar',
      meterRole: 'meter',
    },
    { setMeterLoad, setProgressVal },
  );

  const miniChipStyle: CSSProperties = {
    flex: 1,
    height: 22,
    padding: 0,
    fontSize: 11,
    fontVariantNumeric: 'tabular-nums',
  };

  return (
    <div id={id} className="j-slab j-fnd-card">
      <div style={{ ...betweenStyle, padding: '0 2px' }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>Gauge vs Task Lifecycle</span>
        <SegmentedControl
          options={PROGRESS_MODES}
          value={mode}
          onChange={setMode}
        />
      </div>

      <div className="j-ai-grid-2">
        <div className="j-ai-col" style={{ justifyContent: 'space-between', gap: 8 }}>
          <div style={betweenStyle}>
            <code style={{ fontFamily: 'var(--juice-font-mono)', fontSize: 10.5, color: 'var(--juice-mute)' }}>
              meter
            </code>
            <Badge tone={meterTone}>{meterStatus}</Badge>
          </div>

          <Meter label="CPU Load" value={meterLoad} min={0} max={100} />

          <div style={{ display: 'flex', gap: 4 }}>
            {[42, 82, 95].map((preset) => (
              <button
                key={preset}
                type="button"
                className="j-btn"
                data-size="xs"
                data-variant={meterLoad === preset ? 'primary' : 'secondary'}
                style={miniChipStyle}
                onClick={() => setMeterLoad(preset)}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>

        <div className="j-ai-col" style={{ justifyContent: 'space-between', gap: 8 }}>
          <div style={betweenStyle}>
            <code style={{ fontFamily: 'var(--juice-font-mono)', fontSize: 10.5, color: 'var(--juice-mute)' }}>
              progressbar
            </code>
            <Badge tone={progressTone}>{progressStatus}</Badge>
          </div>

          <Progress
            label="Edge Build"
            value={isIndeterminate ? null : progressVal}
            min={0}
            max={100}
          />

          <div style={{ display: 'flex', gap: 4 }}>
            {[35, 72, 100].map((preset) => (
              <button
                key={preset}
                type="button"
                className="j-btn"
                data-size="xs"
                data-variant={!isIndeterminate && progressVal === preset ? 'primary' : 'secondary'}
                style={miniChipStyle}
                onClick={() => setProgressVal(preset)}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. PreviewCard & PreviewCardKit (id = 'preview-card-kit')
// ---------------------------------------------------------------------------

type PreviewCardContextValue = {
  popupId: string;
  open: boolean;
  openWithDelay: (immediate?: boolean) => void;
  closeWithDelay: () => void;
  cancelTimers: () => void;
  dismiss: () => void;
};

const PreviewCardContext = createContext<PreviewCardContextValue | null>(null);

function PreviewCardRoot({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  delay = 110,
  closeDelay = 160,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delay?: number;
  closeDelay?: number;
  children: ReactNode;
}) {
  const { animate } = useJuice();
  const popupId = useId();
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const cancelTimers = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => cancelTimers, [cancelTimers]);

  const openWithDelay = useCallback(
    (immediate = false) => {
      cancelTimers();
      if (!animate || immediate || delay <= 0) {
        setOpen(true);
        return;
      }
      openTimerRef.current = window.setTimeout(() => {
        openTimerRef.current = null;
        setOpen(true);
      }, delay);
    },
    [animate, cancelTimers, delay, setOpen],
  );

  const closeWithDelay = useCallback(() => {
    cancelTimers();
    if (!animate || closeDelay <= 0) {
      setOpen(false);
      return;
    }
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setOpen(false);
    }, closeDelay);
  }, [animate, cancelTimers, closeDelay, setOpen]);

  const dismiss = useCallback(() => {
    cancelTimers();
    setOpen(false);
  }, [cancelTimers, setOpen]);

  const ctx = useMemo<PreviewCardContextValue>(
    () => ({ popupId, open, openWithDelay, closeWithDelay, cancelTimers, dismiss }),
    [popupId, open, openWithDelay, closeWithDelay, cancelTimers, dismiss],
  );

  return (
    <PreviewCardContext.Provider value={ctx}>
      <div
        ref={containerRef}
        style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 }}
        onBlur={(event) => {
          if (containerRef.current?.contains(event.relatedTarget as Node | null)) return;
          closeWithDelay();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.preventDefault();
            dismiss();
          }
        }}
      >
        {children}
      </div>
    </PreviewCardContext.Provider>
  );
}

function PreviewCardTrigger({
  active = false,
  onActivate,
  children,
  style,
  onClick,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  active?: boolean;
  onActivate?: () => void;
}) {
  const ctx = useContext(PreviewCardContext);

  return (
    <a
      {...rest}
      aria-describedby={ctx?.open && active ? ctx.popupId : undefined}
      data-popup-open={ctx?.open && active ? 'true' : undefined}
      style={{
        fontFamily: 'var(--juice-font-mono)',
        fontSize: 11.5,
        fontWeight: 600,
        color: active && ctx?.open ? 'var(--juice-signal)' : 'var(--fill-on)',
        textDecoration: 'underline',
        textDecorationColor: active && ctx?.open ? 'var(--juice-signal)' : 'var(--juice-faint)',
        textUnderlineOffset: 3,
        borderRadius: 5,
        padding: '1px 4px',
        background:
          active && ctx?.open
            ? 'color-mix(in srgb, var(--juice-signal) 12%, transparent)'
            : 'var(--juice-w6)',
        cursor: 'pointer',
        transition: 'background-color 130ms ease, color 130ms ease',
        ...style,
      }}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        if (event.pointerType === 'touch') return;
        onActivate?.();
        ctx?.openWithDelay();
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        if (event.pointerType === 'touch') return;
        ctx?.closeWithDelay();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        onActivate?.();
        ctx?.openWithDelay(true);
      }}
      onBlur={(event) => {
        onBlur?.(event);
      }}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
        onActivate?.();
        ctx?.openWithDelay(true);
      }}
    >
      {children}
    </a>
  );
}

function PreviewCardPopup({
  inline = false,
  className,
  style,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  inline?: boolean;
}) {
  const ctx = useContext(PreviewCardContext);
  if (!ctx?.open) return null;

  return (
    <div
      {...rest}
      id={ctx.popupId}
      role="region"
      data-open="true"
      className={clsx('j-floating-pop', className)}
      style={{
        ...(inline
          ? { position: 'relative', padding: '9px 11px' }
          : { position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 30, padding: '9px 11px' }),
        ...style,
      }}
      onPointerEnter={() => ctx.cancelTimers()}
      onPointerLeave={() => ctx.closeWithDelay()}
    >
      {children}
    </div>
  );
}

export const PreviewCard = {
  Root: PreviewCardRoot,
  Trigger: PreviewCardTrigger,
  Popup: PreviewCardPopup,
};

export type PreviewPackageName = '@base-ui/react' | '@juice-ui/core' | '@ui-sdk/core';

type PackageMeta = {
  name: PreviewPackageName;
  version: string;
  host: string;
  href: string;
  summary: string;
  bundle: string;
  downloads: string;
  license: string;
};

const PACKAGE_CATALOG: Record<PreviewPackageName, PackageMeta> = {
  '@base-ui/react': {
    name: '@base-ui/react',
    version: 'v1.2.0',
    host: 'base-ui.com',
    href: 'https://base-ui.com/react/components',
    summary: 'Unstyled, accessible React compound primitives and state hooks.',
    bundle: '4.8 kB gzip',
    downloads: '1.4M/wk',
    license: 'MIT',
  },
  '@juice-ui/core': {
    name: '@juice-ui/core',
    version: 'v0.1.0',
    host: 'juice-ui.dev',
    href: 'https://juice-ui.dev/tokens',
    summary: 'Concentric 6-step color-mix surfaces with zero-asset Web Audio.',
    bundle: '3.1 kB gzip',
    downloads: '184k/wk',
    license: 'MIT',
  },
  '@ui-sdk/core': {
    name: '@ui-sdk/core',
    version: 'v0.9.4',
    host: 'ui-sdk.dev',
    href: 'https://ui-sdk.dev/bridge',
    summary: 'Deterministic UI snapshot and programmatic agent action bridge.',
    bundle: '2.4 kB gzip',
    downloads: '92k/wk',
    license: 'Apache-2.0',
  },
};

export function PreviewCardKit({ id = 'preview-card-kit' }: { id?: string } = {}) {
  const { playSound } = useJuice();
  const [target, setTarget] = useState<PreviewPackageName>('@base-ui/react');
  const [open, setOpen] = useState(true);

  const activatePkg = useCallback(
    (pkg: PreviewPackageName) => {
      setTarget((prev) => {
        if (prev !== pkg) playSound('pop');
        return pkg;
      });
    },
    [playSound],
  );

  const previewTarget = useCallback(
    (pkg: PreviewPackageName) => {
      if (!(pkg in PACKAGE_CATALOG)) return;
      playSound('pop');
      setTarget(pkg);
      setOpen(true);
    },
    [playSound],
  );

  useJuiceAgentNode(
    id,
    'PreviewCardKit',
    {
      target,
      open,
      package: PACKAGE_CATALOG[target],
    },
    { previewTarget },
  );

  const meta = PACKAGE_CATALOG[target];

  return (
    <div id={id} className="j-slab j-fnd-card">
      <PreviewCard.Root open={open} onOpenChange={setOpen} delay={110} closeDelay={220}>
        <div style={surfaceStyle}>
          <div style={betweenStyle}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Architecture Notes</span>
            <span style={{ fontSize: 11, color: 'var(--juice-mute)' }}>Hover or focus link</span>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.65, color: 'var(--juice-soft)' }}>
            Pair{' '}
            <PreviewCard.Trigger
              href={PACKAGE_CATALOG['@base-ui/react'].href}
              active={target === '@base-ui/react'}
              onActivate={() => activatePkg('@base-ui/react')}
            >
              @base-ui/react
            </PreviewCard.Trigger>{' '}
            compound parts with{' '}
            <PreviewCard.Trigger
              href={PACKAGE_CATALOG['@juice-ui/core'].href}
              active={target === '@juice-ui/core'}
              onActivate={() => activatePkg('@juice-ui/core')}
            >
              @juice-ui/core
            </PreviewCard.Trigger>{' '}
            concentric slabs and{' '}
            <PreviewCard.Trigger
              href={PACKAGE_CATALOG['@ui-sdk/core'].href}
              active={target === '@ui-sdk/core'}
              onActivate={() => activatePkg('@ui-sdk/core')}
            >
              @ui-sdk/core
            </PreviewCard.Trigger>{' '}
            state inspection.
          </p>
        </div>

        {open ? (
          <PreviewCard.Popup
            inline
            aria-label={`${meta.name} package preview`}
            style={{ display: 'flex', flexDirection: 'column', gap: 7 }}
          >
            <div style={betweenStyle}>
              <span style={{ ...rowStyle, minWidth: 0 }}>
                <Globe size={13} color="var(--juice-signal)" aria-hidden="true" />
                <code style={{ fontFamily: 'var(--juice-font-mono)', fontSize: 12, fontWeight: 600 }}>
                  {meta.name}
                </code>
                <span style={{ fontSize: 11, color: 'var(--juice-mute)' }}>{meta.version}</span>
              </span>
              <span style={{ ...rowStyle, gap: 4, fontSize: 11, color: 'var(--juice-mute)' }}>
                {meta.host}
                <ExternalLink size={11} aria-hidden="true" />
              </span>
            </div>

            <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--juice-soft)' }}>
              {meta.summary}
            </div>

            <div
              style={{
                ...betweenStyle,
                paddingTop: 5,
                borderTop: '1px solid var(--juice-edge)',
                fontSize: 11,
                color: 'var(--juice-mute)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span>
                Bundle <strong style={{ color: 'var(--fill-on)' }}>{meta.bundle}</strong>
              </span>
              <span>
                Weekly <strong style={{ color: 'var(--fill-on)' }}>{meta.downloads}</strong>
              </span>
              <Badge tone="neutral" style={{ height: 20, fontSize: 10.5 }}>
                {meta.license}
              </Badge>
            </div>
          </PreviewCard.Popup>
        ) : (
          <div
            style={{
              borderRadius: 12,
              background: 'var(--juice-w4)',
              padding: '10px 11px',
              fontSize: 11.5,
              color: 'var(--juice-mute)',
              ...betweenStyle,
            }}
          >
            <span>Hover or focus any package link above to inspect metadata.</span>
            <button
              type="button"
              className="j-btn"
              data-size="xs"
              data-variant="ghost"
              onClick={() => previewTarget(target)}
            >
              Show
            </button>
          </div>
        )}
      </PreviewCard.Root>
    </div>
  );
}
