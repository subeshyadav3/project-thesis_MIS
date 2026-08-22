import { fmtBs } from '../utils/nepaliDate';

/** Native date input with its Bikram Sambat equivalent shown beneath the field. */
export default function BsDateInput({ value, onChange, className, style, title }) {
  const bs = fmtBs(value);
  return (
    <div>
      <input type="date" className={className} value={value} onChange={onChange} style={style} title={title} />
      {bs && <div className="bs-date-hint">{bs}</div>}
    </div>
  );
}
