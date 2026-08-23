import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const TOOLTIP_STYLE = {
  background: 'var(--color-surface-container-lowest)',
  border: '1px solid var(--color-outline-variant)',
  borderRadius: 8,
  color: 'var(--color-on-surface)',
  fontSize: 12,
};

export default function PieChartCard({ title, data, minHeight = 220, innerRadius = 52, outerRadius = 82 }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-header"><h3>{title}</h3></div>
      <div style={{ flex: 1, minHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={innerRadius} outerRadius={outerRadius} paddingAngle={2} strokeWidth={0}>
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap', padding: '10px 0 4px' }}>
        {data.map((d) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-on-surface)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }} />
            {d.name} <b>{d.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
