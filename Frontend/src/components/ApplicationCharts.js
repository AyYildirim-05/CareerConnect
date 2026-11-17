import React, { useState } from 'react';

const STATUS_COLORS = {
  Applied: '#3b82f6',    // Blue
  Interview: '#f59e0b',  // Amber
  Offered: '#10b981',    // Emerald
  Rejected: '#ef4444'    // Red
};

export default function ApplicationCharts({ statusCounts, monthlyActivity }) {
  const [hoveredMonth, setHoveredMonth] = useState(null);

  const total =
    (statusCounts.Applied || 0) +
    (statusCounts.Interview || 0) +
    (statusCounts.Offered || 0) +
    (statusCounts.Rejected || 0);

  const maxMonthlyTotal = Math.max(
    1,
    ...monthlyActivity.map((m) => m.total)
  );

  const formatMonthLabel = (ym) => {
    const [year, month] = ym.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginTop: '20px' }}>
      {/* Chart 1: Application Status Distribution */}
      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', background: '#fff' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Status Distribution</h3>

        {total === 0 ? (
          <p style={{ color: '#666', fontSize: '14px' }}>No applications in selected date range.</p>
        ) : (
          <>
            {/* Segmented Distribution Bar */}
            <div style={{ display: 'flex', height: '24px', borderRadius: '6px', overflow: 'hidden', background: '#f1f5f9', marginBottom: '16px' }}>
              {Object.entries(STATUS_COLORS).map(([status, color]) => {
                const count = statusCounts[status] || 0;
                const pct = (count / total) * 100;
                if (pct === 0) return null;
                return (
                  <div
                    key={status}
                    title={`${status}: ${count} (${pct.toFixed(1)}%)`}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: color,
                      transition: 'width 0.3s ease'
                    }}
                  />
                );
              })}
            </div>

            {/* Breakdown Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(STATUS_COLORS).map(([status, color]) => {
                const count = statusCounts[status] || 0;
                const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
                return (
                  <div key={status} style={{ fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block' }} />
                        {status}
                      </span>
                      <span>
                        <strong>{count}</strong> ({pct}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '4px' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Chart 2: Interactive Monthly Application Timeline */}
      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Monthly Application Timeline</h3>
          {hoveredMonth && (
            <span style={{ fontSize: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>
              <strong>{formatMonthLabel(hoveredMonth.month)}:</strong> {hoveredMonth.total} total ({hoveredMonth.Interview} interview, {hoveredMonth.Offered} offer)
            </span>
          )}
        </div>

        {monthlyActivity.length === 0 ? (
          <p style={{ color: '#666', fontSize: '14px' }}>No timeline activity for this period.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '180px', paddingTop: '20px', borderBottom: '1px solid #ccc', overflowX: 'auto' }}>
            {monthlyActivity.map((item) => {
              const barHeightPct = (item.total / maxMonthlyTotal) * 100;
              return (
                <div
                  key={item.month}
                  onMouseEnter={() => setHoveredMonth(item)}
                  onMouseLeave={() => setHoveredMonth(null)}
                  style={{
                    flex: '1 0 42px',
                    maxWidth: '64px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                    {item.total}
                  </span>
                  {/* Stacked Column */}
                  <div
                    style={{
                      width: '28px',
                      height: `${Math.max(barHeightPct, 6)}%`,
                      display: 'flex',
                      flexDirection: 'column-reverse',
                      borderRadius: '4px 4px 0 0',
                      overflow: 'hidden',
                      boxShadow: hoveredMonth?.month === item.month ? '0 0 0 2px #1e293b' : 'none'
                    }}
                  >
                    {['Applied', 'Interview', 'Offered', 'Rejected'].map((st) => {
                      const val = item[st] || 0;
                      if (val === 0) return null;
                      return (
                        <div
                          key={st}
                          style={{
                            height: `${(val / item.total) * 100}%`,
                            backgroundColor: STATUS_COLORS[st]
                          }}
                        />
                      );
                    })}
                  </div>
                  <span style={{ fontSize: '11px', color: '#555', marginTop: '6px' }}>
                    {formatMonthLabel(item.month)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}