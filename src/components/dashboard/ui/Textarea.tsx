import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  id: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, id, className = '', rows = 4, ...props }, ref) => (
    <div>
      <label htmlFor={id} className="block text-[13px] font-semibold text-offwhite/60 font-body mb-2">
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={`w-full px-4 py-3 rounded-field bg-white/[0.06] text-offwhite font-body text-[14px] leading-[1.6] placeholder:text-offwhite/25 shadow-ring-default focus:shadow-ring-strong focus:outline-none focus:ring-2 focus:ring-orange/40 transition-shadow duration-200 resize-y ${className}`}
        {...props}
      />
    </div>
  )
);

Textarea.displayName = 'Textarea';

export default Textarea;
