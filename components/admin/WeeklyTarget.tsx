"use client";
import { useEffect, useState } from "react";

export default function WeeklyTarget({
  sold,
  dealerKey,
}: {
  sold: number;
  dealerKey: string;
}) {
  const [target, setTarget] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(false);
  const [feedback, setFeedback] = useState("");
  const storageKey = `dealerhub:weekly-target:${dealerKey}`;
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      if (Number.isInteger(saved) && saved > 0 && saved <= 10000) {
        setTarget(saved);
        setDraft(String(saved));
      }
    } catch {
      /* Optional when browser storage is unavailable. */
    }
    setReady(true);
  }, [storageKey]);
  const percent = target ? Math.min(100, Math.round((sold / target) * 100)) : 0;
  return (
    <section className="adm-card dh-target">
      <div className="dh-section-head">
        <h2>Your weekly goal</h2>
        {target && (
          <button
            className="dh-text-button"
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Cancel" : "Change goal"}
          </button>
        )}
      </div>
      {editing && (
        <button
          className="dh-text-button"
          onClick={() => {
            try {
              localStorage.removeItem(storageKey);
              setTarget(null);
              setDraft("");
              setEditing(false);
              setFeedback("Weekly goal cleared.");
            } catch {
              setFeedback(
                "Could not clear the saved goal. Browser storage is unavailable.",
              );
            }
          }}
        >
          Clear goal
        </button>
      )}
      <div className="dh-target-value">
        <strong>{sold}</strong>
        <span>
          {target ? `of ${target} vehicles sold` : "vehicles sold this week"}
        </span>
      </div>
      {target ? (
        <>
          <progress
            max={target}
            value={Math.min(sold, target)}
            aria-label="Weekly sales goal"
          />
          <p className="dh-positive">
            {sold >= target
              ? "Goal reached. Keep the momentum going!"
              : `${target - sold} more to reach your goal · ${percent}% complete`}
          </p>
        </>
      ) : (
        <p className="adm-muted">Set a goal that fits your dealership.</p>
      )}
      {ready && (!target || editing) && (
        <form
          className="dh-target-form"
          onSubmit={(event) => {
            event.preventDefault();
            const value = Number(draft);
            if (!Number.isInteger(value) || value < 1 || value > 10000) return;
            setTarget(value);
            setEditing(false);
            try {
              localStorage.setItem(storageKey, String(value));
              setFeedback("Weekly goal saved.");
            } catch {
              setFeedback(
                "Goal set for this visit. Browser storage is unavailable.",
              );
            }
          }}
        >
          <label>
            Vehicles per week
            <input
              type="number"
              min="1"
              max="10000"
              step="1"
              required
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <button className="adm-btn adm-btn-primary" type="submit">
            Save goal
          </button>
        </form>
      )}
      <p className="dh-fine">
        Monday–Sunday · Goal saved for this dealership in this browser.
      </p>
      <p role="status" className="dh-fine">
        {feedback}
      </p>
    </section>
  );
}
