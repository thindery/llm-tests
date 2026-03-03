import { SignUp } from '@clerk/clerk-react';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Sign up to start building with Agent Paige</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
        </div>
        <p className="text-center mt-6 text-sm text-gray-500">
          Already have an account?{' '}
          <a href="/sign-in" className="text-blue-600 hover:underline font-medium">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
