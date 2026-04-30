import { useCallback, useState } from 'react'
import { Upload, X, File } from 'lucide-react'
import { formatFileSize } from '@/utils/fileUtils'

export default function FileUploader({ accept, multiple = false, onFilesSelected, files = [], onRemoveFile }) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      onFilesSelected(multiple ? droppedFiles : [droppedFiles[0]])
    }
  }, [multiple, onFilesSelected])

  const handleInputChange = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files)
    if (selectedFiles.length > 0) {
      onFilesSelected(multiple ? selectedFiles : [selectedFiles[0]])
    }
    e.target.value = ''
  }, [multiple, onFilesSelected])

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
          ${isDragging 
            ? 'border-primary-500 bg-primary-50 scale-[1.02]' 
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }`}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-primary-500' : 'text-gray-400'}`} />
        <p className="text-lg font-medium text-gray-700">
          {isDragging ? 'Lepaskan file di sini' : 'Seret & lepas file di sini'}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          atau <span className="text-primary-600 font-medium">klik untuk memilih file</span>
        </p>
        {accept && (
          <p className="text-xs text-gray-400 mt-2">Format: {accept}</p>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm border">
              <File className="w-5 h-5 text-primary-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
              </div>
              {onRemoveFile && (
                <button
                  onClick={() => onRemoveFile(index)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
