'use client';

import React from 'react';
import { STEP_ORDER, STEP_LABELS } from '../constants';
import type { Step } from '../types';

interface StepIndicatorProps {
  current: Step;
}

export function StepIndicator({ current }: StepIndicatorProps) {
  const stepsToShow: Step[] = ['plan', 'personal', 'billing', 'confirm'];
  const currentIdx = STEP_ORDER.indexOf(current);

  return (
    <div className="flex items-center gap-0 px-4 py-2 border-b border-slate-100">
      {stepsToShow.map((s, i) => {
        const stepIdx = STEP_ORDER.indexOf(s);
        const isDone = stepIdx < currentIdx;
        const isActive = s === current;
        return (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold transition-all ${
                  isDone
                    ? 'bg-gold text-petroleum'
                    : isActive
                      ? 'bg-petroleum text-gold border-2 border-gold/30'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span
                className={`text-[9px] font-semibold uppercase tracking-wide ${
                  isActive
                    ? 'text-petroleum'
                    : isDone
                      ? 'text-gold'
                      : 'text-slate-300'
                }`}
              >
                {STEP_LABELS[s]}
              </span>
            </div>
            {i < stepsToShow.length - 1 && (
              <div
                className={`flex-1 h-px mx-1 mb-3 transition-colors ${
                  stepIdx < currentIdx ? 'bg-gold' : 'bg-slate-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
