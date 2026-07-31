import type { Field } from '../../../shared/types';

export default function FieldListTable({ fields }: { fields: Field[] }) {
  return (
    <div className="field-table">
      <table>
        <thead>
          <tr>
            <th style={{ width: 64 }}>#</th>
            <th>Field Name</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f, i) => (
            <tr key={`${f.name}-${i}`}>
              <td className="fdim" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                {String(i + 1).padStart(2, '0')}
              </td>
              <td className="fname">{f.name.toUpperCase()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
