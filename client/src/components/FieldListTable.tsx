import type { Field } from '../../../shared/types';

export default function FieldListTable({ fields }: { fields: Field[] }) {
  const hasMeta = fields.some((f) => f.dataType || f.fieldType || f.description);

  return (
    <div className="field-table">
      <table>
        <thead>
          <tr>
            <th style={{ width: 64 }}>#</th>
            <th>Field Name</th>
            {hasMeta && (
              <>
                <th style={{ width: 100 }}>Data Type</th>
                <th style={{ width: 90 }}>Field Type</th>
                <th>Description</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {fields.map((f, i) => (
            <tr key={`${f.name}-${i}`}>
              <td className="fdim" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                {String(i + 1).padStart(2, '0')}
              </td>
              <td className="fname">{f.name.toUpperCase()}</td>
              {hasMeta && (
                <>
                  <td className="fdim">{f.dataType || '\u2014'}</td>
                  <td className="fdim">{f.fieldType || '\u2014'}</td>
                  <td className="fdim">{f.description || '\u2014'}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
