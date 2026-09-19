import { useState } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';
import { Input, type InputProps } from '@atoms-form/Input.js';

export type PasswordInputProps = Omit<InputProps, 'type' | 'trailing'>;

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeSlash : Eye;

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          aria-pressed={visible}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          onClick={() => setVisible((current) => !current)}
          className="flex size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Icon size={20} aria-hidden="true" />
        </button>
      }
    />
  );
}
