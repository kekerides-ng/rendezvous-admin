'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

import { Brand } from '@/components/ui/brand';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { useLogin, useVerifyTotp } from './use-admin-auth';

/**
 * The admin sign-in, both steps, in one screen.
 *
 * Two steps and one screen because they are one task: the password step hands
 * back a challenge that is worthless on its own, and routing between them
 * would put a URL on a state that cannot be returned to.
 *
 * On a first sign-in the backend returns an `otpauth://` URI instead of
 * expecting a code — the secret is shown once, here, and confirmed by using it.
 */
export function LoginScreen() {
  const router = useRouter();
  const login = useLogin();
  const verify = useVerifyTotp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const challenge = login.data?.challenge;
  const enrolmentUri = login.data?.kind === 'totp_enrolment' ? login.data.uri : undefined;
  const secret = enrolmentUri
    ? new URL(enrolmentUri.replace('otpauth://', 'https://')).searchParams.get('secret')
    : null;

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-10 flex justify-center">
          <Brand />
        </div>
        <div className="flex flex-col gap-6 rounded-card border border-border bg-surface p-8 shadow-card">
          <div className="flex flex-col gap-3">
            <span className="self-start rounded-pill bg-primary-faint px-3 py-1 text-caption text-primary">
              Team access
            </span>
            <h1 className="text-display text-ink">
              {challenge ? 'One more step.' : 'Welcome back.'}
            </h1>
            <p className="text-body text-muted">
              {challenge
                ? 'Confirm it’s you with your authenticator code.'
                : 'Sign in to look after the Rendezvous community.'}
            </p>
          </div>
          {!challenge ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                login.mutate({ email, password });
              }}
            >
              <Field
                label="Email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
              />
              <Field
                label="Password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
                error={login.error?.message ?? null}
              />
              <Button type="submit" disabled={login.isPending}>
                {login.isPending ? 'Checking…' : 'Continue'}
              </Button>
            </form>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                verify.mutate(
                  { challenge, code },
                  {
                    onSuccess: () => {
                      router.replace('/');
                    },
                  },
                );
              }}
            >
              {secret ? (
                <div className="flex flex-col gap-2 rounded-field bg-primary-faint p-4">
                  <p className="text-label text-ink">Set up two-factor authentication</p>
                  <p className="text-caption text-muted">
                    Add this key to an authenticator app, then enter the code it shows. You will
                    need it every time you sign in.
                  </p>
                  <code className="text-caption text-ink break-all select-all">{secret}</code>
                </div>
              ) : null}

              <Field
                label="Authenticator code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, ''));
                }}
                error={verify.error?.message ?? null}
              />

              <Button type="submit" disabled={verify.isPending || code.length !== 6}>
                {verify.isPending ? 'Signing in…' : 'Sign in'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  login.reset();
                  setCode('');
                }}
              >
                Start again
              </Button>
            </form>
          )}
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-caption text-muted">
          <ShieldCheck className="size-4" aria-hidden="true" /> Restricted to authorised team
          members.
        </p>
      </div>
    </main>
  );
}
