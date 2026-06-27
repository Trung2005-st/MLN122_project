"use client";

import type { Allocation, AllocationBucket } from "@/lib/types";
import { BUCKET_LABELS, EMPTY_ALLOCATION } from "@/lib/types";

interface Props {
  allocation: Allocation;
  onChange: (a: Allocation) => void;
  disabled?: boolean;
}

const BUCKETS: AllocationBucket[] = [
  "lend",
  "borrow",
  "land",
  "fictitious",
];

export function AllocationSliders({ allocation, onChange, disabled }: Props) {
  const total = BUCKETS.reduce((s, b) => s + allocation[b], 0);

  function setBucket(bucket: AllocationBucket, value: number) {
    const others = BUCKETS.filter((b) => b !== bucket);
    const otherSum = others.reduce((s, b) => s + allocation[b], 0);
    const maxForThis = 100 - otherSum;
    const clamped = Math.max(0, Math.min(maxForThis, value));
    onChange({ ...allocation, [bucket]: clamped });
  }

  return (
    <div className="space-y-5">
      {BUCKETS.map((bucket) => {
        const meta = BUCKET_LABELS[bucket];
        return (
          <div key={bucket} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium" style={{ color: meta.color }}>
                {meta.label}
              </span>
              <span className="font-mono text-lg">{allocation[bucket]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={allocation[bucket]}
              disabled={disabled}
              onChange={(e) => setBucket(bucket, parseInt(e.target.value, 10))}
              className="w-full disabled:opacity-50"
              style={{
                accentColor: meta.color,
              }}
            />
          </div>
        );
      })}

      <div
        className={`text-center py-2 rounded-lg font-mono ${
          total === 100
            ? "bg-arena-emerald/20 text-green-300"
            : "bg-arena-crimson/20 text-red-300"
        }`}
      >
        Tổng: {total}/100 {total !== 100 && "— cần đúng 100"}
      </div>
    </div>
  );
}

export function defaultAllocation(): Allocation {
  return { ...EMPTY_ALLOCATION };
}
