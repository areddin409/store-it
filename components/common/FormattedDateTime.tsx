import { cn, formatDateTime } from '@/lib/utils';
import React from 'react';

/**
 * A reusable component for displaying formatted dates and times
 *
 * This component uses the formatDateTime utility to render dates in a
 * consistent format throughout the application.
 *
 * @param date - The ISO date string to format
 * @param format - The format to display ('short', 'medium', or 'long')
 * @param className - Additional CSS classes to apply
 * @param showTooltip - Whether to show a tooltip with the full date/time on hover
 */
const FormattedDateTime = ({
  date,
  format = 'medium',
  className,
  showTooltip = false,
}: FormattedDateTimeProps) => {
  const formattedDate = formatDateTime(date, format);
  const fullDate = showTooltip ? new Date(date).toLocaleString() : undefined;

  return (
    <p className={cn('body-2 text-light-200', className)} title={fullDate}>
      {formattedDate}
    </p>
  );
};

export default FormattedDateTime;
