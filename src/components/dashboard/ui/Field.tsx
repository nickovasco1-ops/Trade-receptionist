import { forwardRef } from 'react';

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, id, className = '', ...props }, ref) => (
    <div>
      <label htmlFor={id} className="block text-[13px] font-semibold text-offwhite/60 font-body mb-2">
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        className={`w-full px-4 py-3 rounded-field bg-white/[0.06] text-offwhite font-body text-[14px] placeholder:text-offwhite/25 shadow-ring-default focus:shadow-ring-strong focus:outline-none focus:ring-2 focus:ring-orange/40 transition-shadow duration-200 ${className}`}
        {...props}
      />
    </div>
  )
);

Field.displayName = 'Field';

export default Field;
