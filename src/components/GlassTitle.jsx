export default function GlassTitle({ text, small = false }) {
  return (
    <div className={`glass-title-wrap${small ? ' glass-title-sm' : ''}`}>
      <span className="glass-title-base">{text}</span>
    </div>
  );
}
