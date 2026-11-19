import {
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  watch,
  type InjectionKey,
  type PropType,
  type Ref,
  type VNodeChild,
  type WritableComputedRef,
} from 'vue';
import {
  isJuiceSoundEnabled,
  playJuiceSound,
  registerJuiceAgentNode,
  setJuiceSoundEnabled,
  subscribeJuiceSound,
  type ActionButtonStage,
  type IslandMode,
  type JuiceFill,
  type JuiceSoundName,
  type JuiceTheme,
} from '@juice-ui/react';

export {
  JUICE_SOUND_CATALOG,
  isJuiceSoundEnabled,
  playJuiceSound,
  registerJuiceAgentNode,
  setJuiceSoundEnabled,
  unregisterJuiceAgentNode,
} from '@juice-ui/react';

export type { JuiceFill, JuiceSoundName, JuiceTheme } from '@juice-ui/react';

function useModel<T>(readProp: () => T | undefined, initial: T, emit: (value: T) => void): WritableComputedRef<T> {
  const internal = shallowRef(initial);
  return computed({
    get: () => readProp() ?? internal.value,
    set(value: T) {
      if (readProp() === undefined) internal.value = value;
      emit(value);
    },
  });
}

type JuiceConfig = {
  theme: Readonly<Ref<JuiceTheme>>;
  fill: Readonly<Ref<JuiceFill>>;
  sound: Readonly<Ref<boolean>>;
  animate: Readonly<Ref<boolean>>;
  setTheme: (value: JuiceTheme) => void;
  setFill: (value: JuiceFill) => void;
  setSound: (value: boolean) => void;
  setAnimate: (value: boolean) => void;
  playSound: (name: JuiceSoundName) => void;
};

const juiceKey: InjectionKey<JuiceConfig> = Symbol('Juice provider');

function useSharedSound(initial = isJuiceSoundEnabled()) {
  const sound = ref(initial);
  let unsubscribe: (() => void) | undefined;
  onMounted(() => {
    sound.value = isJuiceSoundEnabled();
    unsubscribe = subscribeJuiceSound(() => {
      sound.value = isJuiceSoundEnabled();
    });
  });
  onBeforeUnmount(() => unsubscribe?.());
  return sound;
}

export const JProvider = defineComponent({
  name: 'JProvider',
  props: {
    theme: String as PropType<JuiceTheme>,
    fill: String as PropType<JuiceFill>,
    sound: { type: Boolean, default: undefined },
    animate: { type: Boolean, default: undefined },
    defaultTheme: { type: String as PropType<JuiceTheme>, default: 'light' },
    defaultFill: { type: String as PropType<JuiceFill>, default: 'slab' },
    defaultSound: { type: Boolean, default: true },
    defaultAnimate: { type: Boolean, default: true },
  },
  emits: ['update:theme', 'update:fill', 'update:sound', 'update:animate'],
  setup(props, { emit, slots }) {
    const theme = useModel(() => props.theme, props.defaultTheme, value => emit('update:theme', value));
    const fill = useModel(() => props.fill, props.defaultFill, value => emit('update:fill', value));
    const animate = useModel(() => props.animate, props.defaultAnimate, value => emit('update:animate', value));
    const sharedSound = useSharedSound(props.defaultSound && isJuiceSoundEnabled());
    const sound = computed(() => props.sound ?? sharedSound.value);

    onMounted(() => {
      if (props.sound !== undefined) setJuiceSoundEnabled(props.sound);
      else if (!props.defaultSound) setJuiceSoundEnabled(false);
    });
    watch(() => props.sound, value => {
      if (value !== undefined) setJuiceSoundEnabled(value);
    });

    provide(juiceKey, {
      theme, fill, sound, animate,
      setTheme: value => { theme.value = value; },
      setFill: value => { fill.value = value; },
      setSound: value => {
        if (props.sound === undefined) setJuiceSoundEnabled(value);
        emit('update:sound', value);
      },
      setAnimate: value => { animate.value = value; },
      playSound: name => {
        if (sound.value) playJuiceSound(name);
      },
    });

    return () => h('div', {
      class: 'juice-root',
      'data-theme': theme.value,
      'data-fill': fill.value === 'solid' ? 'dark' : theme.value,
      'data-tone': fill.value,
      'data-animate': animate.value ? 'on' : 'off',
    }, slots.default?.());
  },
});

export function useJuice(): JuiceConfig {
  const context = inject(juiceKey, null);
  if (context) return context;
  return {
    theme: ref('light'),
    fill: ref('slab'),
    sound: useSharedSound(),
    animate: ref(true),
    setTheme: () => {},
    setFill: () => {},
    setSound: setJuiceSoundEnabled,
    setAnimate: () => {},
    playSound: playJuiceSound,
  };
}

export function useJuiceAgentNode(
  id: string | undefined | (() => string | undefined),
  type: string,
  getState: () => Record<string, unknown>,
  actions: Record<string, (payload?: any) => void>,
): void {
  let stop: (() => void) | undefined;
  onMounted(() => {
    stop = watch(typeof id === 'function' ? id : () => id, (nodeId, _, onCleanup) => {
      if (!nodeId) return;
      onCleanup(registerJuiceAgentNode({
        id: nodeId,
        type,
        getState,
        act(action, payload) {
          if (!Object.prototype.hasOwnProperty.call(actions, action)) return false;
          actions[action]?.(payload);
          return true;
        },
      }));
    }, { immediate: true });
  });
  onBeforeUnmount(() => stop?.());
}

export const JKbd = defineComponent({
  name: 'JKbd',
  setup(_, { slots }) {
    return () => h('kbd', { class: 'j-kbd' }, slots.default?.());
  },
});

type BadgeTone = 'neutral' | 'ok' | 'warn' | 'danger' | 'signal';

export const JBadge = defineComponent({
  name: 'JBadge',
  props: { tone: { type: String as PropType<BadgeTone>, default: 'neutral' } },
  setup(props, { slots }) {
    return () => h('span', { class: 'j-badge', 'data-tone': props.tone }, slots.default?.());
  },
});

export const JSwitch = defineComponent({
  name: 'JSwitch',
  props: {
    id: String,
    modelValue: { type: Boolean, default: undefined },
    defaultChecked: Boolean,
    disabled: Boolean,
  },
  emits: { 'update:modelValue': (_value: boolean) => true },
  setup(props, { emit }) {
    const { playSound } = useJuice();
    const checked = useModel(() => props.modelValue, props.defaultChecked, value => emit('update:modelValue', value));

    function set(value: boolean) {
      if (props.disabled || checked.value === value) return;
      checked.value = value;
      playSound(value ? 'latch' : 'tap');
    }

    const toggle = () => set(!checked.value);
    useJuiceAgentNode(() => props.id, 'Switch', () => ({ checked: checked.value }), {
      toggle,
      set: (value: unknown) => { if (typeof value === 'boolean') set(value); },
    });

    return () => h('button', {
      id: props.id,
      type: 'button',
      role: 'switch',
      disabled: props.disabled,
      'aria-checked': checked.value,
      'data-checked': String(checked.value),
      class: 'j-switch',
      onClick: toggle,
    }, [h('i', { class: 'j-switch-thumb', 'aria-hidden': 'true' })]);
  },
});

type SegmentedOption = { value: string; label: string };

export const JSegmentedControl = defineComponent({
  name: 'JSegmentedControl',
  props: {
    id: String,
    options: { type: Array as PropType<readonly SegmentedOption[]>, required: true },
    modelValue: String,
  },
  emits: { 'update:modelValue': (_value: string) => true },
  setup(props, { emit }) {
    const { playSound } = useJuice();
    const selection = ref<string>();
    const selected = computed(() => {
      const value = props.modelValue ?? selection.value;
      return props.options.find(option => option.value === value)?.value ?? props.options[0]?.value;
    });

    function select(value: string) {
      if (value === selected.value || !props.options.some(option => option.value === value)) return;
      if (props.modelValue === undefined) selection.value = value;
      emit('update:modelValue', value);
      playSound('tap');
    }

    function onKeyDown(event: KeyboardEvent) {
      const options = props.options;
      if (!options.length) return;
      const current = options.findIndex(option => option.value === selected.value);
      let next: number;
      switch (event.key) {
        case 'ArrowLeft': next = (current - 1 + options.length) % options.length; break;
        case 'ArrowRight': next = (current + 1) % options.length; break;
        case 'Home': next = 0; break;
        case 'End': next = options.length - 1; break;
        default: return;
      }
      const option = options[next];
      if (!option) return;
      event.preventDefault();
      select(option.value);
      (event.currentTarget as HTMLElement).querySelectorAll('button')[next]?.focus();
    }

    useJuiceAgentNode(() => props.id, 'SegmentedControl', () => ({ value: selected.value }), {
      select: (value: unknown) => { if (typeof value === 'string') select(value); },
    });

    return () => h('div', { id: props.id, role: 'tablist', class: 'j-seg', onKeyDown },
      props.options.map(option => {
        const active = option.value === selected.value;
        return h('button', {
          key: option.value, type: 'button', role: 'tab', class: 'j-seg-btn',
          'aria-selected': active, 'data-active': active ? 'true' : undefined,
          tabindex: active ? 0 : -1, onClick: () => select(option.value),
        }, [h('span', option.label)]);
      }));
  },
});

const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export const JRollingNumber = defineComponent({
  name: 'JRollingNumber',
  props: {
    value: { type: Number, required: true },
    prefix: { type: String, default: '' },
    suffix: { type: String, default: '' },
    decimals: { type: Number, default: 0 },
  },
  setup(props) {
    const formatted = computed(() => {
      const decimals = Math.min(100, Math.max(0, Math.trunc(props.decimals)));
      const fixed = Number.isFinite(props.value) ? props.value.toFixed(decimals) : '0';
      return fixed.replace(/^-?\d+/, value => value.replace(/\B(?=(\d{3})+(?!\d))/g, ','));
    });

    return () => h('span', {
      class: 'j-rolling-num',
      role: 'img',
      'aria-label': `${props.prefix}${formatted.value}${props.suffix}`,
    }, [
      props.prefix && h('span', { style: { whiteSpace: 'pre' }, 'aria-hidden': 'true' }, props.prefix),
      ...Array.from(formatted.value, (character, index) => {
        if (!/\d/.test(character)) return h('span', { key: `sep-${index}`, 'aria-hidden': 'true' }, character);
        return h('span', {
          key: `col-${formatted.value.length - index}`, class: 'j-rolling-digit-col', 'aria-hidden': 'true',
        }, [h('span', {
          class: 'j-rolling-digit-ribbon',
          style: { transform: `translateY(-${Number(character) * 10}%)` },
        }, digits.map(digit => h('span', { key: digit }, String(digit))))]);
      }),
      props.suffix && h('span', { style: { whiteSpace: 'pre' }, 'aria-hidden': 'true' }, props.suffix),
    ]);
  },
});

function button(label: string, className: string, onClick: () => void, attrs = {}) {
  return h('button', { type: 'button', class: className, onClick, ...attrs }, label);
}

const stateLabels: Record<ActionButtonStage, [string, BadgeTone]> = {
  idle: ['Ready', 'neutral'],
  confirming: ['Confirm', 'signal'],
  pending: ['Signing…', 'neutral'],
  success: ['Settled', 'ok'],
  error: ['Failed', 'danger'],
};

export const JStateButton = defineComponent({
  name: 'JStateButton',
  props: {
    id: String,
    title: { type: String, default: 'Wire Transfer' },
    recipient: { type: String, default: 'studio@joplo.app' },
    amount: { type: Number, default: 1280 },
    stage: String as PropType<ActionButtonStage>,
  },
  emits: ['update:stage'],
  setup(props, { emit }) {
    const { playSound, animate } = useJuice();
    const stage = useModel<ActionButtonStage>(() => props.stage, 'idle', value => emit('update:stage', value));
    let timer: ReturnType<typeof setTimeout> | undefined;

    function clearPending() {
      clearTimeout(timer);
      timer = undefined;
    }

    function setStage(next: ActionButtonStage) {
      clearPending();
      stage.value = next;
    }

    function reset() {
      playSound('tap');
      setStage('idle');
    }

    function press() {
      switch (stage.value) {
        case 'idle':
          playSound('tap');
          setStage('confirming');
          break;
        case 'confirming':
          playSound('latch');
          setStage('pending');
          timer = setTimeout(() => {
            timer = undefined;
            if (stage.value !== 'pending') return;
            playSound('paid');
            stage.value = 'success';
          }, animate.value ? 650 : 0);
          break;
        case 'success':
        case 'error':
          reset();
          break;
      }
    }

    watch(stage, value => { if (value !== 'pending') clearPending(); });
    onBeforeUnmount(clearPending);
    useJuiceAgentNode(() => props.id, 'StateButton', () => ({
      stage: stage.value, amount: props.amount, recipient: props.recipient,
    }), {
      press, reset,
      setStage: (value: ActionButtonStage) => { if (Object.hasOwn(stateLabels, value)) setStage(value); },
    });

    return () => {
      const current = stage.value;
      const [status, tone] = stateLabels[current];
      const label = {
        idle: 'Send Transfer', confirming: `Tap again to confirm $${props.amount}`,
        pending: 'Broadcasting…', success: 'Transfer settled · Reset', error: 'Retry transfer',
      }[current];

      return h('div', { id: props.id, class: 'j-slab j-state-card', 'data-state': current }, [
        h('div', { class: 'j-state-meta' }, [
          h('div', [
            h('div', { style: { color: 'var(--juice-mute)', fontSize: '12px' } }, props.title),
            h('div', { class: 'j-state-amount' }, [h(JRollingNumber, { value: props.amount, prefix: '$', decimals: 2 })]),
          ]),
          h(JBadge, { tone, role: 'status' }, () => status),
        ]),
        h('div', { class: 'j-ai-row' }, [h('span', 'Recipient'), h('span', props.recipient)]),
        h('div', { style: { display: 'flex', gap: '6px' } }, [
          button(label, 'j-state-btn', press, { 'data-state': current, disabled: current === 'pending' }),
          current === 'confirming' && button('Cancel', 'j-chip', reset),
        ]),
      ]);
    };
  },
});

const swatches = [
  { id: 'cobalt', color: '#3b4eff', label: 'Cobalt' },
  { id: 'emerald', color: '#10b981', label: 'Emerald' },
  { id: 'ember', color: '#f97316', label: 'Ember' },
  { id: 'violet', color: '#8b5cf6', label: 'Violet' },
];

function useScrubRow(label: string, value: Ref<number>, min: number, max: number, suffix: string, onChange: (value: number) => void) {
  const pointer = ref<number>();
  const step = 2;

  function move(event: PointerEvent) {
    if (pointer.value !== event.pointerId) return;
    const { left, width } = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!width) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - left) / width));
    onChange(min + Math.round((ratio * (max - min)) / step) * step);
  }

  function stop(event: PointerEvent) {
    if (pointer.value === event.pointerId) pointer.value = undefined;
  }

  return () => h('div', {
    class: 'j-scrub-row',
    role: 'slider',
    tabindex: 0,
    'data-kind': 'slider',
    'data-held': pointer.value === undefined ? undefined : 'true',
    'aria-label': label,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuenow': value.value,
    'aria-valuetext': `${value.value}${suffix}`,
    onPointerdown(event: PointerEvent) {
      if (event.button !== 0 || pointer.value !== undefined) return;
      const row = event.currentTarget as HTMLElement;
      row.focus();
      row.setPointerCapture(event.pointerId);
      pointer.value = event.pointerId;
      move(event);
    },
    onPointermove: move,
    onPointerup: stop,
    onPointercancel: stop,
    onLostpointercapture: stop,
    onKeydown(event: KeyboardEvent) {
      let next: number;
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowDown': next = value.value - step; break;
        case 'ArrowRight':
        case 'ArrowUp': next = value.value + step; break;
        case 'Home': next = min; break;
        case 'End': next = max; break;
        default: return;
      }
      event.preventDefault();
      onChange(next);
    },
  }, [
    h('span', { class: 'j-scrub-fill', style: { width: `${(100 * (value.value - min)) / (max - min)}%` } }),
    h('span', { class: 'j-scrub-label' }, label),
    h('span', { class: 'j-scrub-dots', 'aria-hidden': 'true' }, Array.from({ length: 5 }, (_, key) => h('i', { key }))),
    h('span', { class: 'j-scrub-value' }, `${value.value}${suffix}`),
  ]);
}

export const JScrubPanel = defineComponent({
  name: 'JScrubPanel',
  props: {
    id: String,
    tension: Number,
    radius: Number,
    swatch: String,
    snapGrid: { type: Boolean, default: undefined },
  },
  emits: ['update:tension', 'update:radius', 'update:swatch', 'update:snapGrid'],
  setup(props, { emit }) {
    const { playSound } = useJuice();
    const tension = useModel(() => props.tension, 72, value => emit('update:tension', value));
    const radius = useModel(() => props.radius, 14, value => emit('update:radius', value));
    const swatch = useModel(() => props.swatch, 'cobalt', value => emit('update:swatch', value));
    const snapGrid = useModel(() => props.snapGrid, true, value => emit('update:snapGrid', value));

    function setNumber(value: unknown, model: Ref<number>, min: number, max: number, sound: JuiceSoundName) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return;
      const next = Math.min(max, Math.max(min, value));
      if (next === model.value) return;
      model.value = next;
      playSound(sound);
    }

    const setTension = (value: unknown) => setNumber(value, tension, 10, 100, 'scrub');
    const setRadius = (value: unknown) => setNumber(value, radius, 0, 24, 'tick');
    const tensionRow = useScrubRow('Tension', tension, 10, 100, '%', setTension);
    const radiusRow = useScrubRow('Corner radius', radius, 0, 24, 'px', setRadius);

    function setSwatch(value: unknown) {
      if (typeof value !== 'string' || !swatches.some(option => option.id === value) || swatch.value === value) return;
      swatch.value = value;
      playSound('pop');
    }

    function toggleSnap() {
      const next = !snapGrid.value;
      snapGrid.value = next;
      playSound(next ? 'latch' : 'tap');
    }

    useJuiceAgentNode(() => props.id, 'ScrubPanel', () => ({
      tension: tension.value, radius: radius.value, swatch: swatch.value, snapGrid: snapGrid.value,
    }), { setTension, setRadius, setSwatch, toggleSnap });

    return () => h('div', { id: props.id, class: 'j-slab j-scrub-panel' }, [
      h('div', { class: 'j-scrub-rows' }, [
        tensionRow(),
        radiusRow(),
        h('div', { class: 'j-scrub-row' }, [
          h('span', { class: 'j-scrub-label' }, 'Signal'),
          h('div', { class: 'j-swatch-group', role: 'group', 'aria-label': 'Signal color' }, swatches.map(option =>
            button('', 'j-swatch-dot', () => setSwatch(option.id), {
              key: option.id, 'aria-label': option.label, 'aria-pressed': swatch.value === option.id,
              'data-active': swatch.value === option.id ? 'true' : undefined,
              style: { background: option.color },
            }),
          )),
        ]),
        h('div', { class: 'j-scrub-row' }, [
          h('span', { class: 'j-scrub-label' }, 'Optical Snap'),
          h(JSwitch, {
            style: { marginLeft: 'auto' }, 'aria-label': 'Optical Snap', modelValue: snapGrid.value,
            'onUpdate:modelValue': (value: boolean) => { snapGrid.value = value; },
          }),
        ]),
      ]),
    ]);
  },
});

export const JSlideConfirm = defineComponent({
  name: 'JSlideConfirm',
  props: {
    id: String,
    label: { type: String, default: 'Slide to deploy production' },
    confirmedLabel: { type: String, default: 'Production deployed' },
    confirmed: { type: Boolean, default: undefined },
  },
  emits: ['update:confirmed'],
  setup(props, { emit }) {
    const { playSound } = useJuice();
    const confirmed = useModel(() => props.confirmed, false, value => emit('update:confirmed', value));
    const track = ref<HTMLDivElement | null>(null);
    const dragged = ref(0);
    const pointer = ref<number>();
    const progress = computed(() => confirmed.value ? 1 : dragged.value);
    let startX = 0;

    function finishDrag() {
      pointer.value = undefined;
      dragged.value = 0;
    }

    function confirm() {
      finishDrag();
      if (confirmed.value) return;
      confirmed.value = true;
      playSound('landed');
    }

    function reset() {
      finishDrag();
      if (!confirmed.value) return;
      confirmed.value = false;
      playSound('tap');
    }

    function cancel(event: PointerEvent) {
      if (pointer.value !== event.pointerId) return;
      finishDrag();
      playSound('drop');
    }

    useJuiceAgentNode(() => props.id, 'SlideConfirm', () => ({
      confirmed: confirmed.value, progress: progress.value,
    }), { confirm, reset });

    return () => h('div', { id: props.id, class: 'j-slab j-slide-wrap' }, [
      h('div', { ref: track, class: 'j-slide-track', 'data-confirmed': String(confirmed.value) }, [
        h('div', { class: 'j-slide-progress', style: { width: `${Math.max(15, progress.value * 100)}%` } }),
        h('div', { class: 'j-slide-label', 'aria-live': 'polite' }, confirmed.value ? props.confirmedLabel : props.label),
        h('button', {
          type: 'button',
          class: 'j-slide-thumb',
          'aria-label': confirmed.value ? 'Reset confirmation' : props.label,
          'data-dragging': pointer.value === undefined ? undefined : 'true',
          style: {
            position: 'absolute',
            left: `calc(4px + ${progress.value * 100}% - ${progress.value * 50}px)`,
            transitionProperty: 'left, background-color',
          },
          onClick(event: MouseEvent) {
            // Keyboard and assistive technology activate the button without a pointer.
            if (event.detail === 0) {
              if (confirmed.value) reset();
              else confirm();
            }
          },
          onKeydown(event: KeyboardEvent) {
            if (confirmed.value && (event.key === 'Escape' || event.key === 'ArrowLeft')) reset();
            else if (!confirmed.value && event.key === 'ArrowRight') confirm();
            else return;
            event.preventDefault();
          },
          onPointerdown(event: PointerEvent) {
            if (event.button !== 0 || confirmed.value || pointer.value !== undefined) return;
            (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
            startX = event.clientX;
            pointer.value = event.pointerId;
            playSound('lift');
          },
          onPointermove(event: PointerEvent) {
            if (pointer.value !== event.pointerId || !track.value) return;
            const travel = Math.max(1, track.value.clientWidth - 50);
            dragged.value = Math.max(0, Math.min(1, (event.clientX - startX) / travel));
          },
          onPointerup(event: PointerEvent) {
            if (pointer.value === event.pointerId) {
              if (dragged.value >= 0.85) confirm();
              else cancel(event);
            } else if (event.button === 0 && confirmed.value) {
              reset();
            }
          },
          onPointercancel: cancel,
          onLostpointercapture: cancel,
        }, confirmed.value ? '✓' : '→'),
      ]),
    ]);
  },
});

const islandModes: Array<{ value: IslandMode; label: string }> = [
  { value: 'compact', label: 'Compact' },
  { value: 'active', label: 'Active' },
  { value: 'expanded', label: 'Expanded' },
];
const islandLabels: Record<IslandMode, string> = {
  compact: 'Agent Ready', active: 'Voice Review', expanded: 'Live Design Walkthrough',
};

export const JDynamicIsland = defineComponent({
  name: 'JDynamicIsland',
  props: { id: String, mode: String as PropType<IslandMode> },
  emits: ['update:mode'],
  setup(props, { emit }) {
    const { playSound } = useJuice();
    const mode = useModel<IslandMode>(() => props.mode, 'active', value => emit('update:mode', value));

    function setMode(value: string) {
      const next = islandModes.find(option => option.value === value)?.value;
      if (next === undefined || next === mode.value) return;
      mode.value = next;
      playSound(next === 'expanded' ? 'pop' : 'tap');
    }

    useJuiceAgentNode(() => props.id, 'DynamicIsland', () => ({ mode: mode.value }), { setMode });

    return () => h('div', { id: props.id, class: 'j-island-stage', 'data-mode': mode.value }, [
      h('div', { class: 'j-island', 'data-mode': mode.value }, [
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } }, [
          h('span', islandLabels[mode.value]),
          mode.value !== 'compact' && h('span', { class: 'j-wave-bars', 'aria-hidden': 'true' },
            [7, 13, 9, 15, 11, 6].map((height, key) => h('span', {
              key, class: 'j-wave-bar', style: { height: `${height}px`, animationDelay: `${key * 110}ms` },
            })),
          ),
        ]),
        mode.value === 'expanded' && button('Minimize', 'j-chip', () => setMode('compact'), {
          style: { marginTop: '10px' },
        }),
      ]),
      h(JSegmentedControl, {
        options: islandModes, modelValue: mode.value,
        'onUpdate:modelValue': (value: string) => {
          const next = islandModes.find(option => option.value === value);
          if (next) mode.value = next.value;
        },
        'aria-label': 'Island mode',
      }),
    ]);
  },
});

export const JMorphCard = defineComponent({
  name: 'JMorphCard',
  props: {
    id: String,
    opened: { type: Boolean, default: undefined },
    limit: Number,
  },
  emits: ['update:opened', 'update:limit'],
  setup(props, { emit }) {
    const { playSound } = useJuice();
    const opened = useModel(() => props.opened, false, value => emit('update:opened', value));
    const limit = useModel(() => props.limit, 2500, value => emit('update:limit', value));

    function setOpened(value: boolean) {
      if (opened.value === value) return;
      opened.value = value;
      playSound(value ? 'pop' : 'tap');
    }

    function setLimit(value: unknown) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value === limit.value) return;
      limit.value = value;
      playSound('tick');
    }

    const toggle = () => setOpened(!opened.value);
    useJuiceAgentNode(() => props.id, 'MorphCard', () => ({
      opened: opened.value, limit: limit.value,
    }), { open: () => setOpened(true), close: () => setOpened(false), toggle, setLimit });

    return () => h('div', { id: props.id, class: 'j-slab j-morph-card', 'data-opened': String(opened.value) }, [
      h('button', { type: 'button', class: 'j-morph-summary', 'aria-expanded': opened.value, onClick: toggle }, [
        h('span', 'Spend Cap · Edge Workers'),
        h(JBadge, { tone: 'signal' }, () => h(JRollingNumber, { value: limit.value, prefix: '$' })),
      ]),
      opened.value && h('div', { class: 'j-morph-detail' }, [
        h('span', 'Monthly limit'),
        h('div', { style: { display: 'flex', gap: '6px' } }, [1000, 2500, 5000].map(preset =>
          button(`$${preset}`, 'j-chip', () => setLimit(preset), { key: preset, 'aria-pressed': limit.value === preset }),
        )),
        button('Done', 'j-chip', () => setOpened(false)),
      ]),
    ]);
  },
});

type Toast = { id: number; title: string; detail?: string };
const initialToasts: Toast[] = [
  { id: 1, title: 'Theme tokens synced', detail: '6 color-mix steps active' },
  { id: 2, title: 'Voice synthesis cached', detail: '12 procedural cues ready' },
  { id: 3, title: 'Branch archived', detail: 'feat/concentric-slab' },
];

export const JToastStack = defineComponent({
  name: 'JToastStack',
  props: { id: String },
  setup(props) {
    const { playSound } = useJuice();
    const toasts = shallowRef(initialToasts);
    const expanded = ref(false);
    let nextId = initialToasts.length + 1;

    function pushToast(payload?: string | { title?: string; detail?: string }) {
      const id = nextId++;
      const toast = typeof payload === 'string' ? { title: payload } : payload;
      toasts.value = [...toasts.value.slice(-2), {
        id, title: toast?.title ?? `Snapshot #${id} exported`, detail: toast?.detail,
      }];
      playSound('pop');
    }

    function undoTop() {
      if (!toasts.value.length) return;
      toasts.value = toasts.value.slice(0, -1);
      playSound('tap');
    }

    function setExpanded(value: unknown) {
      if (typeof value === 'boolean') expanded.value = value;
    }

    useJuiceAgentNode(() => props.id, 'ToastStack', () => ({
      count: toasts.value.length, expanded: expanded.value,
    }), { pushToast, undoTop, setExpanded });

    return () => h('div', { id: props.id, class: 'j-toast-stage', 'data-expanded': String(expanded.value) }, [
      h('div', {
        class: 'j-toast-stack', 'aria-live': 'polite',
        onPointerenter: () => setExpanded(true), onPointerleave: () => setExpanded(false),
      }, toasts.value.map((toast, index) => {
        const depth = toasts.value.length - 1 - index;
        return h('div', {
          key: toast.id, class: 'j-toast-item',
          'aria-hidden': depth > 0 && !expanded.value ? 'true' : undefined,
          style: {
            zIndex: index + 1,
            transform: `translateY(${depth * (expanded.value ? -46 : -10)}px) scale(${expanded.value ? 1 : 1 - depth * 0.045})`,
            opacity: 1 - depth * 0.18,
          },
        }, [
          h('div', [
            h('div', { style: { fontSize: '13px', fontWeight: '600' } }, toast.title),
            toast.detail && h('div', { class: 'j-ai-sub' }, toast.detail),
          ]),
          depth === 0 && button('Undo', 'j-chip', undoTop),
        ]);
      })),
      h('div', { style: { display: 'flex', justifyContent: 'space-between' } }, [
        button('Trigger Event Toast', 'j-chip', () => pushToast()),
        button(expanded.value ? 'Collapse Stack' : 'Expand Stack', 'j-chip', () => setExpanded(!expanded.value), {
          'aria-expanded': expanded.value,
        }),
      ]),
    ]);
  },
});

const composerModels = ['Claude 4.6', 'Gemini 4', 'Codex'];

export const JComposer = defineComponent({
  name: 'JComposer',
  props: { id: String, modelValue: String, model: String },
  emits: {
    'update:modelValue': (_value: string) => true,
    'update:model': (_value: string) => true,
    send: (_prompt: string) => true,
  },
  setup(props, { emit }) {
    const { playSound } = useJuice();
    const text = useModel(() => props.modelValue, '', value => emit('update:modelValue', value));
    const model = useModel(() => props.model, composerModels[0]!, value => emit('update:model', value));
    const sentCount = ref(0);

    function type(value: unknown) {
      if (typeof value === 'string') text.value = value;
    }

    function cycleModel() {
      const nextIndex = (composerModels.indexOf(model.value) + 1) % composerModels.length;
      model.value = composerModels[nextIndex]!;
      playSound('tap');
    }

    function submit() {
      if (!text.value.trim()) return;
      sentCount.value++;
      playSound('pop');
      emit('send', text.value);
    }

    useJuiceAgentNode(() => props.id, 'Composer', () => ({
      text: text.value, model: model.value, sentCount: sentCount.value,
    }), { type, cycleModel, submit });

    return () => h('div', { id: props.id, class: 'j-slab j-composer' }, [
      h('textarea', {
        class: 'j-composer-textarea',
        'aria-label': 'Agent prompt',
        placeholder: 'Ask an agent…',
        value: text.value,
        onInput(event: InputEvent) {
          if (!event.isComposing) type((event.target as HTMLTextAreaElement).value);
        },
        onKeydown(event: KeyboardEvent) {
          if (event.key === 'Enter' && !event.isComposing && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            submit();
          }
        },
      }),
      h('div', { class: 'j-composer-footer' }, [
        h('div', { class: 'j-composer-chips' }, [
          button(model.value, 'j-chip', cycleModel, { 'aria-label': `Change model, currently ${model.value}` }),
          sentCount.value > 0 && h(JBadge, { tone: 'ok', role: 'status' }, () => `Sent · ${sentCount.value}`),
        ]),
        button('↑', 'j-send-circle', submit, { 'aria-label': 'Send prompt', disabled: !text.value.trim() }),
      ]),
    ]);
  },
});

const thinkingLabels = ['Analyzing layout hierarchy…', 'Applying layout tokens…', 'Two steps completed'];
const thinkingSteps = ['Inspect token contrast ramp', 'Write concentric row styles'];

export const JThinkingMorph = defineComponent({
  name: 'JThinkingMorph',
  props: { id: String, step: Number },
  emits: ['update:step'],
  setup(props, { emit }) {
    const { playSound } = useJuice();
    const step = useModel(() => props.step, 2, value => emit('update:step', value));
    const expanded = ref(true);

    function setStep(value: unknown) {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value >= thinkingLabels.length) return;
      step.value = value;
      playSound(value === 2 ? 'paid' : 'tap');
    }

    const nextStep = () => setStep((step.value + 1) % thinkingLabels.length);
    useJuiceAgentNode(() => props.id, 'ThinkingMorph', () => ({
      step: step.value, expanded: expanded.value,
    }), { nextStep, setStep });

    return () => h('div', { id: props.id, class: 'j-slab j-thinking-card', 'data-step': step.value }, [
      h('button', {
        type: 'button',
        class: 'j-thinking-header',
        'aria-expanded': expanded.value,
        onClick: () => { expanded.value = !expanded.value; playSound('tap'); },
      }, [
        h('span', { class: step.value < 2 ? 'j-text-shimmer' : undefined }, thinkingLabels[step.value]),
        h('span', { 'aria-hidden': 'true' }, expanded.value ? '⌄' : '›'),
      ]),
      expanded.value && h('div', { class: 'j-thinking-steps' }, thinkingSteps.map((label, index) =>
        h('div', {
          key: label, class: 'j-thinking-step',
          'data-status': index < step.value ? 'done' : index === step.value ? 'running' : 'waiting',
        }, label),
      )),
      step.value === 2
        ? h('div', { class: 'j-artifact-pill' }, [
          h('code', 'juice-tokens.css'), button('Replay', 'j-chip', nextStep),
        ])
        : button('Advance step', 'j-chip', nextStep),
    ]);
  },
});

function aiHeader(title: string, aside: VNodeChild) {
  return h('header', { class: 'j-ai-header' }, [h('span', { class: 'j-ai-title' }, title), aside]);
}

type ApprovalStatus = 'pending' | 'approved' | 'denied';
const approvalLabels: Record<ApprovalStatus, [string, BadgeTone]> = {
  pending: ['Pending', 'warn'], approved: ['Approved', 'ok'], denied: ['Denied', 'danger'],
};

export const JToolApprovalGate = defineComponent({
  name: 'JToolApprovalGate',
  props: {
    id: String,
    status: String as PropType<ApprovalStatus>,
    tool: { type: String, default: 'db.migrate' },
    command: { type: String, default: 'ALTER TABLE users ADD COLUMN time_zone TEXT;' },
  },
  emits: ['update:status'],
  setup(props, { emit }) {
    const { playSound } = useJuice();
    const status = useModel<ApprovalStatus>(() => props.status, 'pending', value => emit('update:status', value));

    function resolve(next: ApprovalStatus, sound: JuiceSoundName) {
      if (status.value !== 'pending') return;
      status.value = next;
      playSound(sound);
    }

    const approve = () => resolve('approved', 'paid');
    const deny = () => resolve('denied', 'deny');
    const reset = () => { status.value = 'pending'; playSound('tap'); };

    useJuiceAgentNode(() => props.id, 'ToolApprovalGate', () => ({
      status: status.value, tool: props.tool, command: props.command,
    }), { approve, deny, reset });

    return () => {
      const [label, tone] = approvalLabels[status.value];
      return h('div', { id: props.id, class: 'j-slab j-ai-card', 'data-state': status.value }, [
        aiHeader('Tool approval', h(JBadge, { tone, role: 'status' }, () => label)),
        h('div', { class: 'j-ai-surface' }, [
          h('span', props.tool),
          h('code', { class: 'j-ai-mono-box' }, props.command),
          h('div', { style: { display: 'flex', gap: '6px' } }, status.value === 'pending'
            ? [
              button('Approve', 'j-ai-pill-btn', approve, { 'data-primary': 'true' }),
              button('Deny', 'j-ai-pill-btn', deny, { 'data-tone': 'danger' }),
            ]
            : [button('Reset', 'j-ai-pill-btn', reset)],
          ),
        ]),
      ]);
    };
  },
});

const citations = [
  { id: 1, source: 'bencho.dev/tokens', excerpt: 'Concentric radii keep nested surfaces visually aligned.' },
  { id: 2, source: 'ui-sdk.dev/behaviors', excerpt: 'Shared actions coordinate keyboard, pointer and agent inputs.' },
  { id: 3, source: 'aisdkagents.com/patterns', excerpt: 'Inline citations keep the source close to the answer.' },
];

export const JGroundedAnswer = defineComponent({
  name: 'JGroundedAnswer',
  props: { id: String, activeCitation: Number },
  emits: ['update:activeCitation'],
  setup(props, { emit }) {
    const { playSound } = useJuice();
    const activeCitation = useModel(() => props.activeCitation, 1, value => emit('update:activeCitation', value));

    function selectCitation(value: unknown) {
      if (!citations.some(citation => citation.id === value) || typeof value !== 'number') return;
      if (value === activeCitation.value) return;
      activeCitation.value = value;
      playSound('tick');
    }

    useJuiceAgentNode(() => props.id, 'GroundedAnswer', () => ({
      activeCitation: activeCitation.value,
    }), { selectCitation });

    function citationPill(id: number) {
      const active = activeCitation.value === id;
      return button(`[${id}]`, 'j-cite-pill', () => selectCitation(id), {
        'data-active': active ? 'true' : undefined,
        'aria-label': `Show citation ${id}`, 'aria-pressed': active,
      });
    }

    return () => {
      const source = citations.find(citation => citation.id === activeCitation.value);
      return h('div', { id: props.id, class: 'j-slab j-ai-card', 'data-citation': activeCitation.value }, [
        aiHeader('Grounded answer', h(JBadge, null, () => '3 sources')),
        h('div', { class: 'j-ai-surface' }, [
          h('span', [
            'Use concentric surfaces', citationPill(1),
            ', share interaction actions', citationPill(2),
            ', and keep sources in context', citationPill(3), '.',
          ]),
        ]),
        source && h('div', { class: 'j-ai-mono-box', 'aria-live': 'polite' }, [
          h('strong', source.source), h('span', source.excerpt),
        ]),
      ]);
    };
  },
});

const budgetSegments = [
  { label: 'System', color: 'var(--fill-on)', full: 12, compact: 12 },
  { label: 'Files', color: 'var(--juice-signal)', full: 38, compact: 15 },
  { label: 'Chat', color: 'var(--juice-ok)', full: 28, compact: 11 },
  { label: 'Reasoning', color: 'var(--juice-warn)', full: 16, compact: 4 },
];
const tokenBudget = 128;

export const JContextBudgetMeter = defineComponent({
  name: 'JContextBudgetMeter',
  props: { id: String, compacted: { type: Boolean, default: undefined } },
  emits: ['update:compacted'],
  setup(props, { emit }) {
    const { playSound } = useJuice();
    const compacted = useModel(() => props.compacted, false, value => emit('update:compacted', value));
    const tokens = (segment: typeof budgetSegments[number]) => compacted.value ? segment.compact : segment.full;
    const total = computed(() => budgetSegments.reduce((sum, segment) => sum + tokens(segment), 0));

    function setCompacted(value: boolean) {
      if (compacted.value === value) return;
      compacted.value = value;
      playSound(value ? 'paid' : 'tap');
    }

    const compact = () => setCompacted(true);
    const restore = () => setCompacted(false);
    useJuiceAgentNode(() => props.id, 'ContextBudgetMeter', () => ({
      compacted: compacted.value, used: total.value, budget: tokenBudget,
    }), { compact, restore });

    return () => h('div', { id: props.id, class: 'j-slab j-ai-card', 'data-compacted': String(compacted.value) }, [
      aiHeader('Context budget', h(JRollingNumber, { value: total.value, suffix: `k / ${tokenBudget}k` })),
      h('div', { class: 'j-ai-surface' }, [
        h('div', {
          class: 'j-ai-stack-bar', role: 'meter', 'aria-label': 'Context budget',
          'aria-valuemin': 0, 'aria-valuemax': tokenBudget, 'aria-valuenow': total.value,
          'aria-valuetext': `${total.value} thousand of ${tokenBudget} thousand tokens`,
        }, budgetSegments.map(segment => h('span', {
          key: segment.label, class: 'j-ai-stack-seg',
          style: { width: `${100 * tokens(segment) / tokenBudget}%`, background: segment.color },
        }))),
        ...budgetSegments.map(segment => h('div', { key: segment.label, class: 'j-ai-row' }, [
          h('span', segment.label), h('span', `${tokens(segment)}k`),
        ])),
        compacted.value
          ? button('Restore', 'j-ai-pill-btn', restore)
          : button('Compact context', 'j-ai-pill-btn', compact, { 'data-primary': 'true' }),
      ]),
    ]);
  },
});

const workers = [
  { name: 'Carbon', task: 'UI review', progress: 72 },
  { name: 'Sol-1', task: 'Vue adapter', progress: 54 },
  { name: 'Sol-2', task: 'Agent components', progress: 38 },
];

export const JSubagentSwarmBoard = defineComponent({
  name: 'JSubagentSwarmBoard',
  props: { id: String, allDone: { type: Boolean, default: undefined } },
  emits: ['update:allDone'],
  setup(props, { emit }) {
    const { playSound } = useJuice();
    const allDone = useModel(() => props.allDone, false, value => emit('update:allDone', value));
    const selected = ref<string>();

    function setAllDone(value: boolean) {
      if (allDone.value === value) return;
      allDone.value = value;
      playSound(value ? 'landed' : 'tap');
    }

    const completeAll = () => setAllDone(true);
    const resetSwarm = () => { selected.value = undefined; setAllDone(false); };

    useJuiceAgentNode(() => props.id, 'SubagentSwarmBoard', () => ({
      allDone: allDone.value,
      workers: workers.map(worker => ({ name: worker.name, progress: allDone.value ? 100 : worker.progress })),
    }), { completeAll, resetSwarm });

    return () => h('div', {
      id: props.id, class: 'j-slab j-ai-card', 'data-state': allDone.value ? 'done' : 'working',
    }, [
      aiHeader('Subagent swarm', h(JBadge, { tone: allDone.value ? 'ok' : 'neutral', role: 'status' },
        () => allDone.value ? '3 completed' : '3 in progress',
      )),
      h('div', { class: 'j-ai-surface' }, [
        ...workers.map(worker => button(
          `${worker.name} · ${worker.task} · ${allDone.value ? 100 : worker.progress}%`,
          'j-ai-row', () => {
            selected.value = selected.value === worker.name ? undefined : worker.name;
            playSound('tap');
          }, {
            key: worker.name, 'aria-pressed': selected.value === worker.name,
          },
        )),
        selected.value && h('div', { class: 'j-ai-mono-box', 'aria-live': 'polite' },
          `${selected.value} · ${allDone.value ? 'Task complete' : 'Working'}`,
        ),
        allDone.value
          ? button('Reset swarm', 'j-ai-pill-btn', resetSwarm)
          : button('Complete all', 'j-ai-pill-btn', completeAll, { 'data-primary': 'true' }),
      ]),
    ]);
  },
});
