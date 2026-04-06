"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Gauge, Zap, Circle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { i } from 'framer-motion/client';
import { RaceData, ChartDataPoint  } from '@/lib/Types/TelemetryType';

export default function Telemetry() {
  const [raceData, setRaceData] = useState<RaceData | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch telemetry data
  const fetchTelemetry = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/telemetry/monza/2023');
      if (!response.ok) throw new Error('Failed to fetch data');
      const data: RaceData = await response.json();
      setRaceData(data);
      setCurrentIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Draw track on canvas with proper scaling and speed gradient
  useEffect(() => {
    if (!raceData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const telemetry = raceData.telemetry;

    // Find bounds for proper scaling
    const xCoords = telemetry.map(d => d.x);
    const yCoords = telemetry.map(d => d.y);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    // Calculate scale to fit canvas with padding
    const padding = 30;
    const scaleX = (canvas.width - 2 * padding) / (maxY - minY);
    const scaleY = (canvas.height - 2 * padding) / (maxX - minX);
    const scale = Math.min(scaleX, scaleY);

    // Convert track coordinates to canvas coordinates
    const toCanvasX = (x: number, y:number): number => canvas.width - padding - (y - minY) * scale;
    const toCanvasY = (y: number, x:number): number => canvas.height - padding - (x - minX) * scale;

    // Clear canvas with dark background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw track outline first (grey background)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    telemetry.forEach((point, i) => {
      const x = toCanvasX(point.x, point.y);
      const y = toCanvasY(point.y, point.x);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw track with speed gradient (segment by segment)
    const maxSpeed = raceData.stats.max_speed;
    const minSpeed = raceData.stats.min_speed;
    
    for (let i = 0; i < telemetry.length - 1; i++) {
      const point = telemetry[i];
      const nextPoint = telemetry[i + 1];
      
      // Normalize speed to 0-1 range
      const speedRatio = (point.speed - minSpeed) / (maxSpeed - minSpeed);

      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(toCanvasX(point.x, point.y), toCanvasY(point.y, point.x));
      ctx.lineTo(toCanvasX(nextPoint.x, nextPoint.y), toCanvasY(nextPoint.y, nextPoint.x));
      ctx.stroke();
    }

    // Draw start/finish line
    const startX = toCanvasX(telemetry[0].x, telemetry[0].y);
    const startY = toCanvasY(telemetry[0].y, telemetry[0].x);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(startX - 12, startY - 3, 24, 6);
    ctx.fillRect(startX - 3, startY - 12, 6, 24);
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX - 12, startY - 3, 24, 6);
    ctx.strokeRect(startX - 3, startY - 12, 6, 24);

    // Draw current position with glow effect
    const currentPoint = telemetry[currentIndex];
    const carX = toCanvasX(currentPoint.x, currentPoint.y);
    const carY = toCanvasY(currentPoint.y, currentPoint.x);

    // Outer glow
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#00D2BE';
    ctx.fillStyle = '#00D2BE';
    ctx.beginPath();
    ctx.arc(carX, carY, 14, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Inner white core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(carX, carY, 8, 0, 2 * Math.PI);
    ctx.fill();

    // Direction indicator (small line showing heading)
    if (currentIndex < telemetry.length - 1) {
      const nextPoint = telemetry[currentIndex + 1];
      const nextX = toCanvasX(nextPoint.x, nextPoint.y);
      const nextY = toCanvasY(nextPoint.y, nextPoint.x);
      const angle = Math.atan2(nextY - carY, nextX - carX);
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(carX, carY);
      ctx.lineTo(
        carX + Math.cos(angle) * 20,
        carY + Math.sin(angle) * 20
      );
      ctx.stroke();
    }

  }, [raceData, currentIndex]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !raceData) return;

    const interval = 16 / playbackSpeed; // Base 60fps, adjusted by speed

    const animate = (): void => {
      setCurrentIndex((prev) => {
        if (prev >= raceData.telemetry.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    };

    animationRef.current = setInterval(animate, interval);

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isPlaying, raceData, playbackSpeed]);

  const handlePlayPause = (): void => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = (): void => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setCurrentIndex(parseInt(e.target.value));
  };

  // Load data on mount
  useEffect(() => {
    fetchTelemetry();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-2xl mb-4">Loading Monza Circuit Data...</div>
          <div className="text-slate-400">This may take a minute on first load</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-2xl mb-4">Error: {error}</div>
          <button
            onClick={fetchTelemetry}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!raceData) return null;

  const currentData = raceData.telemetry[currentIndex];
  const progress = (currentIndex / (raceData.telemetry.length - 1)) * 100;

  // Prepare data for speed chart (last 100 points for performance)
  const chartStart = Math.max(0, currentIndex - 50);
  const chartEnd = Math.min(raceData.telemetry.length, currentIndex + 50);
  const speedChartData: ChartDataPoint[] = raceData.telemetry
    .slice(chartStart, chartEnd)
    .map((point, idx) => ({
      index: chartStart + idx,
      speed: point.speed,
      throttle: point.throttle,
      isCurrent: chartStart + idx === currentIndex
    }));

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        <div className="flex flex-col gap-6">
          {/* Track Visualization */}
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-slate-800 rounded-xl p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Circuit Map</h2>
                <div className="text-sm text-slate-400">
                  Lap {raceData.lap.lap_number} • {raceData.lap.lap_time}
                </div>
              </div>
              <div className="flex">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className="w-[60%] bg-slate-900"
                />
                <div className="bg-slate-900 w-full">
                  <div className="flex items-center justify-center mt-10">
                    <div className="relative" style={{ width: '240px', height: '240px' }}>
                      {/* Outer circle - Throttle */}
                      <svg className="absolute inset-0 transform rotate-90" viewBox="0 0 240 240">
                        {/* Background circle for throttle */}
                        <circle
                          cx="120"
                          cy="120"
                          r="110"
                          fill="none"
                          stroke="#334155"
                          strokeWidth="16"
                        />
                        {/* Throttle progress */}
                        <circle
                          cx="120"
                          cy="120"
                          r="110"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="16"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 110}`}
                          strokeDashoffset={`${2 * Math.PI * 110 * (1 - currentData.speed / 360)}`}
                          className="transition-all duration-200"
                        />
                        <defs>
                          {/* Circular path for curved text */}
                          <path
                            id="speedTextPath"
                            d="
                              M 120,120
                              m -90,0
                              a 90,90 0 1,1 180,0
                              a 90,90 0 1,1 -180,0
                            "
                            fill="none"
                            transform="rotate(-90 120 120)"
                          />
                        </defs>

                        <text
                          fill="#94a3b8"
                          fontSize="16"
                          fontWeight="600"
                          letterSpacing="6"
                          textAnchor="middle"
                        >
                          <textPath
                            href="#speedTextPath"
                            startOffset="30%"
                            
                          >
                          0 90 180
                          </textPath>
                        </text>
                      </svg>
                      
                      {/* Inner circle - Speed */}
                      <svg className="absolute inset-0 transform rotate-90" viewBox="0 0 240 240" style={{ padding: '30px' }}>
                        {/* Background circle for speed */}
                        <circle
                          cx="120"
                          cy="120"
                          r="80"
                          fill="none"
                          stroke="#1e4620"
                          strokeWidth="20"
                        />
                        {/* Speed progress */}
                        <circle
                          cx="120"
                          cy="120"
                          r="80"
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth="20"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 80}`}
                          strokeDashoffset={`${2 * Math.PI * 80 * (1 - currentData.throttle / 100)}`}
                          className="transition-all duration-200"
                        />
                      </svg>
                      
                      {/* Center content */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-4xl font-bold text-green-400">
                          {currentData.speed.toFixed(0)}
                        </div>
                        <div className="text-slate-400 text-sm">km/h</div>
                        <div className="mt-2 text-2xl font-bold text-blue-400">
                          {currentData.throttle.toFixed(0)}%
                        </div>
                        <div className="text-slate-500 text-xs">throttle</div>
                      </div>
                    </div>
              </div>
                </div>
              </div>
             
            </div>
{/* Speed */}
            <div className="bg-gradient-to-br from-green-900 to-green-950 rounded-xl p-6 shadow-2xl border border-green-700">
              <div className="flex items-center gap-3 mb-3">
                <Gauge className="text-green-400" size={28} />
                <h3 className="text-slate-300 text-lg font-semibold">Speed</h3>
              </div>
              <div className="text-5xl font-bold text-green-400">
                {currentData.speed.toFixed(0)}
              </div>
              <div className="text-slate-400 mt-1">km/h</div>
              <div className="mt-3 text-sm text-slate-400">
                Max: {raceData.stats.max_speed.toFixed(0)} km/h
              </div>
            </div>

            {/* Throttle */}
            <div className="bg-gradient-to-br from-blue-900 to-blue-950 rounded-xl p-6 shadow-2xl border border-blue-700">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="text-blue-400" size={28} />
                <h3 className="text-slate-300 text-lg font-semibold">Throttle</h3>
              </div>
              <div className="text-5xl font-bold text-blue-400">
                {currentData.throttle.toFixed(0)}%
              </div>
              <div className="mt-3 h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-100"
                  style={{ width: `${currentData.throttle}%` }}
                />
              </div>
            </div>

            {/* Brake */}
            <div className={`rounded-xl p-6 shadow-2xl border transition-all duration-200 ${
              currentData.brake
                ? 'bg-gradient-to-br from-red-900 to-red-950 border-red-700'
                : 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <Circle className={currentData.brake ? 'text-red-400' : 'text-slate-600'} size={28} fill="currentColor" />
                <h3 className="text-slate-300 text-lg font-semibold">Brake</h3>
              </div>
              <div className={`text-5xl font-bold ${currentData.brake ? 'text-red-400' : 'text-slate-600'}`}>
                {currentData.brake ? 'ON' : 'OFF'}
              </div>
            </div>

            {/* Gear & RPM */}
            <div className="bg-gradient-to-br from-purple-900 to-purple-950 rounded-xl p-6 shadow-2xl border border-purple-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-slate-300 text-sm font-semibold mb-1">Gear</h3>
                  <div className="text-4xl font-bold text-purple-400">
                    {currentData.gear}
                  </div>
                </div>
                <div className="text-right">
                  <h3 className="text-slate-300 text-sm font-semibold mb-1">RPM</h3>
                  <div className="text-2xl font-bold text-purple-400">
                    {(currentData.rpm / 1000).toFixed(1)}k
                  </div>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 shadow-2xl border border-slate-700">
              <h3 className="text-slate-300 text-lg font-semibold mb-3">Lap Progress</h3>
              <div className="text-4xl font-bold text-blue-400 mb-2">
                {progress.toFixed(1)}%
              </div>
              <div className="text-sm text-slate-400">
                {currentData.distance.toFixed(0)}m / {raceData.stats.total_distance.toFixed(0)}m
              </div>
            </div>

            {/* DRS Status */}
            <div className={`rounded-xl p-4 shadow-2xl border transition-all ${
              currentData.drs > 0
                ? 'bg-gradient-to-br from-amber-900 to-amber-950 border-amber-700'
                : 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold">DRS</span>
                <span className={`font-bold text-lg ${currentData.drs > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                  {currentData.drs > 0 ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>
            {/* Speed/Throttle Chart */}
            <div className="bg-slate-800 rounded-xl p-4 md:p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-4">Speed & Throttle (Recent)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={speedChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="index" stroke="#94a3b8" hide />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                    labelStyle={{ color: '#cbd5e1' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="speed"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    name="Speed (km/h)"
                  />
                  <Line
                    type="monotone"
                    dataKey="throttle"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Throttle (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Controls */}
            <div className="bg-slate-800 rounded-xl p-4 md:p-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={handlePlayPause}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-xl transition-all transform hover:scale-105 shadow-lg"
                >
                  {isPlaying ? <Pause size={28} /> : <Play size={28} />}
                </button>
                <button
                  onClick={handleReset}
                  className="bg-slate-700 hover:bg-slate-600 text-white p-4 rounded-xl transition-all transform hover:scale-105"
                >
                  <RotateCcw size={28} />
                </button>
                
                <div className="flex-1 w-full">
                  <input
                    type="range"
                    min="0"
                    max={raceData.telemetry.length - 1}
                    value={currentIndex}
                    onChange={handleSliderChange}
                    className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progress}%, #334155 ${progress}%, #334155 100%)`
                    }}
                  />
                  <div className="flex justify-between mt-2 text-sm text-slate-400">
                    <span>{currentData.time.toFixed(2)}s</span>
                    <span>{raceData.lap.lap_time_seconds.toFixed(2)}s</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-4 py-2">
                  <span className="text-slate-300 text-sm">Speed:</span>
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                    className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-600"
                  >
                    <option value="0.25">0.25x</option>
                    <option value="0.5">0.5x</option>
                    <option value="1">1x</option>
                    <option value="2">2x</option>
                    <option value="5">5x</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Telemetry Panel */}
          
        </div>
      </div>

      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          background: white;
          cursor: pointer;
          border-radius: 50%;
          border: 3px solid #3b82f6;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }
        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          background: white;
          cursor: pointer;
          border-radius: 50%;
          border: 3px solid #3b82f6;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </div>
  );
}