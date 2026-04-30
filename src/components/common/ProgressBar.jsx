export default function ProgressBar({ progress = 0, label }) {
  return (
    <div className="w-full">
      {label && <p className="text-sm text-gray-600 mb-1">{label}</p>}
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out tool-gradient"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1 text-right">{Math.round(progress)}%</p>
    </div>
  )
}
