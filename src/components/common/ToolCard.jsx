import { Link } from 'react-router-dom'

export default function ToolCard({ tool }) {
  const Icon = tool.icon
  return (
    <Link
      to={`/tool/${tool.id}`}
      className="group block bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-transparent hover:-translate-y-1 transition-all duration-200 no-underline"
    >
      <div className={`${tool.color} w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{tool.name}</h3>
      <p className="text-sm text-gray-500">{tool.description}</p>
    </Link>
  )
}
