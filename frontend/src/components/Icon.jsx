export default function Icon({ name, className = "" }) {
  return <i className={`fa-solid ${name}${className ? ` ${className}` : ""}`} aria-hidden="true" />;
}
