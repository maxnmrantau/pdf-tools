export default function ProcessingStatus({ status, error }) {
  if (status === 'idle') return null

  return (
    <div className={`rounded-lg p-4 ${
      status === 'processing' ? 'bg-blue-50 text-blue-700' :
      status === 'done' ? 'bg-green-50 text-green-700' :
      status === 'error' ? 'bg-red-50 text-red-700' :
      'bg-gray-50 text-gray-700'
    }`}>
      {status === 'processing' && '⏳ Memproses...'}
      {status === 'done' && '✅ Berhasil! File siap diunduh.'}
      {status === 'error' && `❌ Error: ${error || 'Terjadi kesalahan saat memproses'}`}
    </div>
  )
}
