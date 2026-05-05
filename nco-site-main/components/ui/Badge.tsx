export default function Badge({ children, color='gray' }:{children:React.ReactNode; color?: 'gray'|'blue'|'green'|'red' }) {
  const map = {
    gray: 'bg-gray-100 text-gray-700 ring-gray-200',
    blue: 'bg-blue-100 text-blue-700 ring-blue-200',
    green:'bg-green-100 text-green-700 ring-green-200',
    red:  'bg-red-100 text-red-700 ring-red-200',
  } as const
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ${map[color]}`}>
      {children}
    </span>
  )
}