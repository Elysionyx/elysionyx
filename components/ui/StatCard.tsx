interface StatCardProps {
  label: string
  value: string | number
  sub?: string
}

export default function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="border border-[#D6E4FF] rounded-lg p-5 bg-[#F5F8FF]">
      <p className="text-xs font-medium text-[#4A5568] uppercase tracking-wider mb-2">{label}</p>
      <p className="font-heading text-3xl font-semibold text-[#0A0A0A]">{value}</p>
      {sub && <p className="text-xs text-[#4A5568] mt-1">{sub}</p>}
    </div>
  )
}
