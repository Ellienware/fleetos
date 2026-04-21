import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = {
  title: 'Register',
  description: 'Register your taxi association on TaxiSaaS',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
