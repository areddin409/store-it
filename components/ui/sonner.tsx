'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: props.richColors
            ? // Removed everything where shadcn+tailwind affected the colors
              'group-[.toaster]:border group-[.toaster]:shadow-lg'
            : 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          // Gives the closeButton a background color, because default unstyled button is transparent
          closeButton: 'group-[.toaster]:bg-muted group-[.toaster]:border',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
