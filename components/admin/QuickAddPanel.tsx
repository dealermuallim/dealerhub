'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  parseQuickAdd,
  type DraftField,
  type QuickAddFieldKey,
  type QuickAddFormSnapshot,
  type VoiceDraftPatch,
} from '@/lib/quick-add';

export type QuickAddFormValues = {
  vin: string;
  stockNumber: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  mileage: string;
  exteriorColor: string;
  interiorColor: string;
  transmission: string;
  engine: string;
  fuelType: string;
  bodyStyle: string;
  driveType: string;
  askingPrice: string;
  cashPrice: string;
  financingPrice: string;
  description: string;
  featured: boolean;
  vehicleStatus: string;
  public: boolean;
};

type Props = {
  form: QuickAddFormValues;
  decodedSnapshot: QuickAddFormSnapshot;
  /** True only after a successful VIN decode for the current VIN. */
  decodeSucceeded: boolean;
  disabled?: boolean;
  draftResetKey?: number;
  onApply: (patch: Partial<QuickAddFormValues>) => void;
};

const LABELS: Partial<Record<QuickAddFieldKey, string>> = {
  mileage: 'Mileage',
  exteriorColor: 'Exterior color',
  interiorColor: 'Interior color',
  stockNumber: 'Stock number',
  askingPrice: 'Asking price',
  cashPrice: 'Cash price',
  financingPrice: 'Financing price',
  featured: 'Featured',
  vehicleStatus: 'Status',
  public: 'Show on website',
  trim: 'Trim',
  year: 'Year',
  make: 'Make',
  model: 'Model',
  engine: 'Engine',
  transmission: 'Transmission',
  fuelType: 'Fuel type',
  bodyStyle: 'Body style',
  driveType: 'Drivetrain',
  description: 'Description',
  vin: 'VIN',
};

const EXAMPLE =
  "82k miles, black on black, stock 9214, $14995, featured, pending, don't put it online";

type Choice = 'keep' | 'yours';

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

function toFormValue(
  key: QuickAddFieldKey,
  proposed: unknown
): string | boolean | undefined {
  if (key === 'featured' || key === 'public') {
    return Boolean(proposed);
  }
  if (proposed === null || proposed === undefined) return '';
  return String(proposed);
}

function snapshotFromForm(form: QuickAddFormValues): QuickAddFormSnapshot {
  return {
    vin: form.vin,
    stockNumber: form.stockNumber,
    year: form.year,
    make: form.make,
    model: form.model,
    trim: form.trim,
    mileage: form.mileage === '' ? null : Number(form.mileage),
    exteriorColor: form.exteriorColor,
    interiorColor: form.interiorColor,
    transmission: form.transmission,
    engine: form.engine,
    fuelType: form.fuelType,
    bodyStyle: form.bodyStyle,
    driveType: form.driveType,
    askingPrice: form.askingPrice === '' ? null : Number(form.askingPrice),
    cashPrice: form.cashPrice === '' ? null : Number(form.cashPrice),
    financingPrice:
      form.financingPrice === '' ? null : Number(form.financingPrice),
    description: form.description,
    featured: form.featured,
    vehicleStatus: form.vehicleStatus,
    public: form.public,
  };
}

function groupFor(state: DraftField['state']): 'new' | 'match' | 'decide' {
  if (state === 'CONFLICT') return 'decide';
  if (state === 'CONFIRMED') return 'match';
  return 'new';
}

export default function QuickAddPanel({
  form,
  decodedSnapshot,
  decodeSucceeded,
  disabled,
  draftResetKey = 0,
  onApply,
}: Props) {
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<VoiceDraftPatch | null>(null);
  const [choices, setChoices] = useState<
    Partial<Record<QuickAddFieldKey, Choice>>
  >({});
  const [localError, setLocalError] = useState('');
  useEffect(() => {
    setDraft(null);
    setChoices({});
    setLocalError('');
    setText('');
  }, [draftResetKey]);

  const unresolvedConflicts = useMemo(() => {
    if (!draft) return [] as DraftField[];
    return draft.fields.filter(
      (f) => f.state === 'CONFLICT' && !choices[f.key]
    );
  }, [draft, choices]);

  const grouped = useMemo(() => {
    const newInfo: DraftField[] = [];
    const matches: DraftField[] = [];
    const decide: DraftField[] = [];
    if (!draft) return { newInfo, matches, decide };
    for (const f of draft.fields) {
      const g = groupFor(f.state);
      if (g === 'new') newInfo.push(f);
      else if (g === 'match') matches.push(f);
      else decide.push(f);
    }
    return { newInfo, matches, decide };
  }, [draft]);

  const analyzeEnabled = decodeSucceeded && !disabled;

  function analyze() {
    setLocalError('');
    if (!decodeSucceeded) {
      setLocalError('Decode a VIN successfully before Quick Add.');
      return;
    }
    if (!text.trim()) {
      setLocalError('Enter dealer shorthand to analyze.');
      return;
    }

    const result = parseQuickAdd({
      text,
      vin: form.vin,
      decoded: decodedSnapshot,
      current: snapshotFromForm(form),
    });
    setDraft(result);
    setChoices({});
  }

  function discard() {
    setDraft(null);
    setChoices({});
    setLocalError('');
  }

  function apply() {
    if (!draft) return;
    if (unresolvedConflicts.length > 0) {
      setLocalError('Resolve all conflicts before applying.');
      return;
    }

    const patch: Partial<QuickAddFormValues> = {};
    for (const field of draft.fields) {
      if (field.state === 'CONFIRMED') continue;
      if (field.state === 'CONFLICT') {
        if (choices[field.key] === 'keep') continue;
        if (choices[field.key] === 'yours') {
          const v = toFormValue(field.key, field.proposed);
          if (v !== undefined) (patch as Record<string, unknown>)[field.key] = v;
        }
        continue;
      }
      const v = toFormValue(field.key, field.proposed);
      if (v !== undefined) (patch as Record<string, unknown>)[field.key] = v;
    }

    onApply(patch);
    setDraft(null);
    setChoices({});
    setLocalError('');
  }

  return (
    <div
      style={{
        marginTop: '22px',
        marginBottom: '8px',
        padding: '18px',
        borderRadius: '10px',
        border: '1px solid #cbd5e1',
        background: '#f8fafc',
      }}
    >
      <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
        Quick Add (text)
      </div>

      <div
        style={{
          marginBottom: 12,
          padding: '10px 12px',
          borderRadius: 8,
          background: '#fff7ed',
          border: '1px solid #fed7aa',
          color: '#9a3412',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Draft only — Analyze and Apply update this form in memory. Nothing is
        saved until you click Add Vehicle.
      </div>

      <p style={{ margin: '0 0 8px', color: '#334155', fontSize: 14 }}>
        After a successful VIN decode, describe what&apos;s missing or wrong.
        Quick Add understands:{' '}
        <strong>
          mileage, stock number, asking price, featured, status, show on
          website, exterior/interior colors
        </strong>
        , and high-confidence corrections (example:{' '}
        <code>EX-L not EX</code>).
      </p>

      <div
        style={{
          marginBottom: 8,
          padding: '8px 10px',
          borderRadius: 8,
          background: '#eef2ff',
          border: '1px solid #c7d2fe',
          color: '#312e81',
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Example</div>
        <div style={{ fontFamily: 'ui-monospace, monospace' }}>{EXAMPLE}</div>
      </div>

      <textarea
        rows={3}
        value={text}
        disabled={disabled || !decodeSucceeded}
        placeholder="Type dealer shorthand here…"
        onChange={(e) => setText(e.target.value)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '10px',
          borderRadius: 8,
          border: '1px solid #cbd5e1',
          fontFamily: 'inherit',
          resize: 'vertical',
          background: decodeSucceeded ? '#fff' : '#f1f5f9',
        }}
      />

      {!decodeSucceeded ? (
        <p style={{ color: '#64748b', marginTop: 8, fontSize: 13 }}>
          Decode a VIN successfully to enable Quick Add.
        </p>
      ) : null}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
        <button
          type="button"
          disabled={!analyzeEnabled}
          onClick={analyze}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: 0,
            background: analyzeEnabled ? '#0f172a' : '#94a3b8',
            color: '#fff',
            fontWeight: 700,
            cursor: analyzeEnabled ? 'pointer' : 'not-allowed',
          }}
        >
          Analyze
        </button>
        {draft ? (
          <>
            <button
              type="button"
              disabled={disabled || unresolvedConflicts.length > 0}
              onClick={apply}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: 0,
                background:
                  unresolvedConflicts.length > 0 ? '#94a3b8' : '#16a34a',
                color: '#fff',
                fontWeight: 700,
                cursor:
                  disabled || unresolvedConflicts.length > 0
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              Apply to Form
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={discard}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontWeight: 600,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              Discard
            </button>
          </>
        ) : null}
      </div>

      {localError ? (
        <p style={{ color: '#b91c1c', marginTop: 10 }}>{localError}</p>
      ) : null}

      {draft ? (
        <div style={{ marginTop: 16 }}>
          {draft.fields.length === 0 && draft.unresolved.length === 0 ? (
            <p style={{ color: '#64748b' }}>No proposals found.</p>
          ) : null}

          <ReviewSection title="New information" fields={grouped.newInfo} />
          <ReviewSection title="Matches" fields={grouped.matches} />
          <ReviewSection
            title="Needs your decision"
            fields={grouped.decide}
            choices={choices}
            onChoose={(key, c) =>
              setChoices((prev) => ({ ...prev, [key]: c }))
            }
            conflict
          />

          {draft.unresolved.length > 0 ? (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 8,
                background: '#fff7ed',
                border: '1px solid #fed7aa',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                Couldn&apos;t use these phrases
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#9a3412' }}>
                {draft.unresolved.map((u, i) => (
                  <li key={`${u.span}-${i}`}>
                    “{u.span}” — {u.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {unresolvedConflicts.length > 0 ? (
            <p style={{ color: '#b45309', marginTop: 10, fontWeight: 600 }}>
              Resolve {unresolvedConflicts.length} conflict
              {unresolvedConflicts.length === 1 ? '' : 's'} before applying.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ReviewSection({
  title,
  fields,
  choices,
  onChoose,
  conflict,
}: {
  title: string;
  fields: DraftField[];
  choices?: Partial<Record<QuickAddFieldKey, Choice>>;
  onChoose?: (key: QuickAddFieldKey, c: Choice) => void;
  conflict?: boolean;
}) {
  if (fields.length === 0) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          fontWeight: 800,
          fontSize: 13,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: '#475569',
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {fields.map((field) => (
        <FieldReview
          key={field.key}
          field={field}
          choice={choices?.[field.key]}
          onChoose={onChoose ? (c) => onChoose(field.key, c) : undefined}
          showConflict={!!conflict}
        />
      ))}
    </div>
  );
}

function FieldReview({
  field,
  choice,
  onChoose,
  showConflict,
}: {
  field: DraftField;
  choice?: Choice;
  onChoose?: (c: Choice) => void;
  showConflict: boolean;
}) {
  const label = LABELS[field.key] || field.key;
  const isConflict = showConflict && field.state === 'CONFLICT';

  return (
    <div
      style={{
        padding: '12px 0',
        borderBottom: '1px solid #e2e8f0',
      }}
    >
      <div style={{ fontWeight: 700 }}>{label}</div>

      {isConflict ? (
        <div style={{ marginTop: 8, fontSize: 14, color: '#334155' }}>
          <div>From VIN Decode: {formatValue(field.decoded)}</div>
          <div>On Form Now: {formatValue(field.current)}</div>
          <div>Quick Add Proposes: {formatValue(field.proposed)}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onChoose?.('keep')}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border:
                  choice === 'keep' ? '2px solid #0f172a' : '1px solid #cbd5e1',
                background: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Keep Current
            </button>
            <button
              type="button"
              onClick={() => onChoose?.('yours')}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border:
                  choice === 'yours' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                background: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Use Quick Add
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 4, fontSize: 14 }}>
          {formatValue(field.proposed)}
          {field.evidence ? (
            <span style={{ color: '#94a3b8' }}> — “{field.evidence}”</span>
          ) : null}
        </div>
      )}
    </div>
  );
}