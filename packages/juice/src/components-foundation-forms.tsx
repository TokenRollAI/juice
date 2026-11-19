import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import { clsx } from 'clsx';
import { Calendar, Check, ChevronDown, Loader2, Minus, Plus, Search, Upload, X } from 'lucide-react';
import { useControllableState, useJuice, useJuiceAgentNode, useRovingFocus, useScrubDrag } from './behaviors.tsx';
import { Badge, Checkbox, Kbd, RollingNumber, SegmentedControl, Switch } from './components.tsx';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  onClick,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: Ref<HTMLButtonElement>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}) {
  const { animate } = useJuice();

  return (
    <button
      {...rest}
      type={type}
      className={clsx('j-btn', className)}
      data-variant={variant}
      data-size={size}
      disabled={disabled || loading}
      aria-busy={loading || rest['aria-busy']}
      onClick={onClick}
    >
      {loading ? (
        <>
          <style href="juice-foundation-spin" precedence="default">
            {'@keyframes juice-foundation-spin { to { transform: rotate(1turn); } }'}
          </style>
          <Loader2 size={14} aria-hidden="true" style={{ animation: animate ? 'juice-foundation-spin 0.85s linear infinite' : undefined }} />
        </>
      ) : leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}

export function IconButton({
  label,
  variant = 'secondary',
  size = 'sm',
  children,
  className,
  style,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  ref?: Ref<HTMLButtonElement>;
  variant?: ButtonVariant;
  size?: Exclude<ButtonSize, 'lg'>;
}) {
  const width = { xs: 24, sm: 30, md: 36 }[size];

  return (
    <Button
      {...rest}
      variant={variant}
      size={size}
      className={clsx('j-icon-btn', className)}
      aria-label={label}
      style={{ width, padding: 0, ...style }}
    >
      {children}
    </Button>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'prefix'> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  prefix?: ReactNode;
  suffix?: ReactNode;
  clearable?: boolean;
};

export function TextField({
  id,
  label,
  hint,
  error,
  value: controlledValue,
  defaultValue = '',
  onChange,
  prefix,
  suffix,
  clearable = false,
  className,
  disabled,
  readOnly,
  ...rest
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useControllableState({ value: controlledValue, defaultValue, onChange });
  const describedBy = clsx(rest['aria-describedby'], hint && `${inputId}-hint`, error && `${inputId}-error`);
  const invalid = error ? true : rest['aria-invalid'];

  return (
    <div className="j-field">
      <div className="j-field-label-row">
        <label htmlFor={inputId}>{label}</label>
      </div>
      <div className="j-input-box" data-invalid={invalid && invalid !== 'false' ? true : undefined}>
        {prefix}
        <input
          {...rest}
          ref={inputRef}
          id={inputId}
          className={clsx('j-input-el', className)}
          disabled={disabled}
          readOnly={readOnly}
          value={value}
          aria-describedby={describedBy || undefined}
          aria-invalid={invalid}
          onChange={(event) => setValue(event.currentTarget.value)}
        />
        {suffix}
        {clearable && value && !disabled && !readOnly && (
          <IconButton label={`Clear ${label}`} variant="ghost" size="xs" onClick={() => {
            setValue('');
            inputRef.current?.focus();
          }}>
            <X size={13} aria-hidden="true" />
          </IconButton>
        )}
      </div>
      {hint && <div id={`${inputId}-hint`} className="j-field-hint">{hint}</div>}
      <div aria-live="polite" className="j-field-error" id={`${inputId}-error`} style={{ display: error ? undefined : 'contents' }}>
        {error}
      </div>
    </div>
  );
}

export type SelectOption<T extends string = string> = { value: T; label: string };

type SelectProps<T extends string> = {
  id?: string;
  name?: string;
  label: string;
  options: readonly SelectOption<T>[];
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  query?: string;
  onQueryChange?: (query: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function Select<T extends string>({
  id,
  name,
  label,
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  query: controlledQuery,
  onQueryChange,
  open: controlledOpen,
  onOpenChange,
}: SelectProps<T>) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${inputId}-options`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useControllableState<T | undefined>({
    value: controlledValue,
    defaultValue,
    onChange: onChange && ((next) => { if (next !== undefined) onChange(next); }),
  });
  const [query, setQuery] = useControllableState({ value: controlledQuery, defaultValue: '', onChange: onQueryChange });
  const [open, setOpen] = useControllableState({ value: controlledOpen, defaultValue: false, onChange: onOpenChange });
  const [highlighted, setHighlighted] = useState<T>();
  const expanded = open && !disabled;
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(search) || option.value.toLowerCase().includes(search));
  }, [options, query]);
  const items = useMemo(() => filtered.map((option) => option.value), [filtered]);
  const active = items.find((item) => item === highlighted)
    ?? items.find((item) => item === value) ?? items[0];
  const { onKeyDown } = useRovingFocus({ items, active: active ?? ('' as T), onSelect: setHighlighted });
  const { playSound } = useJuice();

  function close() {
    setOpen(false);
    setQuery('');
    setHighlighted(undefined);
  }

  function choose(next: T) {
    if (next !== value) {
      playSound('tap');
      setValue(next);
    }
    close();
    inputRef.current?.focus();
  }

  return (
    <div className="j-field" onBlur={(event) => {
      if (expanded && !event.currentTarget.contains(event.relatedTarget)) close();
    }}>
      <div className="j-field-label-row"><label htmlFor={inputId}>{label}</label></div>
      {name && <input type="hidden" name={name} value={value ?? ''} disabled={disabled} />}
      <div className="j-input-box">
        {expanded && <Search size={14} aria-hidden="true" />}
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          className="j-input-el"
          autoComplete="off"
          disabled={disabled}
          value={expanded ? query : selected?.label ?? ''}
          placeholder={expanded ? 'Search options' : placeholder}
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          aria-activedescendant={expanded && active !== undefined ? `${listId}-${items.indexOf(active)}` : undefined}
          onFocus={(event) => { if (!expanded) event.currentTarget.select(); }}
          onClick={() => { if (!expanded) setOpen(true); }}
          onChange={(event) => {
            setOpen(true);
            setQuery(event.currentTarget.value);
            setHighlighted(undefined);
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'Escape' && expanded) {
              event.preventDefault();
              event.stopPropagation();
              close();
              return;
            }
            if (event.key === 'Enter' && expanded) {
              event.preventDefault();
              if (active !== undefined) choose(active);
              return;
            }
            if (!expanded && ['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
              event.preventDefault();
              setOpen(true);
              if (event.key === 'ArrowUp') setHighlighted(items.at(-1));
              return;
            }
            if (expanded && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) onKeyDown(event);
          }}
        />
        <IconButton
          label={`${expanded ? 'Close' : 'Open'} ${label} options`}
          size="xs"
          variant="ghost"
          disabled={disabled}
          tabIndex={-1}
          onClick={() => {
            if (expanded) close();
            else setOpen(true);
            inputRef.current?.focus();
          }}
        >
          <ChevronDown size={14} aria-hidden="true" />
        </IconButton>
      </div>
      {expanded && (
        <>
          <div id={listId} role="listbox" aria-label={label} className="j-menu-list">
            {filtered.map((option, index) => (
              <div
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={option.value === value}
                className="j-menu-item"
                data-highlighted={option.value === active || undefined}
                onMouseMove={() => setHighlighted(option.value)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option.value)}
              >
                {option.label}
                {option.value === value && <Check size={14} aria-hidden="true" />}
              </div>
            ))}
          </div>
          {filtered.length === 0 && <div className="j-field-hint" role="status">No matching options</div>}
        </>
      )}
    </div>
  );
}

const radioCardStyles = `
  .j-radio-card:has(> input:checked) {
    background: var(--juice-w12);
    box-shadow: inset 0 0 0 1.5px var(--fill-on);
  }
  .j-radio-card > .j-radio-dot > .j-radio-dot-inner { visibility: hidden; }
  .j-radio-card:has(> input:checked) > .j-radio-dot {
    background: var(--fill-on);
    box-shadow: none;
  }
  .j-radio-card:has(> input:checked) .j-radio-dot-inner { visibility: visible; }
  .j-radio-card:has(> input:focus-visible) {
    outline: 2px solid var(--juice-signal);
    outline-offset: 2px;
  }
  .j-radio-card:has(> input:disabled) { cursor: default; opacity: 0.55; }
`;

export function RadioCard({
  label,
  children,
  className,
  checked: controlledChecked,
  defaultChecked = false,
  disabled,
  onChange,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'children' | 'className'> & {
  label: ReactNode;
  children?: ReactNode;
  className?: string;
  onChange?: InputHTMLAttributes<HTMLInputElement>['onChange'];
}) {
  return (
    <>
      <style href="juice-foundation-radio-card" precedence="default">{radioCardStyles}</style>
      <label
        className={clsx('j-radio-card', className)}
        data-checked={controlledChecked ? true : undefined}
        style={{ position: 'relative' }}
      >
        <input
          {...rest}
          type="radio"
          checked={controlledChecked}
          defaultChecked={controlledChecked === undefined ? defaultChecked : undefined}
          disabled={disabled}
          onChange={onChange}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        />
        <span>{label}</span>
        {children}
        <span className="j-radio-dot" aria-hidden="true">
          <span className="j-radio-dot-inner" />
        </span>
      </label>
    </>
  );
}

function snapNumber(value: number, min: number, max: number, step: number) {
  const origin = Number.isFinite(min) ? min : 0;
  const bounded = Math.min(max, Math.max(min, value));
  if (bounded === min || bounded === max) return bounded;
  const snapped = origin + Math.round((bounded - origin) / step) * step;
  return Math.min(max, Math.max(min, Number(snapped.toPrecision(15))));
}

export function NumberField({
  label,
  name,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  value: controlledValue,
  defaultValue = 0,
  onChange,
  disabled = false,
}: {
  label: string;
  name?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
}) {
  const { playSound } = useJuice();
  const labelId = useId();
  const [value, setValue] = useControllableState({ value: controlledValue, defaultValue, onChange });
  const increment = Number.isFinite(step) && step > 0 ? step : 1;
  const [mantissa, exponent = '0'] = String(value).split('e');
  const decimals = Math.max(0, (mantissa?.split('.')[1]?.length ?? 0) - Number(exponent));
  const decrease = snapNumber(value - increment, min, max, increment);
  const increase = snapNumber(value + increment, min, max, increment);

  function change(next: number) {
    playSound('tap');
    setValue(next);
  }

  return (
    <div className="j-field-label-row">
      <span id={labelId}>{label}</span>
      <div className="j-num-stepper" role="group" aria-labelledby={labelId}>
        {name && <input type="hidden" name={name} value={value} disabled={disabled} />}
        <button className="j-num-btn" type="button" aria-label={`Decrease ${label}`} disabled={disabled || decrease >= value} onClick={() => change(decrease)}>
          <Minus size={14} aria-hidden="true" />
        </button>
        <output className="j-num-val" aria-label={String(value)}>
          <span aria-hidden="true"><RollingNumber value={value} decimals={Math.min(100, decimals)} /></span>
        </output>
        <button className="j-num-btn" type="button" aria-label={`Increase ${label}`} disabled={disabled || increase <= value} onClick={() => change(increase)}>
          <Plus size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function Slider({ label, value, min = 0, max = 100, step = 1, unit, onChange }: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const { playSound } = useJuice();
  const labelId = useId();
  const valueText = unit ? `${value} ${unit}` : String(value);
  const scrub = useScrubDrag({
    value, min, max, step, onChange,
    onScrubSound: () => playSound('tap'),
  });

  return (
    <div className="j-field">
      <div className="j-field-label-row">
        <span id={labelId}>{label}</span>
        <span>{valueText}</span>
      </div>
      <div
        {...scrub.scrubProps}
        className="j-slider-track"
        aria-labelledby={labelId}
        aria-valuetext={unit ? valueText : undefined}
        ref={(element) => { scrub.trackRef.current = element; }}
      >
        <div className="j-slider-rail" aria-hidden="true">
          <div className="j-slider-fill" style={{ width: `${scrub.percent}%` }} />
        </div>
        <div className="j-slider-thumb" aria-hidden="true" style={{ left: `${scrub.percent}%` }} />
      </div>
    </div>
  );
}

type ShowcaseProps = { id?: string };

const showcaseStyle = { padding: 10 };
const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  padding: '6px 9px',
  borderRadius: 'var(--juice-r-inner)',
  background: 'var(--juice-w6)',
  fontSize: 12,
} as const;

const variants = ['primary', 'secondary', 'outline', 'ghost', 'danger'] as const;
const sizeOptions = [
  { value: 'xs', label: 'XS' },
  { value: 'sm', label: 'SM' },
  { value: 'md', label: 'MD' },
] as const;

export function ButtonKit({ id = 'button-kit' }: ShowcaseProps = {}) {
  const { playSound } = useJuice();
  const [variant, setVariant] = useState<ButtonVariant>('primary');
  const [size, setSize] = useState<(typeof sizeOptions)[number]['value']>('md');
  const [loading, setLoading] = useState(false);
  const [presses, setPresses] = useState(0);

  function triggerPress() {
    if (loading) return;
    playSound('tap');
    setPresses((current) => current + 1);
  }

  useJuiceAgentNode(id, 'ButtonKit', { variant, size, loading, presses }, {
    setVariant: (value: string) => {
      const next = variants.find((item) => item === value);
      if (next) setVariant(next);
    },
    toggleLoading: () => setLoading((current) => !current),
    triggerPress,
  });

  return (
    <div id={id} className="j-slab j-fnd-card" style={showcaseStyle}>
      <div role="group" aria-label="Button variant" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {variants.map((item) => (
          <Button key={item} variant={item} size="xs" aria-pressed={variant === item} onClick={() => setVariant(item)}>
            {item[0]?.toUpperCase()}{item.slice(1)}
          </Button>
        ))}
      </div>
      <div className="j-field-label-row">
        <span>Button size</span>
        <SegmentedControl options={sizeOptions} value={size} onChange={setSize} />
      </div>
      <div className="j-field-label-row">
        <span>Loading</span>
        <Switch checked={loading} onChange={setLoading} aria-label="Loading" />
      </div>
      <div style={rowStyle}>
        <Button variant={variant} size={size} loading={loading} onClick={triggerPress}>Deploy</Button>
        <span className="j-field-hint" role="status">{presses} {presses === 1 ? 'press' : 'presses'}</span>
      </div>
    </div>
  );
}

const defaultSlug = 'juice-bench';

export function InputFields({ id = 'input-fields' }: ShowcaseProps = {}) {
  const [slug, setSlug] = useState(defaultSlug);
  const [secret, setSecret] = useState('whsec_demo_secret');
  const secretId = useId();
  const error = !slug.trim() ? 'Enter a project slug.' : /\s/.test(slug) ? 'A slug cannot contain spaces.' : undefined;

  useJuiceAgentNode(id, 'InputFields', { slug, error, hasSecret: secret.length > 0 }, {
    setSlug: (value: string) => { if (typeof value === 'string') setSlug(value); },
    triggerError: () => setSlug('invalid slug'),
    resetValid: () => setSlug(defaultSlug),
  });

  return (
    <div id={id} className="j-slab j-fnd-card" style={showcaseStyle} onKeyDown={(event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const secretInput = event.currentTarget.querySelector<HTMLInputElement>(`[id="${secretId}"]`);
        secretInput?.focus();
      }
    }}>
      <TextField label="Project Slug" value={slug} onChange={setSlug} placeholder="my-project" error={error} spellCheck={false} />
      <TextField
        id={secretId}
        label="Webhook Secret"
        type="password"
        value={secret}
        onChange={setSecret}
        placeholder="whsec_…"
        aria-keyshortcuts="Meta+K Control+K"
        suffix={<Kbd>⌘K</Kbd>}
        clearable
      />
    </div>
  );
}

const regions = [
  { value: 'us-east-1', label: 'us-east-1 · Virginia' },
  { value: 'eu-central-1', label: 'eu-central-1 · Frankfurt' },
  { value: 'ap-northeast-1', label: 'ap-northeast-1 · Tokyo' },
  { value: 'us-west-2', label: 'us-west-2 · Oregon' },
] as const;

type Region = (typeof regions)[number]['value'];

export function SelectCombobox({ id = 'select-combobox' }: ShowcaseProps = {}) {
  const [region, setRegion] = useState<Region>('us-east-1');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  useJuiceAgentNode(id, 'SelectCombobox', { region, query, open }, {
    selectRegion: (value: string) => {
      const selected = regions.find((option) => option.value === value);
      if (!selected) return;
      setRegion(selected.value);
      setQuery('');
      setOpen(false);
    },
    filterQuery: (value: string) => {
      if (typeof value !== 'string') return;
      setQuery(value);
      setOpen(true);
    },
  });

  return (
    <div id={id} className="j-slab j-fnd-card" style={showcaseStyle}>
      <Select
        label="Deployment Region"
        options={regions}
        value={region}
        onChange={setRegion}
        query={query}
        onQueryChange={setQuery}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

const plans = [
  { value: 'hobby', label: 'Hobby', price: '$0' },
  { value: 'pro', label: 'Pro', price: '$20' },
  { value: 'enterprise', label: 'Enterprise', price: 'Custom' },
] as const;
const addons = [
  { key: 'edge-cache', label: 'Edge Cache' },
  { key: 'ddos-shield', label: 'DDoS Shield' },
] as const;
type Plan = (typeof plans)[number]['value'];
type AddonKey = (typeof addons)[number]['key'];

export function ChoiceCards({ id = 'choice-cards' }: ShowcaseProps = {}) {
  const radioName = useId();
  const { playSound } = useJuice();
  const [plan, setPlan] = useState<Plan>('hobby');
  const [enabledAddons, setEnabledAddons] = useState<AddonKey[]>([]);
  const allEnabled = enabledAddons.length === addons.length;

  function selectPlan(next: Plan) {
    if (next === plan || !plans.some((option) => option.value === next)) return;
    playSound('latch');
    setPlan(next);
  }

  function setAddon(key: AddonKey, checked: boolean) {
    setEnabledAddons((current) => {
      if (checked) return current.includes(key) ? current : [...current, key];
      return current.filter((item) => item !== key);
    });
  }

  useJuiceAgentNode(id, 'ChoiceCards', { plan, addons: enabledAddons, allEnabled }, {
    selectPlan,
    toggleAddon: (name: string) => {
      if (typeof name !== 'string') return;
      const addon = addons.find(({ key, label }) => key === name || label.toLowerCase() === name.toLowerCase());
      if (!addon) return;
      const checked = !enabledAddons.includes(addon.key);
      playSound(checked ? 'latch' : 'tap');
      setAddon(addon.key, checked);
    },
  });

  return (
    <div id={id} className="j-slab j-fnd-card" style={showcaseStyle}>
      <div className="j-field" role="radiogroup" aria-label="Deployment plan">
        {plans.map(({ value, label, price }) => (
          <RadioCard
            key={value}
            name={radioName}
            value={value}
            checked={plan === value}
            label={<span style={{ fontSize: 13 }}>{label} <span className="j-field-hint">· {price}</span></span>}
            onChange={() => selectPlan(value)}
          />
        ))}
      </div>
      <div className="j-menu-list" role="group" aria-label="Plan add-ons">
        <div className="j-field-label-row" style={{ minHeight: 26, paddingInline: 5 }}>
          <span>Select all add-ons <span className="j-field-hint">({enabledAddons.length}/{addons.length})</span></span>
          <Checkbox
            checked={allEnabled}
            aria-label="Select all add-ons"
            onChange={(checked) => setEnabledAddons(checked ? addons.map(({ key }) => key) : [])}
          />
        </div>
        {addons.map(({ key, label }) => (
          <div key={key} className="j-field-label-row" style={{ minHeight: 26, paddingInline: 5 }}>
            <span>{label}</span>
            <Checkbox checked={enabledAddons.includes(key)} aria-label={label} onChange={(checked) => setAddon(key, checked)} />
          </div>
        ))}
      </div>
    </div>
  );
}

const instanceRange = { min: 1, max: 32, step: 1 };
const memoryRange = { min: 512, max: 8192, step: 256 };

export function RangeNumberKit({ id = 'range-number-kit' }: ShowcaseProps = {}) {
  const [instances, setInstances] = useState(8);
  const [memory, setMemory] = useState(2048);

  useJuiceAgentNode(id, 'RangeNumberKit', { instances, memory }, {
    setInstances: (value: number) => {
      if (Number.isFinite(value)) setInstances(snapNumber(value, instanceRange.min, instanceRange.max, instanceRange.step));
    },
    setMemory: (value: number) => {
      if (Number.isFinite(value)) setMemory(snapNumber(value, memoryRange.min, memoryRange.max, memoryRange.step));
    },
  });

  return (
    <div id={id} className="j-slab j-fnd-card" style={showcaseStyle}>
      <NumberField label="Max Instances" {...instanceRange} value={instances} onChange={setInstances} />
      <Slider label="Memory Allocation" {...memoryRange} value={memory} onChange={setMemory} unit="MB" />
    </div>
  );
}

const days = [18, 19, 20, 21, 22, 23, 24];

export function TagCalendarKit({ id = 'tag-calendar-kit' }: ShowcaseProps = {}) {
  const { playSound } = useJuice();
  const tagInputId = useId();
  const tagInputRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [tags, setTags] = useState(['react', 'vue', 'typescript']);
  const [editing, setEditing] = useState(false);
  const [draftTag, setDraftTag] = useState('');
  const [dates, setDates] = useState({ start: 18, end: 24, pickingEnd: false });

  useEffect(() => {
    if (editing) tagInputRef.current?.focus();
  }, [editing]);

  function addTag(tag: string) {
    if (typeof tag !== 'string') return;
    const next = tag.trim();
    if (!next || tags.some((item) => item.toLowerCase() === next.toLowerCase())) return;
    setTags((current) => [...current, next]);
    playSound('latch');
  }

  function removeTag(tag: string) {
    if (!tags.includes(tag)) return;
    setTags((current) => current.filter((item) => item !== tag));
    playSound('tap');
  }

  function finishEditing() {
    setDraftTag('');
    setEditing(false);
    addButtonRef.current?.focus();
  }

  function selectDate(day: number) {
    if (!days.includes(day)) return;
    playSound('tap');
    setDates(({ start, pickingEnd }) => pickingEnd
      ? { start: Math.min(start, day), end: Math.max(start, day), pickingEnd: false }
      : { start: day, end: day, pickingEnd: true });
  }

  const dateLabel = (dates.start === dates.end) ? `Nov ${dates.start}` : `Nov ${dates.start} – Nov ${dates.end}`;
  const canAddTag = Boolean(draftTag.trim()) && !tags.some((tag) => tag.toLowerCase() === draftTag.trim().toLowerCase());

  useJuiceAgentNode(id, 'TagCalendarKit', { tags, dates }, { addTag, removeTag, selectDate });

  return (
    <div id={id} className="j-slab j-fnd-card" style={showcaseStyle}>
      <div role="group" aria-label="Tags" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
        {tags.map((tag) => (
          <Badge key={tag} style={{ height: 'auto', minHeight: 24, maxWidth: '100%', paddingRight: 3, overflowWrap: 'anywhere' }}>
            {tag}
            <IconButton label={`Remove ${tag} tag`} size="xs" variant="ghost" onClick={() => {
              removeTag(tag);
              (editing ? tagInputRef.current : addButtonRef.current)?.focus();
            }} style={{ width: 20, height: 20, flexShrink: 0 }}>
              <X size={11} aria-hidden="true" />
            </IconButton>
          </Badge>
        ))}
        <Button
          ref={addButtonRef}
          variant="outline"
          size="xs"
          aria-expanded={editing}
          aria-controls={editing ? tagInputId : undefined}
          onClick={() => { if (editing) finishEditing(); else setEditing(true); }}
          leftIcon={<Plus size={12} aria-hidden="true" />}
        >
          Add tag
        </Button>
      </div>
      {editing && (
        <div className="j-input-box" onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === 'Escape' || event.key === 'Enter') event.preventDefault();
          if (event.key === 'Escape') finishEditing();
          if (event.key === 'Enter' && canAddTag) {
            addTag(draftTag);
            finishEditing();
          }
        }}>
          <input
            id={tagInputId}
            ref={tagInputRef}
            className="j-input-el"
            aria-label="New tag"
            placeholder="New tag"
            value={draftTag}
            onChange={(event) => setDraftTag(event.currentTarget.value)}
          />
          <Button size="xs" disabled={!canAddTag} onClick={() => {
            addTag(draftTag);
            finishEditing();
          }}>Add</Button>
        </div>
      )}
      <div className="j-field-label-row">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Calendar size={13} aria-hidden="true" /> Date range</span>
        <output>{dateLabel}</output>
      </div>
      <div role="group" aria-label="November date range" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 3 }}>
        {days.map((day) => {
          const endpoint = day === dates.start || day === dates.end;
          const included = day >= dates.start && day <= dates.end;
          return (
            <Button
              key={day}
              size="sm"
              variant={endpoint ? 'primary' : included ? 'secondary' : 'ghost'}
              aria-label={`November ${day}`}
              aria-pressed={included}
              onClick={() => selectDate(day)}
              style={{ padding: 0 }}
            >
              {day}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

const settings = [
  { key: 'zero-downtime-deploy', label: 'Zero-Downtime Deploy' },
  { key: 'preview-comments', label: 'Preview Comments' },
  { key: 'strict-typecheck', label: 'Strict Typecheck' },
] as const;

type SettingKey = (typeof settings)[number]['key'];

export function SettingsRows({ id = 'settings-rows' }: ShowcaseProps = {}) {
  const { playSound } = useJuice();
  const [enabled, setEnabled] = useState<Record<SettingKey, boolean>>({
    'zero-downtime-deploy': true,
    'preview-comments': false,
    'strict-typecheck': true,
  });
  const activeCount = settings.filter(({ key }) => enabled[key]).length;

  useJuiceAgentNode(id, 'SettingsRows', { settings: enabled, activeCount }, {
    toggleSetting: (value: string) => {
      if (typeof value !== 'string') return;
      const setting = settings.find(({ key, label }) => key === value || label.toLowerCase() === value.toLowerCase());
      if (!setting) return;
      playSound(enabled[setting.key] ? 'tap' : 'latch');
      setEnabled((current) => ({ ...current, [setting.key]: !current[setting.key] }));
    },
    enableAll: () => {
      if (activeCount === settings.length) return;
      playSound('latch');
      setEnabled({ 'zero-downtime-deploy': true, 'preview-comments': true, 'strict-typecheck': true });
    },
  });

  return (
    <div id={id} className="j-slab j-fnd-card" style={showcaseStyle}>
      <div className="j-field-label-row">
        <span>Deployment settings</span>
        <span className="j-field-hint" role="status">{activeCount}/{settings.length} active</span>
      </div>
      {settings.map(({ key, label }) => (
        <div key={key} style={rowStyle}>
          <span>{label}</span>
          <Switch checked={enabled[key]} aria-label={label} onChange={(checked) => setEnabled((current) => ({ ...current, [key]: checked }))} />
        </div>
      ))}
    </div>
  );
}

type UploadFile = { id: string; name: string; size: string };

const sampleFiles: UploadFile[] = [
  { id: 'sample-tokens', name: 'tokens.json', size: '4.2 KB' },
  { id: 'sample-schema', name: 'schema.sql', size: '18.6 KB' },
];

function formatFileSize(bytes: number) {
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(1)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export function FileDropzone({ id = 'file-dropzone' }: ShowcaseProps = {}) {
  const { playSound } = useJuice();
  const fileInput = useRef<HTMLInputElement>(null);
  const nextFileId = useRef(0);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [progress, setProgress] = useState(0);
  const status = files.length === 0 ? 'idle' : progress < 100 ? 'uploading' : 'complete';
  const uploading = status === 'uploading';

  useEffect(() => {
    if (!uploading) return;
    const timer = setInterval(() => setProgress((current) => Math.min(100, current + 10)), 100);
    return () => clearInterval(timer);
  }, [uploading]);

  function acceptFiles(selectedFiles: FileList | null) {
    if (!selectedFiles?.length) return;
    const next = Array.from(selectedFiles, (file) => ({
      id: `upload-${nextFileId.current++}`,
      name: file.name,
      size: formatFileSize(file.size),
    }));
    setFiles((current) => [...current, ...next]);
    setProgress(0);
    playSound('tap');
  }

  function simulateUpload() {
    setFiles((current) => {
      const samples = sampleFiles.filter((file) => !current.some((item) => item.id === file.id));
      return [...current, ...samples];
    });
    setProgress(0);
    playSound('tap');
  }

  function clearFiles() {
    setFiles([]);
    setProgress(0);
  }

  useJuiceAgentNode(id, 'FileDropzone', { status, files, progress: status === 'idle' ? 0 : progress }, { simulateUpload, clearFiles });

  return (
    <div id={id} className="j-slab j-fnd-card" style={showcaseStyle}>
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          acceptFiles(event.currentTarget.files);
          event.currentTarget.value = '';
        }}
      />
      <div
        style={{ ...rowStyle, flexDirection: 'column', padding: 10, background: dragging ? 'var(--juice-w20)' : 'var(--juice-w6)' }}
        onDragEnter={(event) => {
          if (!event.dataTransfer.types.includes('Files')) return;
          event.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes('Files')) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          acceptFiles(event.dataTransfer.files);
        }}
      >
        <span>Drop assets here</span>
        <Button variant="secondary" size="sm" leftIcon={<Upload size={14} aria-hidden="true" />} onClick={() => fileInput.current?.click()}>
          Choose files
        </Button>
      </div>
      {status !== 'idle' && (
        <div className="j-field">
          <div className="j-field-label-row">
            <span role="status">{uploading ? 'Uploading assets' : 'Upload complete'}</span>
            <span>{progress}%</span>
          </div>
          <div
            className="j-slider-rail"
            role="progressbar"
            aria-label="Upload progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div className="j-slider-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {files.map((file) => (
        <div key={file.id} style={rowStyle}>
          <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{file.name} <span className="j-field-hint">· {file.size}</span></span>
          <IconButton
            label={`Remove ${file.name}`}
            size="xs"
            variant="ghost"
            style={{ flexShrink: 0 }}
            onClick={() => setFiles((current) => current.filter((item) => item.id !== file.id))}
          >
            <X size={13} aria-hidden="true" />
          </IconButton>
        </div>
      ))}
      <div className="j-field-label-row">
        <Button variant="outline" size="xs" disabled={uploading} onClick={simulateUpload}>Simulate upload</Button>
        {files.length > 0 && <Button variant="ghost" size="xs" onClick={clearFiles}>Clear files</Button>}
      </div>
    </div>
  );
}
