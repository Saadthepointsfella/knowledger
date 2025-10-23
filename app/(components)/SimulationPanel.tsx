"use client";

import { useEffect, useState } from "react";
import { useGraphStore } from "@/state/graphStore";

export default function SimulationPanel() {
  const {
    sim,
    startSim,
    stopSim,
    snapback,
    setSimParams,
  } = useGraphStore((s) => ({
    sim: s.sim,
    startSim: s.startSim,
    stopSim: s.stopSim,
    snapback: s.snapback,
    setSimParams: s.setSimParams,
  }));

  const [epsilon, setEpsilon] = useState(sim.params.epsilon);
  const [speedMs, setSpeedMs] = useState(sim.params.speedMs);
  const [maxTicks, setMaxTicks] = useState(sim.params.maxTicks);
  const [damping, setDamping] = useState(sim.params.damping);
  const [snap, setSnap] = useState(sim.params.snapback);
  const [oscOn, setOscOn] = useState(sim.oscillator.on);
  const [sensitivity, setSensitivity] = useState(sim.oscillator.sensitivity);

  useEffect(() => {
    setSimParams({
      epsilon,
      speedMs,
      maxTicks,
      damping,
      snapback: snap,
      oscillator: { on: oscOn, sensitivity },
    });
  }, [epsilon, speedMs, maxTicks, damping, snap, oscOn, sensitivity, setSimParams]);

  return (
    <div className="space-y-3 text-xs">
      {/* Status */}
      <div className="flex justify-between text-neutral-400">
        <span>Tick: {sim.tick}</span>
        <span>Tension: {sim.avgTension.toFixed(4)}</span>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {!sim.running ? (
          <button
            onClick={() => {
              console.log("event.sim.start", sim.params);
              startSim();
            }}
            className="flex-1 px-2 py-1.5 rounded bg-neutral-800 text-neutral-200 hover:bg-neutral-700 transition-colors"
          >
            Start
          </button>
        ) : (
          <button
            onClick={() => {
              console.log("event.sim.stop", { tick: sim.tick, avgTension: sim.avgTension });
              stopSim();
            }}
            className="flex-1 px-2 py-1.5 rounded bg-neutral-800 text-neutral-200 hover:bg-neutral-700 transition-colors"
          >
            Stop
          </button>
        )}
        {!sim.running && (
          <button
            onClick={snapback}
            className="px-2 py-1.5 rounded bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Parameters (collapsible) */}
      <details className="space-y-2">
        <summary className="cursor-pointer text-neutral-400 hover:text-neutral-300">
          Advanced
        </summary>
        <div className="pl-2 space-y-2 pt-2">
          <label className="flex items-center justify-between gap-2">
            <span className="text-neutral-400">Epsilon</span>
            <input
              type="number"
              step="0.001"
              value={epsilon}
              onChange={(e) => setEpsilon(parseFloat(e.target.value || "0"))}
              className="w-16 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5 text-neutral-200 text-xs"
            />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-neutral-400">Speed (ms)</span>
            <input
              type="number"
              step="1"
              value={speedMs}
              onChange={(e) => setSpeedMs(parseInt(e.target.value || "16", 10))}
              className="w-16 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5 text-neutral-200 text-xs"
            />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-neutral-400">Max ticks</span>
            <input
              type="number"
              step="1"
              value={maxTicks}
              onChange={(e) => setMaxTicks(parseInt(e.target.value || "200", 10))}
              className="w-16 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5 text-neutral-200 text-xs"
            />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-neutral-400">Damping</span>
            <input
              type="number"
              min={0.5}
              max={0.99}
              step="0.01"
              value={damping}
              onChange={(e) => setDamping(parseFloat(e.target.value || "0.9"))}
              className="w-16 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5 text-neutral-200 text-xs"
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={snap}
              onChange={(e) => setSnap(e.target.checked)}
              className="accent-neutral-600"
            />
            <span className="text-neutral-400">Snapback</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={oscOn}
              onChange={(e) => setOscOn(e.target.checked)}
              className="accent-neutral-600"
            />
            <span className="text-neutral-400">Oscillator</span>
          </label>
          {oscOn && (
            <label className="flex items-center justify-between gap-2 pl-5">
              <span className="text-neutral-500">Sensitivity</span>
              <input
                type="number"
                step="0.1"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value || "1.0"))}
                className="w-16 bg-neutral-900 border border-neutral-800 rounded px-1.5 py-0.5 text-neutral-200 text-xs"
              />
            </label>
          )}
        </div>
      </details>
    </div>
  );
}
