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
    <div className="rounded border border-neutral-800 p-3 text-sm text-neutral-200 space-y-2">
      <div className="font-semibold">Semantic Equilibrium</div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center justify-between gap-2">
          <span>ε (stop)</span>
          <input
            type="number"
            step="0.001"
            value={epsilon}
            onChange={(e) => setEpsilon(parseFloat(e.target.value || "0"))}
            className="w-24 bg-neutral-900 border border-neutral-700 rounded px-2 py-1"
          />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span>Speed (ms/tick)</span>
          <input
            type="number"
            step="1"
            value={speedMs}
            onChange={(e) => setSpeedMs(parseInt(e.target.value || "16", 10))}
            className="w-24 bg-neutral-900 border border-neutral-700 rounded px-2 py-1"
          />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span>Max ticks</span>
          <input
            type="number"
            step="1"
            value={maxTicks}
            onChange={(e) => setMaxTicks(parseInt(e.target.value || "200", 10))}
            className="w-24 bg-neutral-900 border border-neutral-700 rounded px-2 py-1"
          />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span>Damping</span>
          <input
            type="number"
            min={0.5}
            max={0.99}
            step="0.01"
            value={damping}
            onChange={(e) => setDamping(parseFloat(e.target.value || "0.9"))}
            className="w-24 bg-neutral-900 border border-neutral-700 rounded px-2 py-1"
          />
        </label>

        <label className="flex items-center gap-2 col-span-2">
          <input
            type="checkbox"
            checked={snap}
            onChange={(e) => setSnap(e.target.checked)}
          />
          <span>Enable Snapback</span>
        </label>
      </div>

      <div className="flex gap-2">
        {!sim.running ? (
          <button
            onClick={() => {
              console.log("event.sim.start", sim.params);
              startSim();
            }}
            className="px-3 py-1 rounded bg-neutral-100 text-neutral-900"
          >
            Start
          </button>
        ) : (
          <button
            onClick={() => {
              console.log("event.sim.stop", { tick: sim.tick, avgTension: sim.avgTension });
              stopSim();
            }}
            className="px-3 py-1 rounded bg-neutral-700"
          >
            Stop
          </button>
        )}
        {!sim.running && (
          <button onClick={snapback} className="px-3 py-1 rounded border border-neutral-700">
            Snapback
          </button>
        )}
      </div>

      <div className="pt-2 border-t border-neutral-800">
        <div className="font-semibold mb-1">Oscillator Mode</div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={oscOn}
            onChange={(e) => setOscOn(e.target.checked)}
          />
          <span>Enable</span>
        </label>
        <label className="flex items-center justify-between gap-2 mt-1">
          <span>Sensitivity</span>
          <input
            type="number"
            step="0.1"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value || "1.0"))}
            className="w-24 bg-neutral-900 border border-neutral-700 rounded px-2 py-1"
          />
        </label>
      </div>

      <div className="text-xs text-neutral-400 mt-2">
        Tick: {sim.tick} · Avg tension: {sim.avgTension.toFixed(4)}
      </div>
    </div>
  );
}
