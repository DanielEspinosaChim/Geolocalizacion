import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { Alert, Button, PasswordField, TextField } from '@shared/ui';
import { signInWithEmail, signInWithGoogle } from '../api/sign-in';
import { loginSchema, type LoginInput } from '../model/login';
import { GoogleIcon } from './GoogleIcon';

function Divider() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-semibold text-fg-subtle">o</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function LoginForm() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function run(action: () => Promise<void>) {
    setServerError(null);
    try {
      await action();
      await navigate('/');
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Error al iniciar sesión');
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit((data) => run(() => signInWithEmail(data)))(event)}
      className="grid gap-4"
    >
      {serverError ? <Alert>{serverError}</Alert> : null}
      <TextField
        label="Correo"
        type="email"
        placeholder="usuario@canaco.mx"
        autoComplete="username"
        error={errors.email?.message}
        {...register('email')}
      />
      <PasswordField
        label="Contraseña"
        placeholder="••••••••"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" full disabled={isSubmitting}>
        {isSubmitting ? 'Entrando…' : 'Iniciar sesión'}
      </Button>
      <Divider />
      <Button
        type="button"
        variant="secondary"
        full
        disabled={isSubmitting}
        onClick={() => void run(signInWithGoogle)}
      >
        <GoogleIcon />
        Continuar con Google
      </Button>
    </form>
  );
}
