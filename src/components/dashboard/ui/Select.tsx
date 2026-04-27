import { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  id?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, id, className = '', children, ...props }, ref) => (
    <div>
      {label && id && (
        <label htmlFor={id} className="block text-[13px] font-semibold text-offwhite/60 font-body mb-2">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={`w-full px-4 py-3 rounded-field bg-white/[0.06] text-offwhite font-body text-[14px] shadow-ring-default focus:shadow-ring-strong focus:outline-none focus:ring-2 focus:ring-orange/40 transition-shadow duration-200 appearance-none cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  )
);

Select.displayName = 'Select';

export default Select;
