export default function Crown({ size = 28, color = "gold", className = "" }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={color}
        className={className}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M5 20h14l1-9-4 3-4-7-4 7-4-3 1 9z" />
      </svg>
    );
  }