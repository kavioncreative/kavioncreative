
import React, { useState } from 'react';
import Button from '../components/Button';
import { Input } from '../components/Input';
import { Checkbox } from '../components/Selection';
import { supabase } from '../lib/supabase';
import { addToast } from '../components/Toast';

interface AuthProps {
  onToggle?: () => void;
  onSuccess: () => void;
  onNavigate?: (view: 'terms' | 'privacy') => void;
}

export const SignInScreen: React.FC<AuthProps> = ({ onSuccess, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        console.error('Sign In Error:', error);
        throw error;
      }

      addToast({
        type: 'success',
        title: 'Welcome Back',
        message: 'You have successfully signed in.',
      });
      onSuccess();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Sign In Failed',
        message: error.message || 'Check your credentials and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-xl bg-surface-card bg-surface-overlay/20 border border-surface-border p-10 rounded-3xl shadow-2xl mx-auto animate-in fade-in zoom-in-95 duration-500 overflow-hidden group">
      {/* Diagonal Metallic Shine Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] pointer-events-none z-10" />

      {/* Center-weighted Shadow Depth Falloff */}
      <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-4/5 h-12 [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] pointer-events-none z-0">
        <div className="w-full h-full shadow-[0_12px_32px_-8px_rgba(0,0,0,0.9)] opacity-80" />
      </div>

      <div className="relative z-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-gray-400">Enter your credentials to access your dashboard.</p>
        </div>

        <form className="space-y-6" onSubmit={handleSignIn}>
          <Input
            label="Email Address"
            variant="metallic"
            type="email"
            placeholder="name@company.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div>
            <div className="flex justify-between items-center mb-1 pr-1">
              <label className="text-sm font-medium text-gray-400 ml-1">Password</label>
            </div>
            <Input
              type="password"
              variant="metallic"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Checkbox
            label="Remember Me"
            variant="recessed"
            checked={keepSignedIn}
            onChange={setKeepSignedIn}
          />

          <Button
            variant="metallic"
            className="w-full py-4 text-base"
            type="submit"
            isLoading={loading}
          >
            Sign In
          </Button>

          <p className="text-[11px] text-gray-500 leading-relaxed text-center px-4 mt-6">
            By signing in, you agree to our <button type="button" onClick={() => onNavigate?.('terms')} className="text-white hover:underline bg-transparent border-none p-0">Terms of Service</button> and <button type="button" onClick={() => onNavigate?.('privacy')} className="text-white hover:underline bg-transparent border-none p-0">Privacy Policy</button>.
          </p>
        </form>


      </div>
    </div>
  );
};

