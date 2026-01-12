const SuccessCheckmark = () => {
  return (
    <div className="relative w-24 h-24 animate-scale-in">
      {/* Background circle */}
      <div className="absolute inset-0 rounded-full bg-primary/10" />
      
      {/* Animated ring */}
      <svg
        className="absolute inset-0 w-full h-full -rotate-90"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="4"
          strokeDasharray="283"
          strokeDashoffset="0"
          className="animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        />
      </svg>
      
      {/* Checkmark */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
      >
        <path
          d="M30 50 L45 65 L70 35"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="100"
          className="animate-check"
          style={{ strokeDashoffset: 100 }}
        />
      </svg>
    </div>
  );
};

export default SuccessCheckmark;
