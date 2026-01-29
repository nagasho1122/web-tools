import { useState, useRef, useCallback, useEffect } from "react";

const DEFAULT_ITEMS = ["項目1", "項目2", "項目3", "項目4"];

const COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f97316", // orange
  "#8b5cf6", // violet
  "#14b8a6", // teal
];

interface RouletteItem {
  label: string;
  color: string;
}

export default function Roulette() {
  const [items, setItems] = useState<RouletteItem[]>(
    DEFAULT_ITEMS.map((label, i) => ({
      label,
      color: COLORS[i % COLORS.length],
    }))
  );
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [newItemText, setNewItemText] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const spinStateRef = useRef({
    currentRotation: 0,
    velocity: 0,
    deceleration: 0,
  });

  const drawWheel = useCallback(
    (currentRotation: number) => {
      const canvas = canvasRef.current;
      if (!canvas || items.length === 0) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const size = canvas.width;
      const center = size / 2;
      const radius = center - 10;
      const sliceAngle = (2 * Math.PI) / items.length;

      ctx.clearRect(0, 0, size, size);

      // Draw slices
      items.forEach((item, i) => {
        const startAngle = currentRotation + i * sliceAngle;
        const endAngle = startAngle + sliceAngle;

        // Slice
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Text
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.min(16, 120 / items.length + 8)}px sans-serif`;
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 2;
        const maxTextWidth = radius - 30;
        let displayText = item.label;
        if (ctx.measureText(displayText).width > maxTextWidth) {
          while (
            ctx.measureText(displayText + "…").width > maxTextWidth &&
            displayText.length > 1
          ) {
            displayText = displayText.slice(0, -1);
          }
          displayText += "…";
        }
        ctx.fillText(displayText, radius - 20, 5);
        ctx.restore();
      });

      // Center circle
      ctx.beginPath();
      ctx.arc(center, center, 20, 0, 2 * Math.PI);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pointer (top)
      ctx.beginPath();
      ctx.moveTo(center - 12, 5);
      ctx.lineTo(center + 12, 5);
      ctx.lineTo(center, 30);
      ctx.closePath();
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    },
    [items]
  );

  useEffect(() => {
    drawWheel(rotation);
  }, [drawWheel, rotation]);

  const spin = useCallback(() => {
    if (items.length === 0) return;

    if (isSpinning) {
      // Stop: begin deceleration
      spinStateRef.current.deceleration = 0.98;
      return;
    }

    setIsSpinning(true);
    setResult(null);

    const initialVelocity = 0.3 + Math.random() * 0.2;
    spinStateRef.current = {
      currentRotation: rotation,
      velocity: initialVelocity,
      deceleration: 1, // no deceleration until stop is pressed
    };

    const animate = () => {
      const state = spinStateRef.current;
      state.velocity *= state.deceleration;
      state.currentRotation += state.velocity;

      drawWheel(state.currentRotation);

      if (state.velocity < 0.001 && state.deceleration < 1) {
        // Stopped
        setRotation(state.currentRotation);
        setIsSpinning(false);

        // Calculate result
        const sliceAngle = (2 * Math.PI) / items.length;
        // Pointer is at the top (3π/2 from right-pointing 0)
        const pointerAngle = (3 * Math.PI) / 2;
        const normalizedRotation =
          ((pointerAngle - state.currentRotation) % (2 * Math.PI) +
            2 * Math.PI) %
          (2 * Math.PI);
        const selectedIndex = Math.floor(normalizedRotation / sliceAngle);
        setResult(items[selectedIndex % items.length].label);
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isSpinning, items, rotation, drawWheel]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const addItem = useCallback(() => {
    const text = newItemText.trim();
    if (!text) return;
    setItems((prev) => [
      ...prev,
      { label: text, color: COLORS[prev.length % COLORS.length] },
    ]);
    setNewItemText("");
  }, [newItemText]);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateItem = useCallback((index: number, label: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, label } : item))
    );
  }, []);

  return (
    <div className="flex flex-col items-center gap-8">
      <h1 className="text-3xl font-bold">🎰 ルーレット</h1>

      {/* Result */}
      {result && (
        <div className="rounded-xl bg-indigo-50 border-2 border-indigo-200 px-8 py-4 text-center">
          <p className="text-sm text-indigo-600 mb-1">結果は...</p>
          <p className="text-2xl font-bold text-indigo-700">{result}</p>
        </div>
      )}

      {/* Wheel */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={360}
          height={360}
          className="rounded-full shadow-lg"
        />
      </div>

      {/* Spin Button */}
      <button
        onClick={spin}
        disabled={items.length === 0}
        className="rounded-full bg-indigo-600 px-10 py-3 text-lg font-bold text-white shadow-md transition-all hover:bg-indigo-500 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSpinning ? "ストップ" : "スタート"}
      </button>

      {/* Items Editor */}
      <div className="w-full max-w-md">
        <h2 className="text-lg font-semibold mb-3">ルーレットの項目</h2>
        <div className="space-y-2 mb-4">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateItem(i, e.target.value)}
                maxLength={20}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <button
                onClick={() => removeItem(i)}
                className="text-gray-400 hover:text-red-500 transition-colors text-lg"
                title="削除"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Add Item */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="新しい項目を追加"
            maxLength={20}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <button
            onClick={addItem}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}
