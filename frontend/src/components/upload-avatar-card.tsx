"use client";

import {
  AVATAR_BG_PRESETS,
  AVATAR_RADIUS_CHOICES,
  AVATAR_ROTATES,
  AVATAR_SCALE_CHOICES,
  AVATAR_STYLES,
  formatStyleLabel,
  getDiceBearUrl,
  randomAvatarSeed,
  type AvatarRotate,
  type AvatarStyle,
} from "@/lib/avatar";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronDown, Shuffle } from "lucide-react";
import { motion } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AvatarCustomize = {
  style: AvatarStyle;
  seed: string;
  backgroundColor: string | null;
  flip: boolean;
  rotate: AvatarRotate;
  radius: number;
  scale: number;
};

type Patch = Partial<AvatarCustomize>;

type CardProps = {
  value: AvatarCustomize;
  onChange: (next: AvatarCustomize) => void;
};

const SEED_NAME_POOL: readonly string[] = [
  "Adrian", "Aidan", "Aiden", "Alex", "Amelia", "Aria",
  "Asher", "Aurora", "Avery", "Brian", "Caleb", "Charlotte",
  "Christian", "Destiny", "Easton", "Eliza", "Emma", "Felix",
  "George", "Hazel", "Isla", "Ivy", "Jack", "Jade",
  "Jocelyn", "Jude", "Kai", "Leah", "Leo", "Liam",
  "Luis", "Luna", "Mason", "Maya", "Mia", "Nolan",
  "Oliver", "Piper", "Quinn", "Riley", "Ryan", "Sawyer",
  "Sofia", "Theo", "Vivian", "Willa", "Wyatt", "Zoe",
];

// ─── Shared primitives (SRP) ─────────────────────────────────────────────────

function SectionShell({
  title,
  description,
  children,
  bodyClassName,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <Card className="border-[3px] border-border shadow-[var(--shadow-md)] bg-card rounded-none flex flex-col h-full overflow-hidden transition-shadow duration-200">
      <CardHeader className="border-b-[3px] border-border bg-muted/40 py-3 space-y-0.5 shrink-0">
        <CardTitle className="font-heading text-sm tracking-wide">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-[11px] text-muted-foreground leading-relaxed">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className={cn("flex-1 min-h-0 p-4 flex flex-col", bodyClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-heading uppercase tracking-[0.14em] text-muted-foreground flex items-baseline gap-1.5">
        {label}
        {hint ? <span className="normal-case tracking-normal text-muted-foreground/70">· {hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

const CONTROL_CLS =
  "h-10 w-full border-[3px] border-border rounded-none bg-background shadow-none text-sm";

function Select<T extends string | number>({
  value,
  options,
  onChange,
  format = (v) => String(v),
  ariaLabel,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  format?: (v: T) => string;
  ariaLabel: string;
}) {
  const isNumeric = typeof options[0] === "number";
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(isNumeric ? (Number(raw) as unknown as T) : (raw as unknown as T));
        }}
        className={cn(
          CONTROL_CLS,
          "appearance-none pr-8 pl-2.5 text-sm font-medium cursor-pointer",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        )}
      >
        {options.map((opt) => (
          <option key={String(opt)} value={String(opt)}>
            {format(opt)}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
      />
    </div>
  );
}

/** On/Off segmented control — same footprint as a <Select>, clearer affordance. */
function SegmentedBoolean({
  value,
  onChange,
  ariaLabel,
  onLabel = "On",
  offLabel = "Off",
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
  onLabel?: string;
  offLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn(CONTROL_CLS, "flex items-stretch p-0 overflow-hidden")}>
      {[false, true].map((isOn, i) => {
        const selected = value === isOn;
        return (
          <button
            key={String(isOn)}
            role="radio"
            type="button"
            aria-checked={selected}
            onClick={() => onChange(isOn)}
            className={cn(
              "flex-1 text-xs font-medium transition-colors",
              i > 0 && "border-l-[3px] border-border",
              selected ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
            )}
          >
            {isOn ? onLabel : offLabel}
          </button>
        );
      })}
    </div>
  );
}

function Swatch({
  color,
  label,
  selected,
  onSelect,
}: {
  color: string | null;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const isTransparent = color === "transparent";
  const isDefault = color === null;
  const bgStyle = !isTransparent && !isDefault ? { backgroundColor: `#${color}` } : undefined;

  return (
    <motion.button
      whileHover={{ scale: 1.1, zIndex: 10 }}
      whileTap={{ scale: 0.92 }}
      type="button"
      onClick={onSelect}
      title={label}
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        "relative h-8 w-8 shrink-0 border-[3px] border-border transition-colors rounded-none cursor-pointer",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        isDefault && "bg-gradient-to-br from-muted to-background",
      )}
      style={bgStyle}
    >
      {isTransparent && (
        <span
          aria-hidden
          className="absolute inset-0 bg-[length:10px_10px] bg-[conic-gradient(at_0%_0%,#fff_0_25%,#e5e5e5_0_50%,#fff_0_75%,#e5e5e5_0)]"
        />
      )}
      {isDefault && (
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-heading text-muted-foreground">
          AUTO
        </span>
      )}
    </motion.button>
  );
}

function PreviewHero({ value }: { value: AvatarCustomize }) {
  const url = getDiceBearUrl(value.seed || "preview", value.style, 280, {
    backgroundColor: value.backgroundColor,
    flip: value.flip,
    rotate: value.rotate,
    radius: value.radius,
    scale: value.scale,
  });

  return (
    <div className="flex-1 min-h-[140px] border-[3px] border-border bg-muted/30 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 p-3 flex items-center justify-center">
        <Image
          src={url}
          alt="Avatar preview"
          width={220}
          height={220}
          unoptimized
          priority
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <div className="border-t-[3px] border-border bg-background/80 px-3 py-1.5 flex items-center justify-between gap-2">
        <span className="font-heading text-[11px] tracking-wide truncate">{formatStyleLabel(value.style)}</span>
        <span className="font-mono text-[10px] text-muted-foreground truncate">{value.seed || "—"}</span>
      </div>
    </div>
  );
}

// ─── Controls Card (middle column) ───────────────────────────────────────────

export function AvatarControlsCard({ value, onChange }: CardProps) {
  const patch = (p: Patch) => onChange({ ...value, ...p });

  return (
    <SectionShell
      title="Customize"
      description="Every knob DiceBear exposes for a good-looking card."
      bodyClassName="gap-3"
    >
      <PreviewHero value={value} />

      <Field label="Avatar Style" hint={`${AVATAR_STYLES.length}+`}>
        <Select
          ariaLabel="Avatar style"
          value={value.style}
          options={AVATAR_STYLES}
          onChange={(style) => patch({ style })}
          format={(v) => formatStyleLabel(v as AvatarStyle)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="Rotate">
          <Select
            ariaLabel="Rotate"
            value={value.rotate}
            options={AVATAR_ROTATES}
            onChange={(rotate) => patch({ rotate: rotate as AvatarRotate })}
            format={(v) => `${v}°`}
          />
        </Field>
        <Field label="Scale">
          <Select
            ariaLabel="Scale"
            value={value.scale}
            options={AVATAR_SCALE_CHOICES}
            onChange={(scale) => patch({ scale: Number(scale) })}
            format={(v) => `${v}%`}
          />
        </Field>
        <Field label="Radius">
          <Select
            ariaLabel="Radius"
            value={value.radius}
            options={AVATAR_RADIUS_CHOICES}
            onChange={(radius) => patch({ radius: Number(radius) })}
          />
        </Field>
        <Field label="Flip">
          <SegmentedBoolean value={value.flip} onChange={(flip) => patch({ flip })} ariaLabel="Flip horizontally" />
        </Field>
      </div>

      <Field label="Background Color">
        <div className="flex flex-wrap items-center gap-1.5 border-[3px] border-border bg-background px-2 py-1.5">
          {AVATAR_BG_PRESETS.map((p) => (
            <Swatch
              key={p.label}
              color={p.value}
              label={p.label}
              selected={p.value === value.backgroundColor}
              onSelect={() => patch({ backgroundColor: p.value })}
            />
          ))}
        </div>
      </Field>

      <Field label="Custom Seed" hint="or pick from the gallery">
        <div className="flex gap-2">
          <Input
            value={value.seed}
            onChange={(e) => patch({ seed: e.target.value.slice(0, 120) })}
            placeholder="e.g. your name"
            className="border-[3px] border-border rounded-none bg-background shadow-none focus-visible:ring-2 focus-visible:ring-ring/40 font-mono text-[11px] h-10 flex-1 min-w-0 transition-all focus:shadow-[var(--shadow-2xs)]"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 border-[3px] border-border shadow-[var(--shadow-sm)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none"
            onClick={() => patch({ seed: randomAvatarSeed() })}
            title="Random seed"
            aria-label="Random seed"
          >
            <Shuffle className="w-4 h-4" />
          </Button>
        </div>
      </Field>
    </SectionShell>
  );
}

// ─── Gallery Card (right column, scrollable) ─────────────────────────────────

function pickRandomNames(pool: readonly string[], count: number): string[] {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

function GalleryTile({
  name,
  url,
  selected,
  onSelect,
}: {
  name: string;
  url: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Use ${name}`}
      className={cn(
        "group flex flex-col items-stretch gap-1 border-[3px] border-border bg-background p-1.5 text-left transition-all cursor-pointer shadow-none hover:shadow-[var(--shadow-xs)] rounded-none",
        "hover:bg-muted/40",
        selected && "bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-background shadow-[var(--shadow-xs)]",
      )}
    >
      <div className="aspect-square border-2 border-border bg-muted/40 flex items-center justify-center overflow-hidden transition-transform duration-300 rounded-none">
        <Image src={url} alt={name} width={140} height={140} unoptimized className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" />
      </div>
      <div className="flex items-center justify-between gap-1 px-0.5 pb-0.5">
        <span className="text-[10px] font-heading truncate uppercase tracking-wide">{name}</span>
        {selected ? <span className="text-[10px] font-bold text-primary shrink-0">✓</span> : null}
      </div>
    </motion.button>
  );
}

export function AvatarGalleryCard({ value, onChange }: CardProps) {
  const [names, setNames] = useState<string[]>(() => SEED_NAME_POOL.slice(0, 30));

  const renderOptions = useMemo(
    () => ({
      backgroundColor: value.backgroundColor,
      flip: value.flip,
      rotate: value.rotate,
      radius: value.radius,
      scale: value.scale,
    }),
    [value.backgroundColor, value.flip, value.rotate, value.radius, value.scale],
  );

  return (
    <SectionShell
      title="Avatars"
      description="Click one to pick it. Shuffle for a fresh set of names."
      bodyClassName="gap-3"
    >
      <div className="flex items-center justify-between gap-2 shrink-0">
        <p className="text-[11px] text-muted-foreground min-w-0 truncate">
          <span className="font-heading text-foreground">{names.length}</span> seeds · {formatStyleLabel(value.style)}
        </p>
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={() => setNames(pickRandomNames(SEED_NAME_POOL, 30))}
          className="shrink-0 border-[3px] border-border shadow-[var(--shadow-sm)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all rounded-none font-heading text-xs tracking-wider"
        >
          <Shuffle className="w-4 h-4 mr-1.5" />
          Shuffle
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto -mr-2 pr-2">
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
          {names.map((name) => (
            <GalleryTile
              key={name}
              name={name}
              url={getDiceBearUrl(name, value.style, 140, renderOptions)}
              selected={value.seed === name}
              onSelect={() => onChange({ ...value, seed: name })}
            />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
